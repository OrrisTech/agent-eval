/**
 * Generate a task summary JSON from all agent task results.
 *
 * Reads: results/tasks-{agent}/*/task-report.json
 * Outputs: results/task-summary.json
 */

const {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} = require("node:fs");
const { join } = require("node:path");

const __dirname = __dirname ?? process.cwd() + "/scripts";
const RESULTS_DIR = join(__dirname, "..", "results");

interface TaskReport {
  taskName: string;
  agentCommand: string;
  runs: Array<{
    success: boolean;
    durationMs: number;
    estimatedTokens: number;
    criteriaResults: Array<{
      criterion: string;
      passed: boolean;
    }>;
  }>;
  successRate: number;
  avgDurationMs: number;
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
    avgTokens: number;
    criteriaTotal: number;
    criteriaPassed: number;
  }>;
  overallPassRate: number;
  avgDuration: number;
  avgTokens: number;
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

  // Determine model from agent name
  const modelMap: Record<string, string> = {
    sonnet: "Claude Sonnet 4",
    haiku: "Claude Haiku 4.5",
    opus: "Claude Opus 4",
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

      tasks.push({
        taskId: taskDir,
        taskName: report.taskName,
        passed: report.totalPassed > 0,
        successRate: report.successRate,
        avgDurationMs: report.avgDurationMs,
        avgTokens: report.avgTokens,
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

  agents.push({
    agent: agentName,
    model,
    tasks,
    overallPassRate: tasks.length > 0 ? passedTasks / tasks.length : 0,
    avgDuration,
    avgTokens,
  });
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
