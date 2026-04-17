/**
 * Shields.io-style SVG badge endpoint.
 *
 * Usage:
 *   /badge/opus.svg                    → "task: 10/10"
 *   /badge/opus.svg?metric=task        → "task: 10/10"
 *   /badge/opus.svg?metric=score       → "score: 87"    (tool quality score)
 *   /badge/opus.svg?metric=pass        → "passes: 100%" (task pass rate)
 *
 * Agents that rank well can drop this into their README:
 *   ![AgentHunter](https://eval.agenthunter.io/badge/opus.svg?metric=task)
 *
 * Cached at the edge for 1h because rankings don't move per-request.
 */

import { NextResponse } from "next/server";
import { getAllAgents, getTaskSummary } from "@/lib/data";

type Metric = "task" | "pass" | "score";

const LABEL_BY_METRIC: Record<Metric, string> = {
  task: "agenthunter",
  pass: "pass rate",
  score: "agenthunter",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const url = new URL(request.url);
  const metric = (url.searchParams.get("metric") as Metric | null) ?? "task";

  // Strip the optional .svg suffix so /badge/opus.svg and /badge/opus both work
  const slug = rawSlug.replace(/\.svg$/, "");

  const { value, color } = resolveMetric(slug, metric);
  const label = LABEL_BY_METRIC[metric] ?? "agenthunter";

  const svg = renderBadge(label, value, color);

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Cache aggressively at CDN; shields.io uses ~300s, we use 1h because
      // rankings update on eval runs, not per minute.
      "Cache-Control":
        "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

/**
 * Resolve the metric value + colour for a given agent slug. Unknown slugs or
 * missing data return a neutral grey "unknown" badge instead of erroring, so
 * README badges never render as broken images.
 */
function resolveMetric(
  slug: string,
  metric: Metric,
): { value: string; color: string } {
  if (metric === "score") {
    const agents = getAllAgents();
    const agent = agents.find((a) => a.name === slug);
    if (!agent) return { value: "unknown", color: "#9f9f9f" };
    return { value: String(agent.score), color: colorForScore(agent.score) };
  }

  // task / pass metrics are derived from task-summary.json
  const summary = getTaskSummary();
  const agent = summary.find((a) => a.agent === slug);
  if (!agent) return { value: "unknown", color: "#9f9f9f" };

  const passCount = agent.tasks.filter((t) => t.passed).length;
  const total = agent.tasks.length;

  if (metric === "pass") {
    const pct = total > 0 ? Math.round((passCount / total) * 100) : 0;
    return { value: `${pct}%`, color: colorForPct(pct) };
  }

  // Default "task" metric: "N/M passed"
  return {
    value: `${passCount}/${total} tasks`,
    color: colorForPct(total > 0 ? (passCount / total) * 100 : 0),
  };
}

function colorForScore(score: number): string {
  if (score >= 85) return "#4c1"; // green
  if (score >= 70) return "#97ca00"; // lime
  if (score >= 50) return "#dfb317"; // yellow
  return "#e05d44"; // red
}

function colorForPct(pct: number): string {
  if (pct >= 95) return "#4c1";
  if (pct >= 75) return "#97ca00";
  if (pct >= 50) return "#dfb317";
  return "#e05d44";
}

/**
 * Render a shields.io-compatible badge. We approximate the classic "flat"
 * style with a fixed label background (#555) and a coloured value section.
 * Width is estimated from character count rather than actual font metrics
 * (tiny error, but keeps the renderer dependency-free).
 */
function renderBadge(label: string, value: string, color: string): string {
  const labelWidth = estimateTextWidth(label) + 10;
  const valueWidth = estimateTextWidth(value) + 10;
  const totalWidth = labelWidth + valueWidth;

  // Midpoints for centred text
  const labelMid = labelWidth / 2;
  const valueMid = labelWidth + valueWidth / 2;

  // Biome escapes angle brackets in comments; keep minimal & readable.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${escapeXml(label)}: ${escapeXml(value)}">
  <title>${escapeXml(label)}: ${escapeXml(value)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelMid}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
    <text x="${labelMid}" y="14">${escapeXml(label)}</text>
    <text x="${valueMid}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(value)}</text>
    <text x="${valueMid}" y="14">${escapeXml(value)}</text>
  </g>
</svg>`;
}

/**
 * Rough character-width estimator. Verdana at 11px averages ~6.5 units per
 * character with wider characters (M/W) around 9 and narrow ones (i/l) ~3.
 * We use 7 as a reasonable mean — a 1-2px padding miss is invisible on the
 * final badge.
 */
function estimateTextWidth(text: string): number {
  return Math.ceil(text.length * 7);
}

// Renamed from `escape` to avoid shadowing the global `window.escape`.
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
