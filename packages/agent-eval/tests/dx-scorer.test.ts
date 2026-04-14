import { describe, expect, it } from "vitest";
import {
  computeDxScore,
  scoreSchemaQuality,
  scoreDocumentation,
  scoreErrorMessages,
} from "../src/eval/dx-scorer.js";
import type { ToolInfo } from "../src/protocols/base.js";
import type { TaskResult } from "../src/eval/executor.js";

// Helper: create a tool with configurable schema quality
function makeTool(overrides?: {
  name?: string;
  description?: string;
  properties?: Record<string, Record<string, unknown>>;
  required?: string[];
}): ToolInfo {
  return {
    name: overrides?.name ?? "test_tool",
    description: overrides?.description ?? "",
    inputSchema: {
      type: "object",
      properties: overrides?.properties ?? {},
      required: overrides?.required,
    },
  };
}

// Helper: create a task result with configurable success/error
function makeTaskResult(runs: Array<{ success: boolean; error?: string }>): TaskResult {
  return {
    task: {
      toolName: "test",
      args: {},
      expectedBehavior: "test",
      difficulty: "basic",
    },
    runs: runs.map((r, i) => ({
      task: {} as any,
      runIndex: i + 1,
      invocation: {
        success: r.success,
        output: r.success ? "ok" : "",
        latencyMs: 100,
        error: r.error,
      },
    })),
    successCount: runs.filter((r) => r.success).length,
    successRate: runs.filter((r) => r.success).length / runs.length,
    latency: { avg: 100, p50: 100, p95: 100, p99: 100, min: 100, max: 100 },
  };
}

describe("scoreSchemaQuality", () => {
  it("should score well-defined schemas high", () => {
    const tools = [
      makeTool({
        properties: {
          path: { type: "string", description: "File path to read" },
          encoding: { type: "string", description: "File encoding" },
        },
        required: ["path"],
      }),
    ];
    const score = scoreSchemaQuality(tools);
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it("should score empty schemas low", () => {
    const tools = [makeTool({ properties: {} })];
    const score = scoreSchemaQuality(tools);
    expect(score).toBeLessThan(50);
  });

  it("should score schemas without descriptions lower than with", () => {
    const withDesc = [
      makeTool({
        properties: {
          path: { type: "string", description: "The file path" },
        },
        required: ["path"],
      }),
    ];
    const withoutDesc = [
      makeTool({
        properties: {
          path: { type: "string" },
        },
        required: ["path"],
      }),
    ];
    expect(scoreSchemaQuality(withDesc)).toBeGreaterThan(
      scoreSchemaQuality(withoutDesc),
    );
  });

  it("should return 50 for empty tools array", () => {
    expect(scoreSchemaQuality([])).toBe(50);
  });
});

describe("scoreDocumentation", () => {
  it("should score tools with detailed descriptions high", () => {
    const tools = [
      makeTool({
        description:
          "Reads the complete contents of a file from the filesystem and returns it as text",
      }),
    ];
    const score = scoreDocumentation(tools);
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it("should score tools with empty descriptions low", () => {
    const tools = [makeTool({ description: "" })];
    const score = scoreDocumentation(tools);
    expect(score).toBe(0);
  });

  it("should score short descriptions lower than detailed ones", () => {
    const detailed = [
      makeTool({
        description: "Fetches a web page and returns its content as markdown",
      }),
    ];
    const short = [makeTool({ description: "Fetch page" })];
    expect(scoreDocumentation(detailed)).toBeGreaterThan(
      scoreDocumentation(short),
    );
  });

  it("should return 50 for empty tools array", () => {
    expect(scoreDocumentation([])).toBe(50);
  });
});

describe("scoreErrorMessages", () => {
  it("should return 70 when there are no failures", () => {
    const results = [makeTaskResult([{ success: true }])];
    expect(scoreErrorMessages(results)).toBe(70);
  });

  it("should score descriptive error messages high", () => {
    const results = [
      makeTaskResult([
        {
          success: false,
          error: "File not found: /path/to/file.txt. Please check the path exists.",
        },
      ]),
    ];
    const score = scoreErrorMessages(results);
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it("should score short error messages lower than descriptive ones", () => {
    const shortError = [
      makeTaskResult([{ success: false, error: "err" }]),
    ];
    const descriptiveError = [
      makeTaskResult([
        { success: false, error: "File not found: /path/to/file.txt" },
      ]),
    ];
    expect(scoreErrorMessages(descriptiveError)).toBeGreaterThan(
      scoreErrorMessages(shortError),
    );
  });

  it("should penalize raw stack traces", () => {
    const structured = [
      makeTaskResult([
        { success: false, error: "Invalid argument: path must be a string" },
      ]),
    ];
    const stackTrace = [
      makeTaskResult([
        {
          success: false,
          error:
            "Error: fail\n  at Object.read (/src/fs.js:10:5)\n  at main (/src/index.js:3:1)\n  at Module._compile (internal:1:1)",
        },
      ]),
    ];
    expect(scoreErrorMessages(structured)).toBeGreaterThan(
      scoreErrorMessages(stackTrace),
    );
  });
});

describe("computeDxScore", () => {
  it("should combine sub-scores with correct weights", () => {
    const tools = [
      makeTool({
        description: "Reads files from the filesystem and returns contents",
        properties: {
          path: { type: "string", description: "File path" },
        },
        required: ["path"],
      }),
    ];
    const results = [makeTaskResult([{ success: true }])];

    const dx = computeDxScore(tools, results);
    expect(dx.overall).toBeGreaterThan(0);
    expect(dx.overall).toBeLessThanOrEqual(100);
    expect(dx.schemaQuality).toBeGreaterThan(0);
    expect(dx.documentation).toBeGreaterThan(0);
    expect(dx.errorMessages).toBe(70); // No failures → neutral
  });

  it("should produce different scores for different quality levels", () => {
    const goodTools = [
      makeTool({
        description: "Creates a new entity in the knowledge graph with the specified properties",
        properties: {
          name: { type: "string", description: "Entity name" },
          type: { type: "string", description: "Entity type" },
        },
        required: ["name"],
      }),
    ];
    const badTools = [makeTool({ description: "", properties: {} })];
    const results = [makeTaskResult([{ success: true }])];

    const goodDx = computeDxScore(goodTools, results);
    const badDx = computeDxScore(badTools, results);
    expect(goodDx.overall).toBeGreaterThan(badDx.overall);
  });
});
