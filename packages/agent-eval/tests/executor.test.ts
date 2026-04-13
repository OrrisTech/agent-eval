import { describe, expect, it, vi } from "vitest";
import { executeTasks } from "../src/eval/executor.js";
import type { ProtocolAdapter } from "../src/protocols/base.js";
import type { TestTask } from "../src/eval/task-generator.js";

// Create a mock adapter that returns configurable results
function createMockAdapter(
  overrides?: Partial<{ success: boolean; output: string; latencyMs: number }>
): ProtocolAdapter {
  return {
    protocol: "mock",
    connect: vi.fn(),
    listTools: vi.fn().mockResolvedValue([]),
    invoke: vi.fn().mockResolvedValue({
      success: overrides?.success ?? true,
      output: overrides?.output ?? "mock output",
      latencyMs: overrides?.latencyMs ?? 100,
    }),
    disconnect: vi.fn(),
  };
}

const sampleTask: TestTask = {
  toolName: "test_tool",
  args: { input: "hello" },
  expectedBehavior: "Should return a greeting",
  difficulty: "basic",
};

describe("executeTasks", () => {
  it("should execute tasks and collect results", async () => {
    const adapter = createMockAdapter();
    const result = await executeTasks(adapter, [sampleTask], 3);

    expect(result.totalRuns).toBe(3);
    expect(result.totalSuccessful).toBe(3);
    expect(result.overallSuccessRate).toBe(1);
    expect(result.taskResults).toHaveLength(1);
    expect(result.taskResults[0]!.runs).toHaveLength(3);
    expect(result.taskResults[0]!.successRate).toBe(1);
  });

  it("should handle failed invocations", async () => {
    const adapter = createMockAdapter({ success: false });
    const result = await executeTasks(adapter, [sampleTask], 2);

    expect(result.totalSuccessful).toBe(0);
    expect(result.overallSuccessRate).toBe(0);
    expect(result.taskResults[0]!.successRate).toBe(0);
  });

  it("should compute latency stats from successful runs", async () => {
    let callCount = 0;
    const adapter: ProtocolAdapter = {
      protocol: "mock",
      connect: vi.fn(),
      listTools: vi.fn(),
      invoke: vi.fn().mockImplementation(async () => {
        callCount++;
        return {
          success: true,
          output: "ok",
          // Vary latency: 100, 200, 300, 400, 500
          latencyMs: callCount * 100,
        };
      }),
      disconnect: vi.fn(),
    };

    const result = await executeTasks(adapter, [sampleTask], 5);
    const latency = result.taskResults[0]!.latency;

    expect(latency.min).toBe(100);
    expect(latency.max).toBe(500);
    expect(latency.avg).toBe(300);
  });

  it("should call onRunComplete callback", async () => {
    const adapter = createMockAdapter();
    const callback = vi.fn();

    await executeTasks(adapter, [sampleTask], 3, {
      onRunComplete: callback,
    });

    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenCalledWith(1, 3);
    expect(callback).toHaveBeenCalledWith(2, 3);
    expect(callback).toHaveBeenCalledWith(3, 3);
  });

  it("should handle empty task list", async () => {
    const adapter = createMockAdapter();
    const result = await executeTasks(adapter, [], 5);

    expect(result.totalRuns).toBe(0);
    expect(result.taskResults).toHaveLength(0);
  });
});
