import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import type { AgentEvalConfig } from "../config/schema.js";
import type { ExecutionResults } from "../eval/executor.js";
import type { AggregatedScores } from "../eval/scorer.js";
import type { ToolInfo } from "../protocols/base.js";

/** Full evaluation report — saved to disk as JSON */
export interface EvalReport {
  meta: {
    agentName: string;
    agentVersion: string;
    protocol: string;
    endpoint: string;
    capabilities: string[];
    evalFrameworkVersion: string;
    evaluatedAt: string;
  };
  tools: ToolInfo[];
  scores: AggregatedScores;
  execution: {
    totalTasks: number;
    totalRuns: number;
    totalSuccessful: number;
    overallSuccessRate: number;
    totalDurationMs: number;
    latency: {
      avgMs: number;
      p95Ms: number;
    };
  };
}

/**
 * Build the full eval report object from all pipeline outputs.
 */
export function buildReport(
  config: AgentEvalConfig,
  tools: ToolInfo[],
  execution: ExecutionResults,
  scores: AggregatedScores,
): EvalReport {
  // Compute aggregate latency from all task results
  const allLatencies = execution.taskResults
    .filter((tr) => tr.latency.avg > 0)
    .map((tr) => tr.latency);
  const avgMs =
    allLatencies.length > 0
      ? Math.round(
          allLatencies.reduce((s, l) => s + l.avg, 0) / allLatencies.length,
        )
      : 0;
  const p95Ms =
    allLatencies.length > 0 ? Math.max(...allLatencies.map((l) => l.p95)) : 0;

  return {
    meta: {
      agentName: config.agent.name,
      agentVersion: config.agent.version,
      protocol: config.agent.protocol,
      endpoint: config.agent.endpoint,
      capabilities: config.agent.capabilities,
      evalFrameworkVersion: "0.1.0",
      evaluatedAt: new Date().toISOString(),
    },
    tools,
    scores,
    execution: {
      totalTasks: execution.taskResults.length,
      totalRuns: execution.totalRuns,
      totalSuccessful: execution.totalSuccessful,
      overallSuccessRate: execution.overallSuccessRate,
      totalDurationMs: execution.totalDurationMs,
      latency: { avgMs, p95Ms },
    },
  };
}

/**
 * Save the JSON report to disk.
 */
export function saveReport(report: EvalReport, outDir: string): string {
  mkdirSync(outDir, { recursive: true });
  const filePath = join(outDir, "report.json");
  writeFileSync(filePath, JSON.stringify(report, null, 2), "utf-8");
  return filePath;
}

/**
 * Print a visual summary to the terminal.
 */
export function printReport(report: EvalReport): void {
  const s = report.scores;

  console.log("");
  console.log(
    chalk.bold(`  AgentHunter Eval v${report.meta.evalFrameworkVersion}`),
  );
  console.log(
    chalk.dim(
      `  Agent: ${report.meta.agentName} v${report.meta.agentVersion} (${report.meta.protocol.toUpperCase()})`,
    ),
  );
  console.log(
    chalk.dim(
      `  Tools: ${report.tools.length} | Tasks: ${report.execution.totalTasks} | Runs: ${report.execution.totalRuns}`,
    ),
  );
  console.log("");
  console.log(chalk.dim(`  ${"─".repeat(44)}`));
  console.log(chalk.bold(`  SCORE: ${s.overall} / 100`));
  console.log(chalk.dim(`  ${"─".repeat(44)}`));
  console.log("");

  printBar("Capability", s.capability);
  printBar("Reliability", s.reliability);
  printBar("Efficiency", s.efficiency);
  printBar("Safety", s.safety);
  printBar("Dev Experience", s.developerExperience);

  console.log("");
  console.log(
    chalk.dim(
      `  Latency: avg ${report.execution.latency.avgMs}ms, p95 ${report.execution.latency.p95Ms}ms`,
    ),
  );
  console.log(
    chalk.dim(
      `  Duration: ${(report.execution.totalDurationMs / 1000).toFixed(1)}s`,
    ),
  );
  console.log("");
}

/** Render a single score bar line */
function printBar(label: string, score: number): void {
  const barWidth = 20;
  const filled = Math.round((score / 100) * barWidth);
  const empty = barWidth - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);

  const color =
    score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;

  const paddedLabel = label.padEnd(16);
  console.log(`  ${paddedLabel}${color(bar)}  ${score}%`);
}
