import { describe, expect, it, vi } from "vitest";

// Mock Anthropic SDK for LLM-as-judge
vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify([
              {
                criterion: "A file was created",
                passed: true,
                reasoning: "The output shows a file was created",
              },
              {
                criterion: "Contains correct content",
                passed: true,
                reasoning: "The output matches expected content",
              },
            ]),
          },
        ],
      }),
    };
  }
  return { default: MockAnthropic };
});

const { runTaskEvaluation, percentile, parseUsageLine } = await import(
  "../src/eval/task-eval.js"
);

describe("runTaskEvaluation", () => {
  it("should evaluate a simple CLI agent task", async () => {
    const result = await runTaskEvaluation({
      config: {
        task: {
          name: "Echo test",
          description: "Echo hello world",
          success_criteria: [
            "A file was created",
            "Contains correct content",
          ],
        },
        agent: {
          type: "cli",
          command: "echo",
          args: ["hello world"],
        },
        eval: { timeout: 10, runs: 1 },
      },
      apiKey: "test-key",
    });

    expect(result.taskName).toBe("Echo test");
    expect(result.totalRuns).toBe(1);
    expect(result.runs[0]?.exitCode).toBe(0);
    expect(result.runs[0]?.durationMs).toBeGreaterThan(0);
    // LLM judge mock says both criteria passed
    expect(result.totalPassed).toBe(1);
    expect(result.successRate).toBe(1);
    expect(result.runs[0]?.criteriaResults).toHaveLength(2);
  });

  it("should handle agent failure (non-zero exit)", async () => {
    const result = await runTaskEvaluation({
      config: {
        task: {
          name: "Failing task",
          description: "This will fail",
          success_criteria: ["Should not pass"],
        },
        agent: {
          type: "cli",
          command: "false", // always exits 1
          args: [],
        },
        eval: { timeout: 10, runs: 1 },
      },
      apiKey: "test-key",
    });

    expect(result.totalRuns).toBe(1);
    expect(result.runs[0]?.exitCode).toBe(1);
  });

  it("should support multiple runs", async () => {
    const result = await runTaskEvaluation({
      config: {
        task: {
          name: "Multi-run test",
          description: "Run multiple times",
          success_criteria: ["Task completed"],
        },
        agent: {
          type: "cli",
          command: "echo",
          args: ["done"],
        },
        eval: { timeout: 10, runs: 3 },
      },
      apiKey: "test-key",
    });

    expect(result.totalRuns).toBe(3);
    expect(result.runs).toHaveLength(3);
    expect(result.avgDurationMs).toBeGreaterThan(0);
  });

  it("should replace {{description}} in agent args", async () => {
    const result = await runTaskEvaluation({
      config: {
        task: {
          name: "Template test",
          description: "Create a greeting",
          success_criteria: ["Greeting created"],
        },
        agent: {
          type: "cli",
          command: "echo",
          args: ["Task: {{description}}"],
        },
        eval: { timeout: 10, runs: 1 },
      },
      apiKey: "test-key",
    });

    // The echo output should contain the substituted description
    expect(result.runs[0]?.output).toContain("Create a greeting");
  });

  it("populates p50/p95 duration fields", async () => {
    const result = await runTaskEvaluation({
      config: {
        task: {
          name: "Percentile test",
          description: "Checks duration percentiles exist",
          success_criteria: ["Task completed"],
        },
        agent: {
          type: "cli",
          command: "echo",
          args: ["done"],
        },
        eval: { timeout: 10, runs: 3 },
      },
      apiKey: "test-key",
    });

    expect(result.p50DurationMs).toBeGreaterThanOrEqual(0);
    expect(result.p95DurationMs).toBeGreaterThanOrEqual(result.p50DurationMs);
    // avgCostUsd is 0 when the agent doesn't emit a USAGE line (like `echo`)
    expect(result.avgCostUsd).toBe(0);
  });
});

describe("percentile", () => {
  it("returns 0 for empty arrays", () => {
    expect(percentile([], 50)).toBe(0);
  });

  it("returns the single value when only one sample", () => {
    expect(percentile([42], 95)).toBe(42);
  });

  it("computes p50 of [1,2,3,4,5] as 3", () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
  });

  it("interpolates p95 of [10,20,30,40,50] near the top", () => {
    // rank = 0.95 * 4 = 3.8 → interpolates between 40 and 50 → 48
    expect(percentile([10, 20, 30, 40, 50], 95)).toBe(48);
  });

  it("handles unsorted input", () => {
    expect(percentile([5, 1, 4, 2, 3], 50)).toBe(3);
  });
});

describe("parseUsageLine", () => {
  it("returns null when no USAGE line is present", () => {
    expect(parseUsageLine("Task completed.\nCreated: foo.js")).toBeNull();
  });

  it("parses input/output tokens", () => {
    const parsed = parseUsageLine(
      "Created: foo.js\nUSAGE: input=1234 output=567",
    );
    expect(parsed).toEqual({ inputTokens: 1234, outputTokens: 567 });
  });

  it("parses input/output tokens + model", () => {
    const parsed = parseUsageLine(
      "Created: foo.js\nUSAGE: input=1234 output=567 model=claude-sonnet-4-6",
    );
    expect(parsed).toEqual({
      inputTokens: 1234,
      outputTokens: 567,
      model: "claude-sonnet-4-6",
    });
  });
});
