import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadTaskSet, saveTaskSet } from "../src/eval/task-store.js";
import type { TestTask } from "../src/eval/task-generator.js";

let testDir: string;

beforeEach(() => {
  testDir = mkdtempSync(join(tmpdir(), "agent-eval-test-"));
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

const sampleTasks: TestTask[] = [
  {
    toolName: "read_file",
    args: { path: "/tmp/test.txt" },
    expectedBehavior: "Should return file contents",
    difficulty: "basic",
  },
  {
    toolName: "read_file",
    args: { path: "../../etc/passwd" },
    expectedBehavior: "Should reject path traversal",
    difficulty: "adversarial",
  },
];

describe("saveTaskSet", () => {
  it("should create .agent-eval/tasks/ directory and save file", () => {
    const taskSet = saveTaskSet(
      testDir,
      "test-agent",
      ["read_file", "write_file"],
      sampleTasks,
      "claude-sonnet-4",
    );

    expect(taskSet.version).toBe("1.0.0");
    expect(taskSet.agentName).toBe("test-agent");
    expect(taskSet.tasks).toHaveLength(2);
    expect(taskSet.tools).toEqual(["read_file", "write_file"]);
    expect(taskSet.generatorModel).toBe("claude-sonnet-4");
  });

  it("should auto-increment version on subsequent saves", () => {
    const first = saveTaskSet(
      testDir,
      "test-agent",
      ["tool_a"],
      sampleTasks,
      "claude",
    );
    expect(first.version).toBe("1.0.0");

    const second = saveTaskSet(
      testDir,
      "test-agent",
      ["tool_a"],
      sampleTasks,
      "claude",
    );
    expect(second.version).toBe("1.0.1");

    const third = saveTaskSet(
      testDir,
      "test-agent",
      ["tool_a"],
      sampleTasks,
      "claude",
    );
    expect(third.version).toBe("1.0.2");
  });
});

describe("loadTaskSet", () => {
  it("should load a previously saved task set", () => {
    saveTaskSet(testDir, "my-agent", ["tool_a", "tool_b"], sampleTasks, "claude");

    const loaded = loadTaskSet(testDir, "my-agent", ["tool_a", "tool_b"]);
    expect(loaded).not.toBeNull();
    expect(loaded!.tasks).toHaveLength(2);
    expect(loaded!.agentName).toBe("my-agent");
  });

  it("should return null when tools don't match", () => {
    saveTaskSet(testDir, "my-agent", ["tool_a", "tool_b"], sampleTasks, "claude");

    // Different tools — should not load
    const loaded = loadTaskSet(testDir, "my-agent", ["tool_a", "tool_c"]);
    expect(loaded).toBeNull();
  });

  it("should return null when no files exist", () => {
    const loaded = loadTaskSet(testDir, "nonexistent", ["tool_a"]);
    expect(loaded).toBeNull();
  });

  it("should return null when directory doesn't exist", () => {
    const loaded = loadTaskSet("/nonexistent/path", "agent", ["tool_a"]);
    expect(loaded).toBeNull();
  });

  it("should match tools regardless of order", () => {
    saveTaskSet(testDir, "my-agent", ["tool_b", "tool_a"], sampleTasks, "claude");

    // Same tools, different order — should still match
    const loaded = loadTaskSet(testDir, "my-agent", ["tool_a", "tool_b"]);
    expect(loaded).not.toBeNull();
  });

  it("should load the latest version when multiple exist", () => {
    saveTaskSet(testDir, "my-agent", ["tool_a"], sampleTasks, "claude");
    saveTaskSet(testDir, "my-agent", ["tool_a"], sampleTasks, "claude");
    saveTaskSet(testDir, "my-agent", ["tool_a"], sampleTasks, "claude");

    const loaded = loadTaskSet(testDir, "my-agent", ["tool_a"]);
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe("1.0.2");
  });

  it("should round-trip tasks correctly", () => {
    saveTaskSet(testDir, "my-agent", ["read_file"], sampleTasks, "claude");

    const loaded = loadTaskSet(testDir, "my-agent", ["read_file"]);
    expect(loaded!.tasks).toEqual(sampleTasks);
  });
});
