import { describe, expect, it } from "vitest";
import { TaskEvalConfig } from "../src/config/task-schema.js";

describe("TaskEvalConfig schema", () => {
  it("should parse a valid task config", () => {
    const input = {
      task: {
        name: "Create a file",
        description: "Create a file called hello.txt with content Hello World",
        success_criteria: [
          "A file named hello.txt exists",
          "The file contains Hello World",
        ],
      },
      agent: {
        type: "cli",
        command: "my-agent",
        args: ["--task", "{{description}}"],
      },
    };

    const result = TaskEvalConfig.parse(input);
    expect(result.task.name).toBe("Create a file");
    expect(result.task.success_criteria).toHaveLength(2);
    expect(result.agent.type).toBe("cli");
    expect(result.agent.command).toBe("my-agent");
    // Defaults applied
    expect(result.eval.timeout).toBe(300);
    expect(result.eval.runs).toBe(1);
  });

  it("should reject missing task name", () => {
    const input = {
      task: {
        description: "Do something",
        success_criteria: ["Something happened"],
      },
      agent: { type: "cli", command: "test" },
    };

    expect(() => TaskEvalConfig.parse(input)).toThrow();
  });

  it("should reject empty success criteria", () => {
    const input = {
      task: {
        name: "Test",
        description: "Do something",
        success_criteria: [],
      },
      agent: { type: "cli", command: "test" },
    };

    expect(() => TaskEvalConfig.parse(input)).toThrow();
  });

  it("should accept custom eval settings", () => {
    const input = {
      task: {
        name: "Test",
        description: "Do something",
        success_criteria: ["Done"],
      },
      agent: { type: "cli", command: "test" },
      eval: { timeout: 60, runs: 5 },
    };

    const result = TaskEvalConfig.parse(input);
    expect(result.eval.timeout).toBe(60);
    expect(result.eval.runs).toBe(5);
  });

  it("should support api agent type", () => {
    const input = {
      task: {
        name: "Test",
        description: "Do something",
        success_criteria: ["Done"],
      },
      agent: {
        type: "api",
        command: "https://api.example.com/agent",
      },
    };

    const result = TaskEvalConfig.parse(input);
    expect(result.agent.type).toBe("api");
  });
});
