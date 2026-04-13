import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { loadConfig } from "../config/loader.js";
import { executeTasks } from "../eval/executor.js";
import { scoreResults } from "../eval/scorer.js";
import { generateTasks } from "../eval/task-generator.js";
import { createAdapter } from "../protocols/factory.js";
import { buildReport, printReport, saveReport } from "../report/generator.js";

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
  .option("--json", "Output results as JSON only")
  .option(
    "-o, --output <dir>",
    "Output directory for report",
    "agent-eval-report",
  )
  .action(async (options) => {
    try {
      await runEval(options);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`\nError: ${message}`));
      process.exit(1);
    }
  });

async function runEval(options: {
  config: string;
  runs?: string;
  tasksPerTool: string;
  json?: boolean;
  output: string;
}) {
  // Step 1: Load config
  const spinner = ora("Loading config...").start();
  const config = loadConfig(options.config);
  const runsPerTask = options.runs
    ? Number.parseInt(options.runs, 10)
    : config.eval.runs;
  const tasksPerTool = Number.parseInt(options.tasksPerTool, 10);
  spinner.succeed(
    `Config loaded: ${config.agent.name} (${config.agent.protocol.toUpperCase()})`,
  );

  // Step 2: Get API key
  const apiKey = await getApiKey();

  // Step 3: Connect and discover tools.
  // We keep one connection open for the entire eval — discovery, task gen, and execution.
  spinner.start(
    `Connecting to agent via ${config.agent.protocol.toUpperCase()}...`,
  );
  const adapter = createAdapter(config.agent.protocol, config.agent.endpoint);
  await adapter.connect();
  const tools = await adapter.listTools();
  spinner.succeed(`Discovered ${tools.length} tool(s)`);

  if (tools.length === 0) {
    console.log(chalk.yellow("No tools found. Nothing to evaluate."));
    await adapter.disconnect().catch(() => {});
    return;
  }

  // Step 4: Generate test tasks using Claude API
  spinner.start(
    `Generating ${tasksPerTool} test tasks per tool (${tools.length} tools)...`,
  );
  const tasks = await generateTasks(tools, config.agent.capabilities, {
    tasksPerTool,
    apiKey,
  });
  spinner.succeed(`Generated ${tasks.length} test tasks`);

  // Step 5: Execute tasks (reuse the same connection)
  const totalRuns = tasks.length * runsPerTask;
  spinner.start(
    `Executing ${totalRuns} runs (${tasks.length} tasks x ${runsPerTask} runs)...`,
  );
  const execution = await executeTasks(adapter, tasks, runsPerTask, {
    onRunComplete: (completed, total) => {
      spinner.text = `Executing runs... ${completed}/${total}`;
    },
  });
  spinner.succeed(
    `Executed ${execution.totalRuns} runs (${execution.totalSuccessful} successful)`,
  );

  // Step 6: Disconnect
  await adapter.disconnect().catch(() => {});

  // Step 8: Score results with LLM-as-judge
  spinner.start("Scoring results with LLM-as-judge...");
  const weights = {
    capability: config.eval.dimensions.capability.weight,
    reliability: config.eval.dimensions.reliability.weight,
    efficiency: config.eval.dimensions.efficiency.weight,
    safety: config.eval.dimensions.safety.weight,
    developer_experience: config.eval.dimensions.developer_experience.weight,
  };
  const scores = await scoreResults(execution.taskResults, {
    apiKey,
    weights,
    onTaskScored: (completed, total) => {
      spinner.text = `Scoring tasks... ${completed}/${total}`;
    },
  });
  spinner.succeed("Scoring complete");

  // Step 9: Generate and save report
  const report = buildReport(config, tools, execution, scores);
  const reportPath = saveReport(report, options.output);

  // Step 10: Display results
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
    console.log(chalk.dim(`  Full report: ${reportPath}`));
    console.log("");
  }
}
