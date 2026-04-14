import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import chalk from "chalk";
import { Command } from "commander";

export const initCommand = new Command("init")
  .description("Initialize agent-eval.yaml configuration for your agent")
  .option("-f, --force", "Overwrite existing config file")
  .action((options) => {
    const configPath = resolve(process.cwd(), "agent-eval.yaml");

    if (existsSync(configPath) && !options.force) {
      console.log(
        chalk.yellow(
          "agent-eval.yaml already exists. Use --force to overwrite.",
        ),
      );
      return;
    }

    // Try to auto-detect agent info from package.json in current directory
    const detected = detectAgentInfo();
    const config = buildConfig(detected);

    writeFileSync(configPath, config, "utf-8");
    console.log(chalk.green("Created agent-eval.yaml"));

    if (detected.name !== "my-agent") {
      console.log(
        chalk.dim(`  Auto-detected: ${detected.name} (${detected.protocol})`),
      );
    }
    console.log(
      chalk.dim(
        "  Edit the file to configure your agent, then run: agent-eval run",
      ),
    );
  });

interface DetectedInfo {
  name: string;
  version: string;
  protocol: string;
  endpoint: string;
}

/**
 * Try to detect agent type and info from the current directory.
 * Checks package.json for MCP-related dependencies or bin entries.
 */
function detectAgentInfo(): DetectedInfo {
  const defaults: DetectedInfo = {
    name: "my-agent",
    version: "0.1.0",
    protocol: "mcp",
    endpoint: "npx @scope/my-agent",
  };

  const pkgPath = resolve(process.cwd(), "package.json");
  if (!existsSync(pkgPath)) return defaults;

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

    // Use package name and version if available
    const name = pkg.name ? String(pkg.name) : basename(process.cwd());
    const version = pkg.version ? String(pkg.version) : "0.1.0";

    // Detect protocol: check for MCP SDK dependency
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };
    const hasMcp = "@modelcontextprotocol/sdk" in allDeps;

    // Try to determine the endpoint from bin or main
    let endpoint = `npx ${name}`;
    if (pkg.bin) {
      const binName =
        typeof pkg.bin === "string" ? name : Object.keys(pkg.bin)[0] || name;
      endpoint = `npx ${binName}`;
    }

    return {
      name,
      version,
      protocol: hasMcp ? "mcp" : "mcp",
      endpoint,
    };
  } catch {
    return defaults;
  }
}

function buildConfig(info: DetectedInfo): string {
  return `# agent-eval.yaml — Agent evaluation configuration
# Docs: https://github.com/OrrisTech/agent-eval

agent:
  name: "${info.name}"
  version: "${info.version}"
  protocol: ${info.protocol}              # mcp | a2a | rest | executable
  endpoint: "${info.endpoint}"
  capabilities:
    - general

eval:
  runs: 20                    # Number of test runs for reliability scoring
  # judge:
  #   model: claude-sonnet-4-20250514   # Model used for LLM-as-judge scoring
  dimensions:
    capability:
      weight: 0.30
    reliability:
      weight: 0.25
    efficiency:
      weight: 0.20
    safety:
      weight: 0.15
    developer_experience:
      weight: 0.10
`;
}
