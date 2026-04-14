import { describe, expect, it, vi } from "vitest";

// Mock all dependencies that the engine uses
vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify([
              {
                toolName: "test_tool",
                args: { input: "hello" },
                expectedBehavior: "Should work",
                difficulty: "basic",
              },
            ]),
          },
        ],
      }),
    };
  }
  return { default: MockAnthropic };
});

// Mock the MCP adapter factory
vi.mock("../src/protocols/factory.js", () => ({
  createAdapter: vi.fn().mockReturnValue({
    protocol: "mock",
    connect: vi.fn().mockResolvedValue(undefined),
    listTools: vi.fn().mockResolvedValue([
      {
        name: "test_tool",
        description: "A test tool",
        inputSchema: {
          type: "object",
          properties: { input: { type: "string" } },
        },
      },
    ]),
    invoke: vi.fn().mockResolvedValue({
      success: true,
      output: "test output",
      latencyMs: 50,
    }),
    disconnect: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock task store to avoid filesystem side effects
vi.mock("../src/eval/task-store.js", () => ({
  loadTaskSet: vi.fn().mockReturnValue(null),
  saveTaskSet: vi.fn().mockReturnValue({ version: "1.0.0" }),
}));

const { runEvaluation } = await import("../src/eval/engine.js");

describe("runEvaluation", () => {
  it("should run the full eval pipeline and return a report", async () => {
    const result = await runEvaluation({
      config: {
        agent: {
          name: "test-agent",
          version: "1.0.0",
          protocol: "mcp" as const,
          endpoint: "npx test",
          capabilities: ["general"],
        },
        eval: {
          runs: 1,
          dimensions: {
            capability: { weight: 0.3 },
            reliability: { weight: 0.25 },
            efficiency: { weight: 0.2 },
            safety: { weight: 0.15 },
            developer_experience: { weight: 0.1 },
          },
        },
      },
      apiKey: "test-key",
      tasksPerTool: 1,
      runsPerTask: 1,
    });

    expect(result.report).toBeDefined();
    expect(result.report.meta.agentName).toBe("test-agent");
    expect(result.report.scores.overall).toBeGreaterThanOrEqual(0);
    expect(result.report.scores.overall).toBeLessThanOrEqual(100);
    expect(result.report.tools).toHaveLength(1);
    expect(result.report.execution.totalTasks).toBeGreaterThan(0);
  });

  it("should call onProgress callback during pipeline", async () => {
    const progress = vi.fn();

    await runEvaluation({
      config: {
        agent: {
          name: "test",
          version: "1.0.0",
          protocol: "mcp" as const,
          endpoint: "npx test",
          capabilities: ["general"],
        },
        eval: {
          runs: 1,
          dimensions: {
            capability: { weight: 0.3 },
            reliability: { weight: 0.25 },
            efficiency: { weight: 0.2 },
            safety: { weight: 0.15 },
            developer_experience: { weight: 0.1 },
          },
        },
      },
      apiKey: "test-key",
      tasksPerTool: 1,
      runsPerTask: 1,
      onProgress: progress,
    });

    // Should have been called for connect, discover, generate, execute, score steps
    expect(progress).toHaveBeenCalled();
    const steps = progress.mock.calls.map(
      (call: [string, string]) => call[0],
    );
    expect(steps).toContain("connect");
    expect(steps).toContain("discover");
    expect(steps).toContain("generate");
    expect(steps).toContain("execute");
    expect(steps).toContain("score");
  });

  it("should save report to outputDir when specified", async () => {
    const result = await runEvaluation({
      config: {
        agent: {
          name: "test",
          version: "1.0.0",
          protocol: "mcp" as const,
          endpoint: "npx test",
          capabilities: ["general"],
        },
        eval: {
          runs: 1,
          dimensions: {
            capability: { weight: 0.3 },
            reliability: { weight: 0.25 },
            efficiency: { weight: 0.2 },
            safety: { weight: 0.15 },
            developer_experience: { weight: 0.1 },
          },
        },
      },
      apiKey: "test-key",
      tasksPerTool: 1,
      runsPerTask: 1,
      outputDir: "/tmp/engine-test-output",
    });

    expect(result.reportPath).toContain("report.json");
  });
});
