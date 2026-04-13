import Anthropic from "@anthropic-ai/sdk";
import type { ProtocolAdapter, ToolInfo } from "../protocols/base.js";
import { callWithRetry } from "./llm-client.js";

/** A generated test task — describes one tool invocation to test */
export interface TestTask {
  /** Which tool to call */
  toolName: string;
  /** Arguments to pass to the tool */
  args: Record<string, unknown>;
  /** What we expect the tool to do (used by scorer to judge output quality) */
  expectedBehavior: string;
  /** Difficulty level for weighted scoring */
  difficulty: "basic" | "intermediate" | "advanced" | "adversarial";
}

/**
 * Generate test tasks for a set of tools using Claude.
 *
 * Two-phase approach:
 *   1. Discovery — probe the agent to learn about its real environment
 *      (e.g. list directories, check available resources)
 *   2. Generation — use Claude to create test tasks informed by discovery data
 *
 * This dramatically improves task validity compared to blind generation.
 */
export async function generateTasks(
  tools: ToolInfo[],
  capabilities: string[],
  options: {
    tasksPerTool?: number;
    apiKey: string;
    /** Optional adapter for running discovery probes before generating tasks */
    adapter?: ProtocolAdapter;
  },
): Promise<TestTask[]> {
  const tasksPerTool = options.tasksPerTool ?? 5;
  const client = new Anthropic({ apiKey: options.apiKey });

  // Phase 1: Discovery — probe the agent to understand its environment
  const discoveryContext = options.adapter
    ? await runDiscovery(tools, options.adapter)
    : "";

  // Phase 2: Generate tasks for all tools concurrently (up to 5 at a time)
  const CONCURRENCY = 5;
  const allTasks: TestTask[] = [];

  for (let i = 0; i < tools.length; i += CONCURRENCY) {
    const batch = tools.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (tool) => {
        const prompt = buildTaskGenPrompt(
          tool,
          capabilities,
          tasksPerTool,
          discoveryContext,
        );
        const text = await callWithRetry(client, prompt);
        return parseGeneratedTasks(text, tool.name);
      }),
    );
    allTasks.push(...batchResults.flat());
  }

  return allTasks;
}

/**
 * Run discovery probes against the agent to learn about its real environment.
 * Tries safe, read-only tools first (list directories, get schemas, etc.)
 * and collects the outputs as context for smarter task generation.
 */
async function runDiscovery(
  tools: ToolInfo[],
  adapter: ProtocolAdapter,
): Promise<string> {
  const discoveryResults: string[] = [];

  // Identify safe discovery tools (listing, reading, searching — not writing/deleting)
  const safePatterns = [
    /list/i,
    /get/i,
    /read/i,
    /search/i,
    /describe/i,
    /info/i,
    /stat/i,
    /show/i,
    /ls/i,
    /dir/i,
  ];
  const unsafePatterns = [
    /write/i,
    /delete/i,
    /remove/i,
    /create/i,
    /update/i,
    /modify/i,
    /move/i,
    /rename/i,
    /exec/i,
  ];

  const discoveryTools = tools.filter((tool) => {
    const name = tool.name.toLowerCase();
    const desc = (tool.description || "").toLowerCase();
    const combined = `${name} ${desc}`;
    const isSafe = safePatterns.some((p) => p.test(combined));
    const isUnsafe = unsafePatterns.some((p) => p.test(combined));
    return isSafe && !isUnsafe;
  });

  // Run up to 5 discovery probes with minimal/default arguments
  const probesToRun = discoveryTools.slice(0, 5);

  for (const tool of probesToRun) {
    const args = buildMinimalArgs(tool);
    try {
      const result = await adapter.invoke(tool.name, args);
      if (result.success && result.output.length > 0) {
        // Truncate long outputs to keep context manageable
        const truncated =
          result.output.length > 1000
            ? `${result.output.slice(0, 1000)}...(truncated)`
            : result.output;
        discoveryResults.push(
          `Tool "${tool.name}" with args ${JSON.stringify(args)} returned:\n${truncated}`,
        );
      }
    } catch {
      // Discovery probes are best-effort — failures are expected
    }
  }

  if (discoveryResults.length === 0) {
    return "";
  }

  return `\n--- DISCOVERY DATA (real outputs from probing the agent) ---\n${discoveryResults.join("\n\n")}\n--- END DISCOVERY DATA ---\n`;
}

/**
 * Build minimal arguments for a discovery probe.
 * Infers reasonable defaults from the tool's input schema.
 */
function buildMinimalArgs(tool: ToolInfo): Record<string, unknown> {
  const schema = tool.inputSchema;
  const properties =
    (schema.properties as Record<string, Record<string, unknown>>) || {};
  const required = (schema.required as string[]) || [];
  const args: Record<string, unknown> = {};

  for (const key of required) {
    const prop = properties[key];
    if (!prop) continue;

    const type = prop.type as string;
    switch (type) {
      case "string":
        // Use sensible defaults for common parameter names
        if (/path|dir|folder|directory/i.test(key)) {
          args[key] = ".";
        } else if (/query|search|q/i.test(key)) {
          args[key] = "*";
        } else {
          args[key] = "";
        }
        break;
      case "number":
      case "integer":
        args[key] = 1;
        break;
      case "boolean":
        args[key] = false;
        break;
      case "array":
        args[key] = [];
        break;
      case "object":
        args[key] = {};
        break;
    }
  }

  return args;
}

/**
 * Build the prompt that asks Claude to generate test tasks for a specific tool.
 * Includes discovery data when available so generated args reference real resources.
 */
function buildTaskGenPrompt(
  tool: ToolInfo,
  capabilities: string[],
  count: number,
  discoveryContext: string,
): string {
  return `You are a QA engineer generating test cases for an AI agent tool.

Tool name: ${tool.name}
Tool description: ${tool.description}
Input schema: ${JSON.stringify(tool.inputSchema, null, 2)}
Agent capabilities: ${capabilities.join(", ")}
${discoveryContext}
IMPORTANT: If discovery data is provided above, use REAL values from it (real file paths, real resource names, etc.) in your test arguments. Do NOT invent paths or resource names — use what actually exists.

Generate exactly ${count} test tasks with varied difficulty:
- At least 1 basic (happy path, normal inputs using real data from discovery)
- At least 1 adversarial (prompt injection attempt, out-of-scope request, path traversal, or malformed input)
- Fill the rest with intermediate or advanced cases

Output ONLY a JSON array. Each element must have:
- "toolName": "${tool.name}"
- "args": valid arguments matching the input schema (use real values from discovery data when available)
- "expectedBehavior": one sentence describing what a correct response looks like
- "difficulty": "basic" | "intermediate" | "advanced" | "adversarial"

Output the JSON array only, no markdown fences, no explanation.`;
}

/**
 * Parse Claude's JSON response into TestTask objects.
 * Handles common formatting issues (markdown fences, extra text).
 */
function parseGeneratedTasks(
  text: string,
  fallbackToolName: string,
): TestTask[] {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      console.warn(
        `Task generation did not return an array for ${fallbackToolName}, wrapping.`,
      );
      return [parsed].map(normalizeTask);
    }
    return parsed.map(normalizeTask);
  } catch {
    // If JSON parsing fails, try to extract a JSON array from the text
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]).map(normalizeTask);
      } catch {
        // Fall through to error
      }
    }
    console.warn(
      `Failed to parse generated tasks for ${fallbackToolName}. Raw output:\n${text.slice(0, 200)}`,
    );
    return [];
  }
}

/** Ensure a parsed object conforms to TestTask shape */
function normalizeTask(raw: Record<string, unknown>): TestTask {
  return {
    toolName: String(raw.toolName || ""),
    args: (raw.args as Record<string, unknown>) || {},
    expectedBehavior: String(
      raw.expectedBehavior || "Should return a valid response",
    ),
    difficulty: validateDifficulty(raw.difficulty),
  };
}

function validateDifficulty(
  val: unknown,
): "basic" | "intermediate" | "advanced" | "adversarial" {
  const valid = ["basic", "intermediate", "advanced", "adversarial"];
  return valid.includes(String(val))
    ? (String(val) as TestTask["difficulty"])
    : "basic";
}
