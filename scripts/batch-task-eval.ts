/**
 * Batch runner for task evaluations across multiple agents.
 *
 * Iterates every `tasks/*.yaml` × each listed agent (haiku/sonnet/opus),
 * cleans the shared workspace between runs, and writes each result to
 * `results/tasks-<agent>/<taskId>/task-report.json`.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... bun run scripts/batch-task-eval.ts
 *   ANTHROPIC_API_KEY=sk-... bun run scripts/batch-task-eval.ts --only haiku
 *   ANTHROPIC_API_KEY=sk-... bun run scripts/batch-task-eval.ts --only sonnet --task 01-create-cli-tool
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TASKS_DIR = join(ROOT, "tasks");
const RESULTS_DIR = join(ROOT, "results");
const CLI = join(ROOT, "packages/agent-eval/dist/cli.js");
const WORKSPACE = "/tmp/agent-eval-workspace";

type AgentSlug = "haiku" | "sonnet" | "opus" | "opus-4-7";

const MODEL_BY_AGENT: Record<AgentSlug, string> = {
  haiku: "claude-haiku-4-5",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-6",
  "opus-4-7": "claude-opus-4-7",
};

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

const onlyAgent = getArg("--only") as AgentSlug | undefined;
const onlyTask = getArg("--task");

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY env var is required.");
  process.exit(1);
}

const agents: AgentSlug[] = onlyAgent
  ? [onlyAgent]
  : ["haiku", "sonnet", "opus", "opus-4-7"];

const taskYamls = readdirSync(TASKS_DIR)
  .filter((f) => /^\d+-.+\.yaml$/.test(f))
  .sort();

const taskFilter = onlyTask ? [onlyTask.replace(/\.yaml$/, "")] : null;

console.log(
  `Batch task eval: ${agents.length} agents × ${taskYamls.length} tasks`,
);
console.log(`  Agents: ${agents.join(", ")}`);
if (taskFilter) console.log(`  Only task: ${taskFilter.join(", ")}`);
console.log("");

const startAll = Date.now();
let okCount = 0;
let failCount = 0;

for (const agent of agents) {
  console.log(`\n=== ${agent.toUpperCase()} (${MODEL_BY_AGENT[agent]}) ===`);

  for (const yamlFile of taskYamls) {
    const taskId = yamlFile.replace(/\.yaml$/, "");
    if (taskFilter && !taskFilter.includes(taskId)) continue;

    // Clean workspace between runs so the judge only sees files from this task
    if (existsSync(WORKSPACE)) {
      rmSync(WORKSPACE, { recursive: true, force: true });
    }
    mkdirSync(WORKSPACE, { recursive: true });

    const outDir = join(RESULTS_DIR, `tasks-${agent}`, taskId);
    mkdirSync(outDir, { recursive: true });

    const yamlPath = join(TASKS_DIR, yamlFile);
    const start = Date.now();

    try {
      execFileSync(
        "node",
        [CLI, "task", "-c", yamlPath, "-o", outDir, "--json"],
        {
          env: {
            ...process.env,
            AGENT_MODEL: MODEL_BY_AGENT[agent],
          },
          stdio: ["ignore", "ignore", "pipe"],
          encoding: "utf-8",
        },
      );
      const dur = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`  OK ${taskId} (${dur}s)`);
      okCount++;
    } catch (err) {
      const dur = ((Date.now() - start) / 1000).toFixed(1);
      const stderr =
        err && typeof err === "object" && "stderr" in err
          ? String((err as { stderr: Buffer }).stderr)
          : String(err);
      console.log(
        `  FAIL ${taskId} (${dur}s) — ${stderr.split("\n")[0].slice(0, 120)}`,
      );
      // Write a stub report so the summary script can still aggregate
      writeFileSync(
        join(outDir, "task-report.json"),
        JSON.stringify(
          {
            taskName: taskId,
            agentCommand: "(failed)",
            runs: [],
            successRate: 0,
            avgDurationMs: 0,
            p50DurationMs: 0,
            p95DurationMs: 0,
            avgTokens: 0,
            avgCostUsd: 0,
            totalRuns: 0,
            totalPassed: 0,
            error: stderr.slice(0, 1000),
          },
          null,
          2,
        ),
      );
      failCount++;
    }
  }
}

const totalDur = ((Date.now() - startAll) / 1000).toFixed(1);
console.log("\n=== Done ===");
console.log(`  ${okCount} ok, ${failCount} failed in ${totalDur}s`);
console.log(
  `  Regenerate task-summary.json with: bun run scripts/generate-task-summary.ts`,
);
