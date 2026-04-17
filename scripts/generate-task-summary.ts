/**
 * Generate a task summary JSON from all agent task results.
 *
 * Reads: results/tasks-<agent>/<taskId>/task-report.json
 * Outputs: results/task-summary.json
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(SCRIPT_DIR, "..", "results");

interface TaskReport {
  taskName: string;
  agentCommand: string;
  runs: Array<{
    success: boolean;
    durationMs: number;
    estimatedTokens: number;
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number;
    criteriaResults: Array<{
      criterion: string;
      passed: boolean;
    }>;
  }>;
  successRate: number;
  avgDurationMs: number;
  // Optional fields — older reports may not have these, so we compute fallbacks
  p50DurationMs?: number;
  p95DurationMs?: number;
  avgCostUsd?: number;
  avgTokens: number;
  totalRuns: number;
  totalPassed: number;
}

interface AgentTaskSummary {
  agent: string;
  model: string;
  tasks: Array<{
    taskId: string;
    taskName: string;
    passed: boolean;
    successRate: number;
    avgDurationMs: number;
    p50DurationMs: number;
    p95DurationMs: number;
    avgTokens: number;
    avgCostUsd: number;
    criteriaTotal: number;
    criteriaPassed: number;
  }>;
  overallPassRate: number;
  avgDuration: number;
  avgTokens: number;
  /** Total USD cost to run this agent across all tasks */
  totalCostUsd: number;
}

// Find all task-* directories in results/
const agentDirs = readdirSync(RESULTS_DIR)
  .filter((d) => d.startsWith("tasks-"))
  .sort();

const agents: AgentTaskSummary[] = [];

for (const agentDir of agentDirs) {
  const agentName = agentDir.replace("tasks-", "");
  const agentPath = join(RESULTS_DIR, agentDir);
  const taskDirs = readdirSync(agentPath).filter((d) =>
    existsSync(join(agentPath, d, "task-report.json")),
  );

  // Determine model from agent name — keep in sync with current latest models
  const modelMap: Record<string, string> = {
    sonnet: "Claude Sonnet 4.6",
    haiku: "Claude Haiku 4.5",
    opus: "Claude Opus 4.6",
    "opus-4-7": "Claude Opus 4.7",
  };
  const model = modelMap[agentName] ?? agentName;

  const tasks: AgentTaskSummary["tasks"] = [];

  for (const taskDir of taskDirs.sort()) {
    const reportPath = join(agentPath, taskDir, "task-report.json");
    try {
      const report: TaskReport = JSON.parse(
        readFileSync(reportPath, "utf-8"),
      );
      const firstRun = report.runs[0];
      const criteriaTotal = firstRun?.criteriaResults.length ?? 0;
      const criteriaPassed =
        firstRun?.criteriaResults.filter((c) => c.passed).length ?? 0;

      // Derive percentiles from per-run durations so old reports (which don't
      // have the fields) still get sensible values.
      const durations = report.runs
        .map((r) => r.durationMs)
        .filter((d): d is number => typeof d === "number")
        .sort((a, b) => a - b);
      const p50 =
        report.p50DurationMs ?? percentile(durations, 50) ?? report.avgDurationMs;
      const p95 =
        report.p95DurationMs ?? percentile(durations, 95) ?? report.avgDurationMs;

      tasks.push({
        taskId: taskDir,
        taskName: report.taskName,
        passed: report.totalPassed > 0,
        successRate: report.successRate,
        avgDurationMs: report.avgDurationMs,
        p50DurationMs: p50,
        p95DurationMs: p95,
        avgTokens: report.avgTokens,
        avgCostUsd: report.avgCostUsd ?? 0,
        criteriaTotal,
        criteriaPassed,
      });
    } catch {
      // Skip invalid reports
    }
  }

  const passedTasks = tasks.filter((t) => t.passed).length;
  const avgDuration =
    tasks.length > 0
      ? Math.round(tasks.reduce((s, t) => s + t.avgDurationMs, 0) / tasks.length)
      : 0;
  const avgTokens =
    tasks.length > 0
      ? Math.round(tasks.reduce((s, t) => s + t.avgTokens, 0) / tasks.length)
      : 0;
  const totalCostUsd = tasks.reduce((s, t) => s + (t.avgCostUsd ?? 0), 0);

  agents.push({
    agent: agentName,
    model,
    tasks,
    overallPassRate: tasks.length > 0 ? passedTasks / tasks.length : 0,
    avgDuration,
    avgTokens,
    totalCostUsd,
  });
}

// Linear-interpolation percentile (matches numpy default). Returns undefined
// on empty input so callers can fall back to other fields.
function percentile(sorted: number[], p: number): number | undefined {
  if (sorted.length === 0) return undefined;
  if (sorted.length === 1) return Math.round(sorted[0]!);
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const weight = rank - lo;
  return Math.round(sorted[lo]! * (1 - weight) + sorted[hi]! * weight);
}

// Write summary
const summaryPath = join(RESULTS_DIR, "task-summary.json");
writeFileSync(summaryPath, JSON.stringify(agents, null, 2));

// Print summary
console.log("=== Task Eval Summary ===\n");
for (const agent of agents) {
  const passCount = agent.tasks.filter((t) => t.passed).length;
  console.log(
    `${agent.model} (${agent.agent}): ${passCount}/${agent.tasks.length} tasks passed, avg ${(agent.avgDuration / 1000).toFixed(1)}s`,
  );
  for (const task of agent.tasks) {
    const icon = task.passed ? "  \u2713" : "  \u2717";
    console.log(
      `${icon} ${task.taskName} (${(task.avgDurationMs / 1000).toFixed(1)}s, ${task.criteriaPassed}/${task.criteriaTotal} criteria)`,
    );
  }
  console.log("");
}

console.log(`Summary: ${summaryPath}`);
