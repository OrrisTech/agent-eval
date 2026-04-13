import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { reportCommand } from "./commands/report.js";
import { runCommand } from "./commands/run.js";

// The MCP SDK can throw unhandled rejections when transports disconnect
// unexpectedly. Catch them here to prevent crashing the CLI.
process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  // Ignore known MCP transport errors — they're handled at the adapter level
  if (msg.includes("Connection") || msg.includes("transport")) return;
  // For unexpected errors, re-throw to crash with a stack trace
  throw reason;
});

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
