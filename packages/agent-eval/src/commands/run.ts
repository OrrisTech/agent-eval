import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { loadConfig } from "../config/loader.js";
import { runEvaluation } from "../eval/engine.js";
import { printReport } from "../report/generator.js";

/**
 * Load API key from environment.
 * Checks ANTHROPIC_API_KEY env var. Loads from .env if dotenv is available.
 */
async function getApiKey(): Promise<string> {
  // Try loading .env from cwd
  try {
    const dotenv = await import("dotenv");
    dotenv.config();
  } catch {
    // dotenv not required if env var is already set
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY not set. Set it in your environment or in a .env file.",
    );
  }
  return key;
}

export const runCommand = new Command("run")
  .description("Run evaluation against the configured agent")
  .option("-c, --config <path>", "Path to agent-eval.yaml", "agent-eval.yaml")
  .option(
    "-n, --runs <number>",
    "Number of test runs per task (overrides config)",
  )
  .option(
    "-t, --tasks-per-tool <number>",
    "Number of test tasks to generate per tool",
    "5",
  )
  .option(
    "--max-tools <number>",
    "Max tools to evaluate (randomly samples from discovered tools)",
  )
  .option(
    "--regenerate-tasks",
    "Force regeneration of test tasks (ignore cached task set)",
  )
  .option("--json", "Output results as JSON only")
  .option(
    "-o, --output <dir>",
    "Output directory for report",
    "agent-eval-report",
  )
  .action(async (options) => {
    try {
      // Load config
      const config = loadConfig(options.config);
      const apiKey = await getApiKey();

      const runsPerTask = options.runs
        ? Number.parseInt(options.runs, 10)
        : config.eval.runs;
      const tasksPerTool = Number.parseInt(options.tasksPerTool, 10);
      const maxTools = options.maxTools
        ? Number.parseInt(options.maxTools, 10)
        : undefined;

      // Run evaluation with spinner progress
      const spinner = ora().start();
      const result = await runEvaluation({
        config,
        apiKey,
        tasksPerTool,
        runsPerTask,
        maxTools,
        regenerateTasks: options.regenerateTasks ?? false,
        outputDir: options.output,
        onProgress: (_step, detail) => {
          spinner.text = detail;
        },
      });
      spinner.succeed("Evaluation complete");

      // Display results
      if (options.json) {
        console.log(JSON.stringify(result.report, null, 2));
      } else {
        printReport(result.report);
        if (result.reportPath) {
          console.log(chalk.dim(`  Full report: ${result.reportPath}`));
          console.log("");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`\nError: ${message}`));
      process.exit(1);
    }
  });
