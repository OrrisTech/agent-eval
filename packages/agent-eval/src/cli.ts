import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { reportCommand } from "./commands/report.js";
import { taskCommand } from "./commands/task.js";
import { toolCommand } from "./commands/tool.js";

// The MCP SDK can throw unhandled rejections when transports disconnect
// unexpectedly. Catch them here to prevent crashing the CLI.
process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  if (msg.includes("Connection") || msg.includes("transport")) return;
  throw reason;
});

const program = new Command();

program
  .name("agent-eval")
  .description(
    "Open-source AI agent evaluation platform — evaluate agents on real tasks, benchmark tools on quality",
  )
  .version("0.3.1");

// Primary commands
program.addCommand(taskCommand);
program.addCommand(toolCommand);

// Utilities
program.addCommand(initCommand);
program.addCommand(reportCommand);

// Backward compatibility: `agent-eval run` = `agent-eval tool`
const runAlias = new Command("run")
  .description("Alias for 'tool' — evaluate an MCP server (backward compat)")
  .allowUnknownOption(true)
  .action(async (_options, cmd) => {
    // Forward all args to the tool command
    const argv = ["node", "agent-eval", "tool", ...cmd.args];
    await program.parseAsync(argv);
  });
program.addCommand(runAlias, { hidden: true });

program.parse();
