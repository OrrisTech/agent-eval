/**
 * Task evaluation engine — evaluates an agent's ability to complete
 * end-to-end tasks, not individual tool quality.
 *
 * Pipeline:
 *   1. Set up isolated workspace
 *   2. Execute agent command with task description
 *   3. Capture output, duration, exit code
 *   4. Use LLM-as-judge to evaluate success criteria
 *   5. Report: pass/fail, duration, token estimate, criteria results
 */

import { type ExecFileSyncOptions, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import type { TaskEvalConfig } from "../config/task-schema.js";
import { callWithRetry } from "./llm-client.js";

/** Result of evaluating a single success criterion */
export interface CriterionResult {
  criterion: string;
  passed: boolean;
  reasoning: string;
}

/** Result of a single task run */
export interface TaskRunResult {
  runIndex: number;
  success: boolean;
  criteriaResults: CriterionResult[];
  durationMs: number;
  exitCode: number | null;
  output: string;
  /** Estimated token count from agent output length (rough proxy) */
  estimatedTokens: number;
}

/** Aggregated result across all runs */
export interface TaskEvalResult {
  taskName: string;
  agentCommand: string;
  runs: TaskRunResult[];
  successRate: number;
  avgDurationMs: number;
  avgTokens: number;
  totalRuns: number;
  totalPassed: number;
}

export type TaskProgressCallback = (step: string, detail: string) => void;

/**
 * Run a full task evaluation — execute agent N times, judge each run.
 */
export async function runTaskEvaluation(options: {
  config: TaskEvalConfig;
  apiKey: string;
  judgeModel?: string;
  onProgress?: TaskProgressCallback;
}): Promise<TaskEvalResult> {
  const { config, apiKey, judgeModel, onProgress } = options;
  const progress = onProgress ?? (() => {});

  const runs: TaskRunResult[] = [];

  for (let i = 0; i < config.eval.runs; i++) {
    progress("execute", `Running task (${i + 1}/${config.eval.runs})...`);

    // Step 1: Prepare workspace
    const workdir =
      config.agent.workdir ?? `/tmp/agent-eval-task-${Date.now()}`;
    if (!existsSync(workdir)) {
      mkdirSync(workdir, { recursive: true });
    }

    // Step 2: Build the agent command
    const agentArgs = config.agent.args.map((arg) =>
      arg.replace("{{description}}", config.task.description),
    );

    // Step 3: Execute the agent
    const start = performance.now();
    let output = "";
    let exitCode: number | null = null;

    try {
      const execOptions: ExecFileSyncOptions = {
        cwd: workdir,
        timeout: config.eval.timeout * 1000,
        encoding: "utf-8" as const,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env },
      };

      output = execFileSync(
        config.agent.command,
        agentArgs,
        execOptions,
      ) as string;
      exitCode = 0;
    } catch (err) {
      // Agent may exit non-zero but still produce useful output
      if (err && typeof err === "object") {
        const execErr = err as {
          stdout?: string;
          stderr?: string;
          status?: number;
        };
        output = `${execErr.stdout ?? ""}\n${execErr.stderr ?? ""}`;
        exitCode = execErr.status ?? 1;
      }
    }

    const durationMs = Math.round(performance.now() - start);

    // Step 4: List workspace files for context
    let workspaceFiles = "";
    try {
      const files = listFilesRecursive(workdir);
      if (files.length > 0) {
        workspaceFiles = `\nFiles created in workspace:\n${files.join("\n")}`;
      }
    } catch {
      // Workspace may not exist
    }

    // Step 5: Judge each success criterion
    progress("judge", `Judging criteria (${i + 1}/${config.eval.runs})...`);

    const criteriaResults = await judgeCriteria(
      config.task,
      output + workspaceFiles,
      exitCode,
      apiKey,
      judgeModel,
    );

    const allPassed = criteriaResults.every((c) => c.passed);

    // Rough token estimate: ~4 chars per token
    const estimatedTokens = Math.round(output.length / 4);

    runs.push({
      runIndex: i + 1,
      success: allPassed,
      criteriaResults,
      durationMs,
      exitCode,
      output: output.slice(0, 5000), // Truncate for storage
      estimatedTokens,
    });
  }

  // Aggregate
  const totalPassed = runs.filter((r) => r.success).length;
  const avgDurationMs =
    runs.length > 0
      ? Math.round(runs.reduce((s, r) => s + r.durationMs, 0) / runs.length)
      : 0;
  const avgTokens =
    runs.length > 0
      ? Math.round(
          runs.reduce((s, r) => s + r.estimatedTokens, 0) / runs.length,
        )
      : 0;

  return {
    taskName: config.task.name,
    agentCommand: `${config.agent.command} ${config.agent.args.join(" ")}`,
    runs,
    successRate: runs.length > 0 ? totalPassed / runs.length : 0,
    avgDurationMs,
    avgTokens,
    totalRuns: runs.length,
    totalPassed,
  };
}

/**
 * Use LLM-as-judge to evaluate each success criterion against the agent output.
 */
async function judgeCriteria(
  task: TaskEvalConfig["task"],
  output: string,
  exitCode: number | null,
  apiKey: string,
  judgeModel?: string,
): Promise<CriterionResult[]> {
  const client = new Anthropic({ apiKey });

  const prompt = `You are evaluating whether an AI agent successfully completed a task.

Task: ${task.name}
Description: ${task.description}

Agent exit code: ${exitCode}
Agent output (truncated):
${output.slice(0, 4000)}

Evaluate each success criterion below. For each, determine if it was met based on the output and any files created.

Criteria:
${task.success_criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Output ONLY a JSON array. Each element must have:
- "criterion": the criterion text
- "passed": true or false
- "reasoning": one sentence explaining why

Output the JSON array only, no markdown fences.`;

  const text = await callWithRetry(client, prompt, {
    model: judgeModel,
    maxTokens: 1024,
  });

  try {
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    return parsed.map(
      (item: { criterion?: string; passed?: boolean; reasoning?: string }) => ({
        criterion: String(item.criterion ?? ""),
        passed: Boolean(item.passed),
        reasoning: String(item.reasoning ?? ""),
      }),
    );
  } catch {
    // If parsing fails, assume all criteria failed
    return task.success_criteria.map((c) => ({
      criterion: c,
      passed: false,
      reasoning: "Failed to parse judge response",
    }));
  }
}

/** List files recursively in a directory (max depth 3, max 50 files) */
function listFilesRecursive(dir: string, prefix = "", depth = 0): string[] {
  if (depth > 3) return [];
  const results: string[] = [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= 50) break;
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        results.push(`${path}/`);
        results.push(
          ...listFilesRecursive(`${dir}/${entry.name}`, path, depth + 1),
        );
      } else if (entry.isFile()) {
        results.push(path);
      }
    }
  } catch {
    // Directory may not be readable
  }

  return results;
}
