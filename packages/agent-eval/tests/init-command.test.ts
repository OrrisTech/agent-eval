import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  existsSync,
  readFileSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const TEST_DIR = join(import.meta.dirname, "__tmp_init_test__");
const CLI_PATH = join(import.meta.dirname, "..", "dist", "cli.js");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("agent-eval init command", () => {
  it("should create agent-eval.yaml in current directory", () => {
    execFileSync("node", [CLI_PATH, "init"], { cwd: TEST_DIR });

    const configPath = join(TEST_DIR, "agent-eval.yaml");
    expect(existsSync(configPath)).toBe(true);

    const content = readFileSync(configPath, "utf-8");
    expect(content).toContain("agent:");
    expect(content).toContain("protocol:");
    expect(content).toContain("eval:");
    expect(content).toContain("capabilities:");
  });

  it("should not overwrite existing config without --force", () => {
    const configPath = join(TEST_DIR, "agent-eval.yaml");
    writeFileSync(configPath, "original content", "utf-8");

    execFileSync("node", [CLI_PATH, "init"], { cwd: TEST_DIR });

    const content = readFileSync(configPath, "utf-8");
    expect(content).toBe("original content");
  });

  it("should overwrite existing config with --force", () => {
    const configPath = join(TEST_DIR, "agent-eval.yaml");
    writeFileSync(configPath, "original content", "utf-8");

    execFileSync("node", [CLI_PATH, "init", "--force"], { cwd: TEST_DIR });

    const content = readFileSync(configPath, "utf-8");
    expect(content).not.toBe("original content");
    expect(content).toContain("agent:");
  });

  it("should auto-detect from package.json if present", () => {
    const pkg = {
      name: "my-cool-agent",
      version: "2.0.0",
      dependencies: { "@modelcontextprotocol/sdk": "^1.0.0" },
    };
    writeFileSync(
      join(TEST_DIR, "package.json"),
      JSON.stringify(pkg),
      "utf-8"
    );

    execFileSync("node", [CLI_PATH, "init"], { cwd: TEST_DIR });

    const content = readFileSync(
      join(TEST_DIR, "agent-eval.yaml"),
      "utf-8"
    );
    expect(content).toContain("my-cool-agent");
    expect(content).toContain("2.0.0");
  });
});
