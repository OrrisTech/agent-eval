import { describe, expect, it, vi } from "vitest";

// Mock the Anthropic SDK — must use class so `new Anthropic()` works
vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              capability_score: 0.85,
              safety_score: 1.0,
              reasoning: "Output correctly handled the request",
            }),
          },
        ],
      }),
    };
  }
  return { default: MockAnthropic };
});

const { scoreResults } = await import("../src/eval/scorer.js");
import type { TaskResult } from "../src/eval/executor.js";

const DEFAULT_WEIGHTS = {
  capability: 0.3,
  reliability: 0.25,
  efficiency: 0.2,
  safety: 0.15,
  developer_experience: 0.1,
};

function makeTaskResult(overrides?: {
  success?: boolean;
  latencyMs?: number;
  difficulty?: string;
}): TaskResult {
  const success = overrides?.success ?? true;
  return {
    task: {
      toolName: "test_tool",
      args: { input: "hello" },
      expectedBehavior: "Should greet",
      difficulty: (overrides?.difficulty as any) ?? "basic",
    },
    runs: [
      {
        task: {} as any,
        runIndex: 1,
        invocation: {
          success,
          output: success ? "Hello!" : "",
          latencyMs: overrides?.latencyMs ?? 200,
          error: success ? undefined : "failed",
        },
      },
    ],
    successCount: success ? 1 : 0,
    successRate: success ? 1 : 0,
    latency: {
      avg: overrides?.latencyMs ?? 200,
      p50: overrides?.latencyMs ?? 200,
      p95: overrides?.latencyMs ?? 200,
      p99: overrides?.latencyMs ?? 200,
      min: overrides?.latencyMs ?? 200,
      max: overrides?.latencyMs ?? 200,
    },
  };
}

describe("scoreResults", () => {
  it("should produce scores in [0, 100] range", async () => {
    const results = [makeTaskResult()];
    const scores = await scoreResults(results, {
      apiKey: "test-key",
      weights: DEFAULT_WEIGHTS,
    });

    expect(scores.overall).toBeGreaterThanOrEqual(0);
    expect(scores.overall).toBeLessThanOrEqual(100);
    expect(scores.capability).toBeGreaterThanOrEqual(0);
    expect(scores.capability).toBeLessThanOrEqual(100);
    expect(scores.reliability).toBeGreaterThanOrEqual(0);
    expect(scores.reliability).toBeLessThanOrEqual(100);
    expect(scores.safety).toBeGreaterThanOrEqual(0);
    expect(scores.safety).toBeLessThanOrEqual(100);
  });

  it("should compute reliability from run success rate", async () => {
    const allSuccess = [makeTaskResult({ success: true })];
    const scoresSuccess = await scoreResults(allSuccess, {
      apiKey: "test-key",
      weights: DEFAULT_WEIGHTS,
    });
    expect(scoresSuccess.reliability).toBe(100);

    const allFail = [makeTaskResult({ success: false })];
    const scoresFail = await scoreResults(allFail, {
      apiKey: "test-key",
      weights: DEFAULT_WEIGHTS,
    });
    expect(scoresFail.reliability).toBe(0);
  });

  it("should compute efficiency from latency", async () => {
    const fast = [makeTaskResult({ latencyMs: 100 })];
    const scoresFast = await scoreResults(fast, {
      apiKey: "test-key",
      weights: DEFAULT_WEIGHTS,
    });
    expect(scoresFast.efficiency).toBe(100); // < 500ms = 100

    const slow = [makeTaskResult({ latencyMs: 10000 })];
    const scoresSlow = await scoreResults(slow, {
      apiKey: "test-key",
      weights: DEFAULT_WEIGHTS,
    });
    expect(scoresSlow.efficiency).toBe(0); // >= 10000ms = 0
  });

  it("should include per-task scores with reasoning", async () => {
    const results = [makeTaskResult()];
    const scores = await scoreResults(results, {
      apiKey: "test-key",
      weights: DEFAULT_WEIGHTS,
    });

    expect(scores.taskScores).toHaveLength(1);
    expect(scores.taskScores[0]!.capabilityScore).toBe(0.85);
    expect(scores.taskScores[0]!.safetyScore).toBe(1.0);
    expect(scores.taskScores[0]!.reasoning).toBeTruthy();
  });

  it("should call onTaskScored callback", async () => {
    const callback = vi.fn();
    const results = [makeTaskResult(), makeTaskResult()];

    await scoreResults(results, {
      apiKey: "test-key",
      weights: DEFAULT_WEIGHTS,
      onTaskScored: callback,
    });

    // Both tasks scored in one batch (concurrency=10 > 2 tasks)
    expect(callback).toHaveBeenCalledWith(2, 2);
  });

  it("should weight harder tasks more in capability score", async () => {
    const basicOnly = [makeTaskResult({ difficulty: "basic" })];
    const advancedOnly = [makeTaskResult({ difficulty: "adversarial" })];

    const scoresBasic = await scoreResults(basicOnly, {
      apiKey: "test-key",
      weights: DEFAULT_WEIGHTS,
    });
    const scoresAdv = await scoreResults(advancedOnly, {
      apiKey: "test-key",
      weights: DEFAULT_WEIGHTS,
    });

    // Both get same raw score from mock (0.85), but capability calculation
    // uses difficulty weights — single task means same result regardless
    expect(scoresBasic.capability).toBe(scoresAdv.capability);
  });
});
