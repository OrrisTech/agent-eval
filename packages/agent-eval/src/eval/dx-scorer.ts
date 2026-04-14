/**
 * Developer Experience (DX) scoring — evaluates MCP server quality
 * from a developer's perspective using data already collected during eval.
 *
 * Three sub-scores, no LLM calls needed:
 *   1. Schema Quality (40%) — are tool input schemas well-defined?
 *   2. Documentation (30%) — do tools have meaningful descriptions?
 *   3. Error Messages (30%) — are error messages helpful when tools fail?
 */

import type { ToolInfo } from "../protocols/base.js";
import type { TaskResult } from "./executor.js";

export interface DxSubScores {
  schemaQuality: number; // 0-100
  documentation: number; // 0-100
  errorMessages: number; // 0-100
  overall: number; // 0-100
}

/**
 * Compute the DX score from tools metadata and execution results.
 * Pure function — no LLM calls, no async, no side effects.
 */
export function computeDxScore(
  tools: ToolInfo[],
  taskResults: TaskResult[],
): DxSubScores {
  const schemaQuality = scoreSchemaQuality(tools);
  const documentation = scoreDocumentation(tools);
  const errorMessages = scoreErrorMessages(taskResults);

  // Weighted combination: schema 40%, docs 30%, errors 30%
  const overall = Math.round(
    schemaQuality * 0.4 + documentation * 0.3 + errorMessages * 0.3,
  );

  return { schemaQuality, documentation, errorMessages, overall };
}

/**
 * Score how well tool input schemas are defined.
 * Checks: properties exist, types declared, descriptions present, required fields specified.
 */
export function scoreSchemaQuality(tools: ToolInfo[]): number {
  if (tools.length === 0) return 50; // Neutral for no tools

  let totalScore = 0;

  for (const tool of tools) {
    const schema = tool.inputSchema;
    let toolScore = 0;
    let checks = 0;

    // Check 1: Has properties defined (not empty schema)
    const properties =
      (schema.properties as Record<string, Record<string, unknown>>) || {};
    const propCount = Object.keys(properties).length;
    checks++;
    if (propCount > 0) toolScore++;

    // Check 2: Properties have types declared
    if (propCount > 0) {
      const withType = Object.values(properties).filter(
        (p) => p.type !== undefined,
      ).length;
      checks++;
      toolScore += withType / propCount;
    }

    // Check 3: Properties have descriptions
    if (propCount > 0) {
      const withDesc = Object.values(properties).filter(
        (p) => typeof p.description === "string" && p.description.length > 0,
      ).length;
      checks++;
      toolScore += withDesc / propCount;
    }

    // Check 4: Required fields specified
    const required = schema.required as string[] | undefined;
    checks++;
    if (Array.isArray(required) && required.length > 0) toolScore++;

    totalScore += checks > 0 ? toolScore / checks : 0;
  }

  return Math.round((totalScore / tools.length) * 100);
}

/**
 * Score how well tools are documented.
 * Checks: description exists, is meaningful (>20 chars), explains behavior.
 */
export function scoreDocumentation(tools: ToolInfo[]): number {
  if (tools.length === 0) return 50;

  let totalScore = 0;

  for (const tool of tools) {
    let toolScore = 0;

    // Check 1: Has a non-empty description
    const desc = tool.description || "";
    if (desc.length > 0) toolScore += 0.4;

    // Check 2: Description is meaningful (> 20 chars)
    if (desc.length > 20) toolScore += 0.3;

    // Check 3: Description explains behavior (contains action words)
    if (desc.length > 0) {
      const actionPatterns =
        /\b(returns?|creates?|gets?|sets?|lists?|reads?|writes?|deletes?|updates?|searches?|sends?|fetches?|generates?|computes?|validates?|converts?|handles?|manages?|provides?)\b/i;
      if (actionPatterns.test(desc)) toolScore += 0.3;
    }

    totalScore += toolScore;
  }

  return Math.round((totalScore / tools.length) * 100);
}

/**
 * Score error message quality from failed task runs.
 * Checks: errors are informative (not empty), structured (not raw stack traces).
 * If no failures occurred, return neutral score (70) — no error data to evaluate.
 */
export function scoreErrorMessages(taskResults: TaskResult[]): number {
  // Collect all error messages from failed runs
  const errors: string[] = [];
  for (const tr of taskResults) {
    for (const run of tr.runs) {
      if (!run.invocation.success && run.invocation.error) {
        errors.push(run.invocation.error);
      }
    }
  }

  // No failures — can't evaluate error quality, give neutral score
  if (errors.length === 0) return 70;

  let totalScore = 0;

  for (const error of errors) {
    let errorScore = 0;

    // Check 1: Error message is not empty
    if (error.length > 0) errorScore += 0.3;

    // Check 2: Error message is descriptive (> 10 chars)
    if (error.length > 10) errorScore += 0.3;

    // Check 3: Error is structured (not a raw stack trace)
    // Raw stack traces contain "at " lines and file paths — penalize these
    const stackTraceLines = error
      .split("\n")
      .filter((line) => /^\s+at\s/.test(line)).length;
    const totalLines = error.split("\n").length;
    if (totalLines > 0 && stackTraceLines / totalLines < 0.5) {
      errorScore += 0.4;
    }

    totalScore += errorScore;
  }

  return Math.round((totalScore / errors.length) * 100);
}
