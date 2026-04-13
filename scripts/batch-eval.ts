/**
 * Batch evaluation runner — evaluates all MCP servers listed in servers.json.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/batch-eval.ts
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/batch-eval.ts --tasks-per-tool 3 --runs 2
 *
 * Outputs:
 *   results/{server-name}/report.json  — per-server evaluation report
 *   results/summary.json               — aggregated summary of all evaluations
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface ServerConfig {
  name: string;
  package: string;
  endpoint: string;
  capabilities: string[];
  category: string;
  setup?: string;
  note?: string;
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
const tasksPerTool = getArg(args, "--tasks-per-tool") || "3";
const runsPerTask = getArg(args, "--runs") || "2";
const only = getArg(args, "--only"); // Run only a specific server by name

const SCRIPTS_DIR = __dirname;
const ROOT_DIR = join(SCRIPTS_DIR, "..");
const RESULTS_DIR = join(ROOT_DIR, "results");
const CLI_PATH = join(ROOT_DIR, "packages", "agent-eval", "dist", "cli.js");

// Check prerequisites
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is required.");
  process.exit(1);
}

if (!existsSync(CLI_PATH)) {
  console.error(
    "Error: CLI not built. Run `bun run --filter agent-eval build` first.",
  );
  process.exit(1);
}

// Load server list
const servers: ServerConfig[] = JSON.parse(
  readFileSync(join(SCRIPTS_DIR, "servers.json"), "utf-8"),
);

const toRun = only ? servers.filter((s) => s.name === only) : servers;
if (toRun.length === 0) {
  console.error(
    `No servers to evaluate${only ? ` (--only ${only} not found)` : ""}.`,
  );
  process.exit(1);
}

console.log("\n=== AgentHunter Batch Eval ===");
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

  // Run setup command if specified (setup commands are hardcoded in servers.json, not user input)
  if (server.setup) {
    try {
      execFileSync("/bin/sh", ["-c", server.setup], { stdio: "ignore" });
    } catch {
      console.log(`  Warning: Setup command failed for ${server.name}`);
    }
  }

  // Write temporary agent-eval.yaml for this server
  const configContent = `
agent:
  name: "${server.name}"
  version: "1.0.0"
  protocol: mcp
  endpoint: "${server.endpoint}"
  capabilities:
${server.capabilities.map((c) => `    - ${c}`).join("\n")}

eval:
  runs: ${runsPerTask}
`;
  const configPath = join(serverResultDir, "agent-eval.yaml");
  writeFileSync(configPath, configContent);

  try {
    // Run agent-eval with a timeout (5 minutes per server)
    // Don't use --json flag; read the report file directly instead.
    // Spinner output goes to stdout/stderr which makes stdout JSON unreliable.
    execFileSync(
      "node",
      [CLI_PATH, "run", "-c", configPath, "-t", tasksPerTool, "-o", serverResultDir],
      {
        timeout: 300_000,
        env: { ...process.env },
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    // Read the report file directly — much more reliable than parsing stdout
    const reportPath = join(serverResultDir, "report.json");
    if (existsSync(reportPath)) {
      const report = JSON.parse(readFileSync(reportPath, "utf-8"));
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
    } else {
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
        error: "No report.json generated",
      });
      console.log("  Failed: No report generated");
    }
  } catch (err) {
    // Extract stderr from execFileSync error for better diagnostics
    const stderr =
      err && typeof err === "object" && "stderr" in err
        ? String((err as { stderr: unknown }).stderr).slice(0, 300)
        : "";
    const message =
      stderr || (err instanceof Error ? err.message.slice(0, 200) : String(err));
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

// Helper
function getArg(argsList: string[], flag: string): string | undefined {
  const idx = argsList.indexOf(flag);
  return idx >= 0 ? argsList[idx + 1] : undefined;
}
