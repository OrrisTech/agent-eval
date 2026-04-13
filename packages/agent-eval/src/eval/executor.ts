import type { InvocationResult, ProtocolAdapter } from "../protocols/base.js";
import type { TestTask } from "./task-generator.js";

/** Result of a single task execution (one run) */
export interface TaskRunResult {
  task: TestTask;
  /** Which run number this is (1-based) */
  runIndex: number;
  /** The raw invocation result from the adapter */
  invocation: InvocationResult;
}

/** Aggregated results for a single task across all runs */
export interface TaskResult {
  task: TestTask;
  /** All individual run results */
  runs: TaskRunResult[];
  /** How many runs succeeded */
  successCount: number;
  /** Success rate as fraction [0, 1] */
  successRate: number;
  /** Latency stats across successful runs */
  latency: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
}

/** Full execution results across all tasks */
export interface ExecutionResults {
  taskResults: TaskResult[];
  /** Total number of individual runs executed */
  totalRuns: number;
  /** Total number of successful runs */
  totalSuccessful: number;
  /** Overall success rate */
  overallSuccessRate: number;
  /** Total wall-clock time in ms */
  totalDurationMs: number;
}

/**
 * Execute all test tasks against the agent, each task N times.
 * Collects raw outputs and timing metrics for downstream scoring.
 */
export async function executeTasks(
  adapter: ProtocolAdapter,
  tasks: TestTask[],
  runsPerTask: number,
  options?: {
    /** Called after each individual run completes (for progress reporting) */
    onRunComplete?: (completed: number, total: number) => void;
  },
): Promise<ExecutionResults> {
  const totalRuns = tasks.length * runsPerTask;
  let completedRuns = 0;
  const startTime = performance.now();

  const taskResults: TaskResult[] = [];

  for (const task of tasks) {
    const runs: TaskRunResult[] = [];

    for (let i = 0; i < runsPerTask; i++) {
      const invocation = await adapter.invoke(task.toolName, task.args);

      runs.push({
        task,
        runIndex: i + 1,
        invocation,
      });

      completedRuns++;
      options?.onRunComplete?.(completedRuns, totalRuns);
    }

    const successCount = runs.filter((r) => r.invocation.success).length;
    const successfulLatencies = runs
      .filter((r) => r.invocation.success)
      .map((r) => r.invocation.latencyMs)
      .sort((a, b) => a - b);

    taskResults.push({
      task,
      runs,
      successCount,
      successRate: runs.length > 0 ? successCount / runs.length : 0,
      latency: computeLatencyStats(successfulLatencies),
    });
  }

  const totalDurationMs = Math.round(performance.now() - startTime);
  const totalSuccessful = taskResults.reduce(
    (sum, tr) => sum + tr.successCount,
    0,
  );

  return {
    taskResults,
    totalRuns: completedRuns,
    totalSuccessful,
    overallSuccessRate: completedRuns > 0 ? totalSuccessful / completedRuns : 0,
    totalDurationMs,
  };
}

/** Compute percentile-based latency statistics from a sorted array */
function computeLatencyStats(sorted: number[]): TaskResult["latency"] {
  if (sorted.length === 0) {
    return { avg: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0 };
  }

  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    avg: Math.round(sum / sorted.length),
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))] ?? 0;
}
