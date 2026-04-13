import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { reportCommand } from "./commands/report.js";
import { runCommand } from "./commands/run.js";

const program = new Command();

program
  .name("agent-eval")
  .description(
    "Open-source AI agent evaluation framework — benchmark MCP servers, A2A agents, and API-first agent services",
  )
  .version("0.1.0");

// Register subcommands
program.addCommand(initCommand);
program.addCommand(runCommand);
program.addCommand(reportCommand);

program.parse();
