/**
 * Batch evaluation runner — evaluates MCP servers in-process (no child process spawning).
 *
 * This avoids the execFileSync signal handling issues that caused MCP servers to crash.
 * Instead, we import the eval engine directly and run each evaluation sequentially.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/batch-eval.ts
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/batch-eval.ts --tasks-per-tool 3 --runs 2
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/batch-eval.ts --only mcp-memory
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

// Import the eval engine directly — no child process spawning
import { runEvaluation } from "../packages/agent-eval/src/eval/engine.js";
import { AgentEvalConfig } from "../packages/agent-eval/src/config/schema.js";
import type { EvalReport } from "../packages/agent-eval/src/report/generator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface ServerConfig {
  name: string;
  package: string;
  endpoint: string;
  capabilities: string[];
  category: string;
  setup?: string;
  note?: string;
  maxTools?: number;
}

interface EvalSummary {
  name: string;
  category: string;
  score: number;
  capability: number;
  reliability: number;
  efficiency: number;
  safety: number;
  dx: number;
  tools: number;
  tasks: number;
  successRate: number;
  avgLatencyMs: number;
  status: "success" | "failed" | "skipped";
  error?: string;
}

// Parse CLI args
const args = process.argv.slice(2);
const tasksPerTool = Number(getArg(args, "--tasks-per-tool") || "3");
const runsPerTask = Number(getArg(args, "--runs") || "2");
const only = getArg(args, "--only");

const ROOT_DIR = join(__dirname, "..");
const RESULTS_DIR = join(ROOT_DIR, "results");

// Check prerequisites
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is required.");
  process.exit(1);
}

// Load server list
const servers: ServerConfig[] = JSON.parse(
  readFileSync(join(__dirname, "servers.json"), "utf-8"),
);

const toRun = only ? servers.filter((s) => s.name === only) : servers;
if (toRun.length === 0) {
  console.error(
    `No servers to evaluate${only ? ` (--only ${only} not found)` : ""}.`,
  );
  process.exit(1);
}

async function main() {
console.log("\n=== AgentHunter Batch Eval (in-process) ===");
console.log(`Servers: ${toRun.length}`);
console.log(`Tasks per tool: ${tasksPerTool}, Runs per task: ${runsPerTask}`);
console.log(`Results: ${RESULTS_DIR}\n`);

const summaries: EvalSummary[] = [];

for (let i = 0; i < toRun.length; i++) {
  const server = toRun[i]!;
  const index = `[${i + 1}/${toRun.length}]`;
  console.log(`${index} Evaluating: ${server.name} (${server.category})...`);

  const serverResultDir = join(RESULTS_DIR, server.name);
  mkdirSync(serverResultDir, { recursive: true });

  // Run setup command if specified (hardcoded in servers.json, safe)
  if (server.setup) {
    try {
      execFileSync("/bin/sh", ["-c", server.setup], { stdio: "ignore" });
    } catch {
      console.log(`  Warning: Setup command failed for ${server.name}`);
    }
  }

  // Build config object directly (no YAML file needed)
  const config = AgentEvalConfig.parse({
    agent: {
      name: server.name,
      version: "1.0.0",
      protocol: "mcp",
      endpoint: server.endpoint,
      capabilities: server.capabilities,
    },
    eval: {
      runs: runsPerTask,
    },
  });

  try {
    // Run evaluation in-process — no child process, no signal issues
    const result = await runEvaluation({
      config,
      apiKey,
      tasksPerTool,
      runsPerTask,
      maxTools: server.maxTools,
      outputDir: serverResultDir,
      onProgress: (_step, detail) => {
        // Minimal progress output for batch mode
      },
    });

    const report = result.report;
    const summary: EvalSummary = {
      name: server.name,
      category: server.category,
      score: report.scores.overall,
      capability: report.scores.capability,
      reliability: report.scores.reliability,
      efficiency: report.scores.efficiency,
      safety: report.scores.safety,
      dx: report.scores.developerExperience,
      tools: report.tools.length,
      tasks: report.execution.totalTasks,
      successRate: Math.round(report.execution.overallSuccessRate * 100),
      avgLatencyMs: report.execution.latency.avgMs,
      status: "success",
    };
    summaries.push(summary);
    console.log(
      `  Score: ${summary.score}/100 (${summary.tools} tools, ${summary.tasks} tasks, ${summary.successRate}% success)`,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 200) : String(err);
    summaries.push({
      name: server.name,
      category: server.category,
      score: 0,
      capability: 0,
      reliability: 0,
      efficiency: 0,
      safety: 0,
      dx: 0,
      tools: 0,
      tasks: 0,
      successRate: 0,
      avgLatencyMs: 0,
      status: "failed",
      error: message,
    });
    console.log(`  Failed: ${message.slice(0, 100)}`);
  }

  // Brief pause between evaluations to let MCP processes fully clean up
  await new Promise((r) => setTimeout(r, 1000));
}

// Write summary
const summaryPath = join(RESULTS_DIR, "summary.json");
writeFileSync(summaryPath, JSON.stringify(summaries, null, 2));

// Print summary table
console.log("\n=== RESULTS ===\n");
console.log(
  "Name".padEnd(28) +
    "Score".padStart(6) +
    "Cap".padStart(5) +
    "Rel".padStart(5) +
    "Eff".padStart(5) +
    "Safe".padStart(6) +
    "Tools".padStart(6) +
    "Success".padStart(9) +
    "Status".padStart(9),
);
console.log("-".repeat(79));

const sorted = [...summaries].sort((a, b) => b.score - a.score);
for (const s of sorted) {
  console.log(
    s.name.padEnd(28) +
      String(s.score).padStart(6) +
      String(s.capability).padStart(5) +
      String(s.reliability).padStart(5) +
      String(s.efficiency).padStart(5) +
      String(s.safety).padStart(6) +
      String(s.tools).padStart(6) +
      `${s.successRate}%`.padStart(9) +
      s.status.padStart(9),
  );
}

const successful = summaries.filter((s) => s.status === "success");
console.log(
  `\n${successful.length}/${summaries.length} servers evaluated successfully.`,
);
console.log(`Summary: ${summaryPath}\n`);
} // end main()

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

function getArg(argsList: string[], flag: string): string | undefined {
  const idx = argsList.indexOf(flag);
  return idx >= 0 ? argsList[idx + 1] : undefined;
}
