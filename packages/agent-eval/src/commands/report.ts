import chalk from "chalk";
import { Command } from "commander";

export const reportCommand = new Command("report")
  .description("View the latest evaluation report")
  .option("--json", "Output as JSON")
  .option("-o, --output <path>", "Save report to file")
  .action(async (_options) => {
    // TODO: Phase 1 implementation
    // 1. Find latest report in ./agent-eval-report/
    // 2. Display summary in terminal or save to file

    console.log(
      chalk.yellow("Report viewer not yet implemented. Coming in Phase 1."),
    );
  });
