/**
 * Task set storage — save and load generated test tasks for deterministic re-runs.
 *
 * First evaluation generates tasks via Claude and saves them.
 * Subsequent runs reuse saved tasks (unless tools changed or --regenerate-tasks is used).
 *
 * Storage location: .agent-eval/tasks/ relative to the working directory.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { z } from "zod/v4";
import type { TestTask } from "./task-generator.js";

// Schema for validating saved task set files
const TaskSetSchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  generatorModel: z.string(),
  agentName: z.string(),
  tools: z.array(z.string()),
  tasks: z.array(
    z.object({
      toolName: z.string(),
      args: z.record(z.string(), z.any()),
      expectedBehavior: z.string(),
      difficulty: z.enum(["basic", "intermediate", "advanced", "adversarial"]),
    }),
  ),
});
export type TaskSet = z.infer<typeof TaskSetSchema>;

const TASKS_DIR = ".agent-eval/tasks";

/**
 * Load the latest task set if it exists and tool names match.
 * Returns null if no cached tasks, tools changed, or file is invalid.
 */
export function loadTaskSet(
  baseDir: string,
  agentName: string,
  toolNames: string[],
): TaskSet | null {
  const dir = join(baseDir, TASKS_DIR);
  if (!existsSync(dir)) return null;

  const latest = findLatestTaskSet(dir, agentName);
  if (!latest) return null;

  try {
    const raw = JSON.parse(readFileSync(latest, "utf-8"));
    const taskSet = TaskSetSchema.parse(raw);

    // Check if tools match (sorted comparison)
    const savedTools = [...taskSet.tools].sort();
    const currentTools = [...toolNames].sort();
    if (
      savedTools.length !== currentTools.length ||
      savedTools.some((t, i) => t !== currentTools[i])
    ) {
      return null; // Tools changed — need to regenerate
    }

    return taskSet;
  } catch {
    return null; // Invalid file — regenerate
  }
}

/**
 * Save a new task set with auto-incremented version.
 */
export function saveTaskSet(
  baseDir: string,
  agentName: string,
  toolNames: string[],
  tasks: TestTask[],
  generatorModel: string,
): TaskSet {
  const dir = join(baseDir, TASKS_DIR);
  mkdirSync(dir, { recursive: true });

  // Determine version
  const latestFile = findLatestTaskSet(dir, agentName);
  let version = "1.0.0";
  if (latestFile) {
    try {
      const existing = JSON.parse(readFileSync(latestFile, "utf-8"));
      version = bumpVersion(existing.version || "1.0.0");
    } catch {
      // Use default version
    }
  }

  const taskSet: TaskSet = {
    version,
    generatedAt: new Date().toISOString(),
    generatorModel,
    agentName,
    tools: [...toolNames].sort(),
    tasks,
  };

  const fileName = `${agentName}-v${version}.json`;
  writeFileSync(join(dir, fileName), JSON.stringify(taskSet, null, 2), "utf-8");

  return taskSet;
}

/**
 * Find the latest task set file for a given agent.
 * Files are named: {agentName}-v{version}.json
 */
function findLatestTaskSet(dir: string, agentName: string): string | null {
  try {
    const files = readdirSync(dir)
      .filter((f) => f.startsWith(`${agentName}-v`) && f.endsWith(".json"))
      .sort(); // Lexicographic sort — works for semver with same prefix

    const last = files[files.length - 1];
    if (!last) return null;
    return join(dir, last);
  } catch {
    return null;
  }
}

/** Bump patch version: "1.0.0" → "1.0.1" */
function bumpVersion(current: string): string {
  const parts = current.split(".").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return "1.0.1";
  const patch = (parts[2] ?? 0) + 1;
  return `${parts[0]}.${parts[1]}.${patch}`;
}
