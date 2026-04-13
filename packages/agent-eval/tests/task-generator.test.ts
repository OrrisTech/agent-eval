import { describe, expect, it, vi } from "vitest";
import type { ProtocolAdapter } from "../src/protocols/base.js";

// Mock the Anthropic SDK — must use class so `new Anthropic()` works
vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify([
              {
                toolName: "read_file",
                args: { path: "/tmp/test.txt" },
                expectedBehavior: "Should return file contents",
                difficulty: "basic",
              },
              {
                toolName: "read_file",
                args: { path: "/tmp/empty.txt" },
                expectedBehavior: "Should handle empty file",
                difficulty: "intermediate",
              },
            ]),
          },
        ],
      }),
    };
  }
  return { default: MockAnthropic };
});

// Import after mock is set up
const { generateTasks } = await import("../src/eval/task-generator.js");

describe("generateTasks", () => {
  it("should generate tasks for given tools", async () => {
    const tools = [
      {
        name: "read_file",
        description: "Read a file",
        inputSchema: {
          type: "object",
          properties: { path: { type: "string" } },
          required: ["path"],
        },
      },
    ];

    const tasks = await generateTasks(tools, ["file-operations"], {
      tasksPerTool: 2,
      apiKey: "test-key",
    });

    expect(tasks.length).toBe(2);
    expect(tasks[0]!.toolName).toBe("read_file");
    expect(tasks[0]!.args).toHaveProperty("path");
    expect(tasks[0]!.expectedBehavior).toBeTruthy();
    expect(["basic", "intermediate", "advanced", "adversarial"]).toContain(
      tasks[0]!.difficulty,
    );
  });

  it("should handle multiple tools", async () => {
    const tools = [
      { name: "tool_a", description: "Tool A", inputSchema: {} },
      { name: "tool_b", description: "Tool B", inputSchema: {} },
    ];

    const tasks = await generateTasks(tools, ["general"], {
      tasksPerTool: 2,
      apiKey: "test-key",
    });

    // Each tool generates 2 tasks (mocked to return 2 items)
    expect(tasks.length).toBe(4);
  });

  it("should run discovery probes when adapter is provided", async () => {
    const mockAdapter: ProtocolAdapter = {
      protocol: "mock",
      connect: vi.fn(),
      listTools: vi.fn(),
      invoke: vi.fn().mockResolvedValue({
        success: true,
        output: "file1.txt\nfile2.txt\ndir1/",
        latencyMs: 50,
      }),
      disconnect: vi.fn(),
    };

    const tools = [
      {
        name: "list_directory",
        description: "List files in a directory",
        inputSchema: {
          type: "object",
          properties: { path: { type: "string" } },
          required: ["path"],
        },
      },
    ];

    const tasks = await generateTasks(tools, ["file-operations"], {
      tasksPerTool: 2,
      apiKey: "test-key",
      adapter: mockAdapter,
    });

    // Discovery should have invoked the listing tool
    expect(mockAdapter.invoke).toHaveBeenCalled();
    // Tasks should still be generated
    expect(tasks.length).toBe(2);
  });

  it("should skip discovery for write/delete tools", async () => {
    const mockAdapter: ProtocolAdapter = {
      protocol: "mock",
      connect: vi.fn(),
      listTools: vi.fn(),
      invoke: vi.fn(),
      disconnect: vi.fn(),
    };

    const tools = [
      {
        name: "delete_file",
        description: "Delete a file from the filesystem",
        inputSchema: {
          type: "object",
          properties: { path: { type: "string" } },
          required: ["path"],
        },
      },
    ];

    await generateTasks(tools, ["file-operations"], {
      tasksPerTool: 2,
      apiKey: "test-key",
      adapter: mockAdapter,
    });

    // Should NOT invoke delete_file for discovery
    expect(mockAdapter.invoke).not.toHaveBeenCalled();
  });
});
