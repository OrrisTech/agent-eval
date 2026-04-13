import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../src/config/loader.js";

const TEST_DIR = join(import.meta.dirname, "__tmp_loader_test__");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("should load and parse a valid YAML config", () => {
    const yaml = `
agent:
  name: test-agent
  protocol: mcp
  endpoint: "npx @test/agent"
  capabilities:
    - code-review
eval:
  runs: 30
`;
    const filePath = join(TEST_DIR, "agent-eval.yaml");
    writeFileSync(filePath, yaml);

    const config = loadConfig(filePath);
    expect(config.agent.name).toBe("test-agent");
    expect(config.agent.protocol).toBe("mcp");
    expect(config.eval.runs).toBe(30);
    // Defaults applied
    expect(config.eval.dimensions.capability.weight).toBe(0.3);
  });

  it("should throw on missing file", () => {
    expect(() => loadConfig("/nonexistent/agent-eval.yaml")).toThrow(
      "Config file not found"
    );
  });

  it("should throw on invalid YAML", () => {
    const filePath = join(TEST_DIR, "bad.yaml");
    writeFileSync(filePath, "{{{{not yaml");

    expect(() => loadConfig(filePath)).toThrow("Invalid YAML");
  });

  it("should throw on schema validation errors", () => {
    const yaml = `
agent:
  name: test
  protocol: invalid_protocol
  endpoint: "test"
  capabilities: []
eval:
  runs: 10
`;
    const filePath = join(TEST_DIR, "invalid.yaml");
    writeFileSync(filePath, yaml);

    expect(() => loadConfig(filePath)).toThrow("Invalid config");
  });
});
