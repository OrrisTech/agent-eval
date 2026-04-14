import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { AgentSummary, AgentReport, AgentTaskSummary } from "./types";

// Resolve the results directory — works both locally and on Vercel
const RESULTS_DIR =
  process.env.RESULTS_DIR ??
  resolve(/* turbopackIgnore: true */ process.cwd(), "../../results");

/**
 * Get all evaluated agents sorted by score descending.
 * Reads from results/summary.json.
 */
export function getAllAgents(): AgentSummary[] {
  const summaryPath = join(RESULTS_DIR, "summary.json");
  if (!existsSync(summaryPath)) return [];

  const data: AgentSummary[] = JSON.parse(readFileSync(summaryPath, "utf-8"));
  return data
    .filter((a) => a.status === "success")
    .sort((a, b) => b.score - a.score);
}

/**
 * Get a single agent's full evaluation report.
 * Reads from results/{slug}/report.json.
 */
export function getAgent(slug: string): AgentReport | null {
  // Sanitize slug to prevent path traversal
  const safeName = slug.replace(/[^a-zA-Z0-9_-]/g, "");
  const reportPath = join(RESULTS_DIR, safeName, "report.json");
  if (!existsSync(reportPath)) return null;

  return JSON.parse(readFileSync(reportPath, "utf-8"));
}

/**
 * Get task evaluation results for all agents.
 * Reads from results/task-summary.json.
 */
export function getTaskSummary(): AgentTaskSummary[] {
  const summaryPath = join(RESULTS_DIR, "task-summary.json");
  if (!existsSync(summaryPath)) return [];

  return JSON.parse(readFileSync(summaryPath, "utf-8"));
}

/**
 * Get all unique task IDs from the task summary.
 * Used by generateStaticParams for /task/[id].
 */
export function getAllTaskIds(): string[] {
  const summary = getTaskSummary();
  if (summary.length === 0) return [];
  // All agents have the same task list, so take from the first
  return summary[0]?.tasks.map((t) => t.taskId) ?? [];
}

/**
 * Get detailed results for a single task across all agents.
 */
export function getTaskDetails(taskId: string): {
  taskName: string;
  agents: Array<{
    agent: string;
    model: string;
    passed: boolean;
    avgDurationMs: number;
    criteriaTotal: number;
    criteriaPassed: number;
  }>;
} | null {
  const summary = getTaskSummary();
  if (summary.length === 0) return null;

  const safeId = taskId.replace(/[^a-zA-Z0-9_-]/g, "");
  let taskName = "";

  const agents = summary.map((agent) => {
    const task = agent.tasks.find((t) => t.taskId === safeId);
    if (!task) return null;
    taskName = task.taskName;
    return {
      agent: agent.agent,
      model: agent.model,
      passed: task.passed,
      avgDurationMs: task.avgDurationMs,
      criteriaTotal: task.criteriaTotal,
      criteriaPassed: task.criteriaPassed,
    };
  }).filter((a): a is NonNullable<typeof a> => a !== null);

  if (agents.length === 0) return null;
  return { taskName, agents };
}

/**
 * Get all agent slugs that have report data.
 * Used by generateStaticParams.
 */
export function getAllSlugs(): string[] {
  if (!existsSync(RESULTS_DIR)) return [];

  return readdirSync(RESULTS_DIR, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() &&
        existsSync(join(RESULTS_DIR, d.name, "report.json")),
    )
    .map((d) => d.name);
}
