import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { parse as parseYaml } from "yaml";
import { TaskEvalConfig } from "../config/task-schema.js";
import { runTaskEvaluation, type TaskEvalResult } from "../eval/task-eval.js";

/**
 * Load API key from environment.
 */
async function getApiKey(): Promise<string> {
  try {
    const dotenv = await import("dotenv");
    dotenv.config();
  } catch {
    // dotenv not required
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY not set. Set it in your environment or in a .env file.",
    );
  }
  return key;
}

export const taskCommand = new Command("task")
  .description("Evaluate an agent on end-to-end task completion")
  .option("-c, --config <path>", "Path to task.yaml", "task.yaml")
  .option("--json", "Output results as JSON only")
  .option(
    "-o, --output <dir>",
    "Output directory for report",
    "agent-eval-report",
  )
  .action(async (options) => {
    try {
      // Load config
      const configPath = resolve(process.cwd(), options.config);
      if (!existsSync(configPath)) {
        throw new Error(
          `Config not found: ${configPath}\nCreate a task.yaml with task definition and agent config.`,
        );
      }

      const raw = parseYaml(readFileSync(configPath, "utf-8"));
      const config = TaskEvalConfig.parse(raw);
      const apiKey = await getApiKey();

      // Run evaluation
      const spinner = ora().start();
      const result = await runTaskEvaluation({
        config,
        apiKey,
        onProgress: (_step, detail) => {
          spinner.text = detail;
        },
      });
      spinner.succeed("Task evaluation complete");

      // Save report
      mkdirSync(options.output, { recursive: true });
      const reportPath = join(options.output, "task-report.json");
      writeFileSync(reportPath, JSON.stringify(result, null, 2));

      // Display results
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        printTaskResult(result);
        console.log(chalk.dim(`  Full report: ${reportPath}`));
        console.log("");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`\nError: ${message}`));
      process.exit(1);
    }
  });

function printTaskResult(result: TaskEvalResult): void {
  const passed = result.totalPassed === result.totalRuns;
  const statusColor = passed ? chalk.green : chalk.red;
  const statusText = passed ? "PASS" : "FAIL";

  console.log("");
  console.log(chalk.bold("  AgentHunter Task Eval v0.3"));
  console.log(chalk.dim(`  Agent: ${result.agentCommand}`));
  console.log(chalk.dim(`  Task: ${result.taskName}`));
  console.log("");
  console.log(chalk.dim(`  ${"─".repeat(44)}`));
  console.log(
    chalk.bold(
      `  RESULT: ${statusColor(statusText)} (${result.totalPassed}/${result.totalRuns} runs)`,
    ),
  );
  console.log(chalk.dim(`  ${"─".repeat(44)}`));
  console.log("");

  const successPct = Math.round(result.successRate * 100);
  const barWidth = 20;
  const filled = Math.round((successPct / 100) * barWidth);
  const bar = "\u2588".repeat(filled) + "\u2591".repeat(barWidth - filled);
  const barColor =
    successPct >= 80
      ? chalk.green
      : successPct >= 50
        ? chalk.yellow
        : chalk.red;

  console.log(`  Success Rate    ${barColor(bar)}  ${successPct}%`);
  console.log(`  Avg Duration    ${(result.avgDurationMs / 1000).toFixed(1)}s`);
  console.log(`  Avg Tokens      ${result.avgTokens.toLocaleString()}`);
  console.log(`  Total Runs      ${result.totalRuns}`);
  console.log("");

  // Show criteria from the first run
  if (result.runs.length > 0) {
    console.log("  Criteria Results:");
    for (const cr of result.runs[0]?.criteriaResults ?? []) {
      const icon = cr.passed ? chalk.green("\u2713") : chalk.red("\u2717");
      console.log(`    ${icon} ${cr.criterion}`);
    }
    console.log("");
  }
}
