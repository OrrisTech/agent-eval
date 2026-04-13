import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { AgentEvalConfig } from "./schema.js";

/**
 * Load and validate agent-eval.yaml from the given path.
 * Returns a fully validated AgentEvalConfig with defaults applied.
 * Throws descriptive errors for missing file, invalid YAML, or schema violations.
 */
export function loadConfig(configPath: string): AgentEvalConfig {
  const absolutePath = resolve(process.cwd(), configPath);

  if (!existsSync(absolutePath)) {
    throw new Error(
      `Config file not found: ${absolutePath}\nRun "agent-eval init" to create one.`,
    );
  }

  const raw = readFileSync(absolutePath, "utf-8");

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid YAML in ${absolutePath}:\n${message}`);
  }

  const result = AgentEvalConfig.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid config in ${absolutePath}:\n${issues}`);
  }

  return result.data;
}
