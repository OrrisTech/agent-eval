import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { AgentSummary, AgentReport } from "./types";

// Resolve the results directory — works both locally and on Vercel
const RESULTS_DIR =
  process.env.RESULTS_DIR ??
  resolve(/* turbopackIgnore: true */ process.cwd(), "../../results");

/**
 * Get all evaluated agents sorted by score descending.
 * Reads from results/summary.json.
 */
export function getAllAgents(): AgentSummary[] {
  const summaryPath = join(RESULTS_DIR, "summary.json");
  if (!existsSync(summaryPath)) return [];

  const data: AgentSummary[] = JSON.parse(readFileSync(summaryPath, "utf-8"));
  return data
    .filter((a) => a.status === "success")
    .sort((a, b) => b.score - a.score);
}

/**
 * Get a single agent's full evaluation report.
 * Reads from results/{slug}/report.json.
 */
export function getAgent(slug: string): AgentReport | null {
  // Sanitize slug to prevent path traversal
  const safeName = slug.replace(/[^a-zA-Z0-9_-]/g, "");
  const reportPath = join(RESULTS_DIR, safeName, "report.json");
  if (!existsSync(reportPath)) return null;

  return JSON.parse(readFileSync(reportPath, "utf-8"));
}

/**
 * Get all agent slugs that have report data.
 * Used by generateStaticParams.
 */
export function getAllSlugs(): string[] {
  if (!existsSync(RESULTS_DIR)) return [];

  return readdirSync(RESULTS_DIR, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() &&
        existsSync(join(RESULTS_DIR, d.name, "report.json")),
    )
    .map((d) => d.name);
}
