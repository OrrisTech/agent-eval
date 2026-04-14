/**
 * Core evaluation engine — orchestrates the full eval pipeline.
 * Used by both the CLI `run` command and the batch runner script.
 */

import type { AgentEvalConfig } from "../config/schema.js";
import type { ToolInfo } from "../protocols/base.js";
import { createAdapter } from "../protocols/factory.js";
import {
  buildReport,
  type EvalReport,
  saveReport,
} from "../report/generator.js";
import { executeTasks } from "./executor.js";
import { scoreResults } from "./scorer.js";
import type { TestTask } from "./task-generator.js";
import { generateTasks } from "./task-generator.js";
import { loadTaskSet, saveTaskSet } from "./task-store.js";

/** Progress callback — receives step name and detail message */
export type ProgressCallback = (step: string, detail: string) => void;

/** Options for running an evaluation */
export interface EvalOptions {
  config: AgentEvalConfig;
  apiKey: string;
  tasksPerTool?: number;
  runsPerTask?: number;
  /** Max tools to evaluate — for large servers, randomly sample this many tools */
  maxTools?: number;
  /** Force regeneration of task set even if cached */
  regenerateTasks?: boolean;
  /** Base directory for task set storage (defaults to outputDir or cwd) */
  baseDir?: string;
  outputDir?: string;
  /** Called on each major step for progress reporting */
  onProgress?: ProgressCallback;
}

/** Result of a full evaluation run */
export interface EvalResult {
  report: EvalReport;
  reportPath?: string;
}

/**
 * Run a full evaluation pipeline:
 *   1. Connect to agent via protocol adapter
 *   2. Discover tools
 *   3. Generate test tasks (Claude API)
 *   4. Execute tasks and collect metrics
 *   5. Score results with LLM-as-judge
 *   6. Build and save report
 *
 * This function is self-contained and manages its own MCP connections.
 */
export async function runEvaluation(options: EvalOptions): Promise<EvalResult> {
  const {
    config,
    apiKey,
    tasksPerTool = 3,
    runsPerTask = config.eval.runs,
    maxTools,
    regenerateTasks = false,
    baseDir = process.cwd(),
    outputDir,
    onProgress,
  } = options;

  const progress = onProgress ?? (() => {});

  // Step 1: Connect and discover tools
  progress(
    "connect",
    `Connecting via ${config.agent.protocol.toUpperCase()}...`,
  );
  const adapter = createAdapter(config.agent.protocol, config.agent.endpoint);
  await adapter.connect();

  let tools: ToolInfo[];
  try {
    tools = await adapter.listTools();
  } catch (err) {
    await adapter.disconnect().catch(() => {});
    throw err;
  }

  // If maxTools is set, sample a subset to keep evaluation time reasonable
  const allToolCount = tools.length;
  if (maxTools && tools.length > maxTools) {
    // Keep a diverse sample: first few + random from the rest
    const shuffled = [...tools].sort(() => Math.random() - 0.5);
    tools = shuffled.slice(0, maxTools);
  }

  progress(
    "discover",
    `Discovered ${allToolCount} tool(s)${maxTools && allToolCount > maxTools ? `, evaluating ${tools.length}` : ""}`,
  );

  if (tools.length === 0) {
    await adapter.disconnect().catch(() => {});
    throw new Error("No tools found. Nothing to evaluate.");
  }

  // Step 2: Load cached tasks or generate new ones
  const toolNames = tools.map((t) => t.name);
  let tasks: TestTask[];

  // Try loading cached task set (unless forced to regenerate)
  const cached = !regenerateTasks
    ? loadTaskSet(baseDir, config.agent.name, toolNames)
    : null;

  if (cached) {
    tasks = cached.tasks;
    progress(
      "generate",
      `Loaded ${tasks.length} cached tasks (v${cached.version})`,
    );
  } else {
    // Generate new tasks via Claude API
    // The MCP connection stays open during this step — tested to survive 60s+ idle
    progress(
      "generate",
      `Generating ${tasksPerTool} tasks per tool (${tools.length} tools)...`,
    );
    tasks = await generateTasks(tools, config.agent.capabilities, {
      tasksPerTool,
      apiKey,
    });
    const saved = saveTaskSet(
      baseDir,
      config.agent.name,
      toolNames,
      tasks,
      config.eval.judge?.model ?? "claude-sonnet-4-20250514",
    );
    progress(
      "generate",
      `Generated and saved ${tasks.length} tasks (v${saved.version})`,
    );
  }

  // Step 3: Execute tasks
  const totalRuns = tasks.length * runsPerTask;
  progress("execute", `Executing ${totalRuns} runs...`);
  const execution = await executeTasks(adapter, tasks, runsPerTask, {
    onRunComplete: (completed, total) => {
      progress("execute", `Executing runs... ${completed}/${total}`);
    },
  });
  progress(
    "execute",
    `Executed ${execution.totalRuns} runs (${execution.totalSuccessful} successful)`,
  );

  // Step 4: Disconnect
  await adapter.disconnect().catch(() => {});

  // Step 5: Score results
  progress("score", "Scoring with LLM-as-judge...");
  const weights = {
    capability: config.eval.dimensions.capability.weight,
    reliability: config.eval.dimensions.reliability.weight,
    efficiency: config.eval.dimensions.efficiency.weight,
    safety: config.eval.dimensions.safety.weight,
    developer_experience: config.eval.dimensions.developer_experience.weight,
  };
  const scores = await scoreResults(execution.taskResults, {
    apiKey,
    tools,
    weights,
    judgeModel: config.eval.judge?.model,
    onTaskScored: (completed, total) => {
      progress("score", `Scoring tasks... ${completed}/${total}`);
    },
  });
  progress("score", "Scoring complete");

  // Step 6: Build report
  const report = buildReport(config, tools, execution, scores);

  let reportPath: string | undefined;
  if (outputDir) {
    reportPath = saveReport(report, outputDir);
  }

  return { report, reportPath };
}
