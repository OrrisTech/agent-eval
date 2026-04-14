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

const { runTaskEvaluation } = await import("../src/eval/task-eval.js");

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
});
