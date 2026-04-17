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
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import type { TaskEvalConfig } from "../config/task-schema.js";
import { callWithRetry } from "./llm-client.js";
import { computeCostUsd } from "./pricing.js";

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
  /** Real input tokens reported by the agent via `USAGE: input=X output=Y` (if emitted) */
  inputTokens?: number;
  /** Real output tokens reported by the agent (if emitted) */
  outputTokens?: number;
  /** Computed USD cost for this run, if pricing + real tokens are available */
  costUsd?: number;
}

/** Aggregated result across all runs */
export interface TaskEvalResult {
  taskName: string;
  agentCommand: string;
  runs: TaskRunResult[];
  successRate: number;
  avgDurationMs: number;
  /** 50th percentile duration across runs — equal to avg when runs=1 */
  p50DurationMs: number;
  /** 95th percentile duration — useful once runs>=3 to reveal tail latency */
  p95DurationMs: number;
  avgTokens: number;
  /** Average USD cost across runs — 0 if cost isn't known */
  avgCostUsd: number;
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
    // Write description to a temp file to avoid shell escaping issues with
    // multi-line descriptions containing backticks, quotes, and code blocks
    const descFile = `${workdir}/.task-description.txt`;
    writeFileSync(descFile, config.task.description, "utf-8");
    const agentArgs = config.agent.args.map((arg) =>
      arg
        .replace("{{description}}", config.task.description)
        .replace("{{description_file}}", descFile),
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

    // Step 4: List workspace files and read small file contents for judge context
    let workspaceFiles = "";
    try {
      const files = listFilesRecursive(workdir);
      if (files.length > 0) {
        workspaceFiles = "\n\nFiles in workspace:";
        for (const file of files) {
          if (file.endsWith("/")) {
            workspaceFiles += `\n  [dir] ${file}`;
            continue;
          }
          workspaceFiles += `\n  ${file}`;
          // Read small files so the judge can see their content
          try {
            const fullPath = `${workdir}/${file}`;
            const stat = statSync(fullPath);
            if (stat.size < 5000) {
              const content = readFileSync(fullPath, "utf-8");
              workspaceFiles += `\n--- Content of ${file} ---\n${content}\n--- End of ${file} ---`;
            }
          } catch {
            // Skip unreadable files
          }
        }
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

    // Rough token estimate: ~4 chars per token. Used as a fallback when the
    // agent doesn't report real token usage on its USAGE line.
    const estimatedTokens = Math.round(output.length / 4);

    // Parse `USAGE: input=<n> output=<m> [model=<id>]` emitted by agent scripts
    // so we can track real token counts and compute accurate cost.
    const usage = parseUsageLine(output);

    const costUsd = computeCostUsd(
      usage?.model,
      usage?.inputTokens,
      usage?.outputTokens,
    );

    runs.push({
      runIndex: i + 1,
      success: allPassed,
      criteriaResults,
      durationMs,
      exitCode,
      output: output.slice(0, 5000), // Truncate for storage
      estimatedTokens,
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
      costUsd: costUsd > 0 ? costUsd : undefined,
    });
  }

  // Aggregate
  const totalPassed = runs.filter((r) => r.success).length;
  const durations = runs.map((r) => r.durationMs);
  const avgDurationMs =
    durations.length > 0
      ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
      : 0;
  const avgTokens =
    runs.length > 0
      ? Math.round(
          runs.reduce((s, r) => s + r.estimatedTokens, 0) / runs.length,
        )
      : 0;
  const runsWithCost = runs.filter((r) => r.costUsd != null);
  const avgCostUsd =
    runsWithCost.length > 0
      ? runsWithCost.reduce((s, r) => s + (r.costUsd ?? 0), 0) /
        runsWithCost.length
      : 0;

  return {
    taskName: config.task.name,
    agentCommand: `${config.agent.command} ${config.agent.args.join(" ")}`,
    runs,
    successRate: runs.length > 0 ? totalPassed / runs.length : 0,
    avgDurationMs,
    p50DurationMs: percentile(durations, 50),
    p95DurationMs: percentile(durations, 95),
    avgTokens,
    avgCostUsd,
    totalRuns: runs.length,
    totalPassed,
  };
}

/**
 * Compute the requested percentile of a numeric array. Uses linear
 * interpolation between adjacent ranks (matches numpy's default), which
 * gives sensible results even for small sample sizes.
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return Math.round(values[0] ?? 0);
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const weight = rank - lo;
  const value = (sorted[lo] ?? 0) * (1 - weight) + (sorted[hi] ?? 0) * weight;
  return Math.round(value);
}

/**
 * Parse the `USAGE:` marker line that agent scripts emit after calling the
 * model API. Accepts formats like:
 *   USAGE: input=1234 output=567
 *   USAGE: input=1234 output=567 model=claude-sonnet-4-6
 * Returns null if no marker is present so callers fall back to rough estimates.
 */
export function parseUsageLine(output: string): {
  inputTokens: number;
  outputTokens: number;
  model?: string;
} | null {
  const match = output.match(
    /^USAGE:\s+input=(\d+)\s+output=(\d+)(?:\s+model=([\w.\-:]+))?/m,
  );
  if (!match) return null;
  return {
    inputTokens: Number.parseInt(match[1] ?? "0", 10),
    outputTokens: Number.parseInt(match[2] ?? "0", 10),
    model: match[3],
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
