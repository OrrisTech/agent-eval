/**
 * Blog post generator — reads evaluation results and generates a markdown article.
 *
 * Usage:
 *   npx tsx scripts/generate-blog.ts
 *
 * Reads: results/summary.json + results/{server}/report.json
 * Outputs: docs/blog/mcp-server-benchmark.md
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const RESULTS_DIR = join(ROOT_DIR, "results");
const BLOG_DIR = join(ROOT_DIR, "docs", "blog");

interface EvalSummary {
  name: string;
  category: string;
  score: number;
  capability: number;
  reliability: number;
  efficiency: number;
  safety: number;
  dx: number;
  tools: number;
  tasks: number;
  successRate: number;
  avgLatencyMs: number;
  status: "success" | "failed" | "skipped";
  error?: string;
}

// Load summary
const summaryPath = join(RESULTS_DIR, "summary.json");
if (!existsSync(summaryPath)) {
  console.error("No summary.json found. Run batch-eval.ts first.");
  process.exit(1);
}

const summaries: EvalSummary[] = JSON.parse(
  readFileSync(summaryPath, "utf-8"),
);
const successful = summaries.filter((s) => s.status === "success");
const failed = summaries.filter((s) => s.status === "failed");
const ranked = [...successful].sort((a, b) => b.score - a.score);

// Generate blog post
const now = new Date().toISOString().split("T")[0];

const markdown = `---
title: "We Benchmarked ${successful.length} MCP Servers — Here's What We Found"
date: ${now}
author: AgentHunter Eval
---

# We Benchmarked ${successful.length} MCP Servers — Here's What We Found

The Model Context Protocol (MCP) ecosystem has exploded — over 10,000 servers on the official registry, 97 million monthly SDK downloads. But which MCP servers are actually good?

We built [agent-eval](https://github.com/OrrisTech/agent-eval), an open-source evaluation framework, and used it to benchmark ${summaries.length} popular MCP servers across 5 dimensions: **Capability**, **Reliability**, **Efficiency**, **Safety**, and **Developer Experience**.

Here's what we found.

## Methodology

For each server, we:
1. Connected via stdio transport and discovered all available tools
2. Used Claude to auto-generate test tasks based on each tool's schema
3. Executed every task multiple times to measure reliability
4. Scored output quality using LLM-as-judge (Claude Sonnet 4)
5. Measured latency, success rate, and safety (prompt injection resistance)

All evaluation code is [open source](https://github.com/OrrisTech/agent-eval). You can reproduce these results yourself:

\`\`\`bash
npx @agenthunter/eval init
npx @agenthunter/eval run
\`\`\`

## Rankings

${generateRankingTable(ranked)}

## Key Findings

### 1. Reliability varies wildly

${generateReliabilityInsight(ranked)}

### 2. Efficiency is generally excellent

${generateEfficiencyInsight(ranked)}

### 3. Safety scores reveal gaps

${generateSafetyInsight(ranked)}

${generatePerServerDetails(ranked)}

${failed.length > 0 ? generateFailedSection(failed) : ""}

## How Scores Are Calculated

| Dimension | Weight | What we measure |
|-----------|--------|-----------------|
| **Capability** | 30% | Task completion rate + output quality (LLM-as-judge) |
| **Reliability** | 25% | Success rate across multiple runs |
| **Efficiency** | 20% | Response latency (sub-500ms = 100, >10s = 0) |
| **Safety** | 15% | Prompt injection resistance, scope violations |
| **Dev Experience** | 10% | Documentation quality, error messages, schema clarity |

**Overall Score** = weighted average of all dimensions, scaled to 0-100.

## Reproduce These Results

\`\`\`bash
git clone https://github.com/OrrisTech/agent-eval
cd agent-eval
bun install
bun run --filter agent-eval build

# Evaluate a single server
echo 'agent:
  name: "mcp-memory"
  protocol: mcp
  endpoint: "npx -y @modelcontextprotocol/server-memory"
  capabilities: ["memory"]
eval:
  runs: 3' > agent-eval.yaml

ANTHROPIC_API_KEY=your-key npx @agenthunter/eval run
\`\`\`

## What's Next

We're expanding to evaluate A2A agents and REST API agents. If you'd like your MCP server benchmarked, [open an issue](https://github.com/OrrisTech/agent-eval/issues) or submit a PR to our server list.

---

*Evaluations run on ${now} using agent-eval v0.3.1. Scores may vary between runs due to LLM non-determinism. Full raw data available in the [results directory](https://github.com/OrrisTech/agent-eval/tree/main/results).*
`;

mkdirSync(BLOG_DIR, { recursive: true });
const outPath = join(BLOG_DIR, "mcp-server-benchmark.md");
writeFileSync(outPath, markdown);
console.log(`Blog post generated: ${outPath}`);
console.log(`${successful.length} servers ranked, ${failed.length} failed.`);

// --- Helper functions ---

function generateRankingTable(servers: EvalSummary[]): string {
  let table =
    "| Rank | Server | Category | Score | Capability | Reliability | Efficiency | Safety |\n";
  table +=
    "|------|--------|----------|-------|------------|-------------|------------|--------|\n";

  servers.forEach((s, i) => {
    const medal = i === 0 ? " 🥇" : i === 1 ? " 🥈" : i === 2 ? " 🥉" : "";
    table += `| ${i + 1}${medal} | **${s.name}** | ${s.category} | **${s.score}** | ${s.capability} | ${s.reliability} | ${s.efficiency} | ${s.safety} |\n`;
  });

  return table;
}

function generateReliabilityInsight(servers: EvalSummary[]): string {
  const high = servers.filter((s) => s.reliability >= 80);
  const low = servers.filter((s) => s.reliability < 50);

  let text = `Of ${servers.length} servers tested, ${high.length} achieved 80%+ reliability. `;
  if (low.length > 0) {
    text += `However, ${low.length} server(s) fell below 50%: ${low.map((s) => `**${s.name}** (${s.reliability}%)`).join(", ")}. `;
    text += "Low reliability usually means the server crashes, times out, or returns errors for valid inputs.";
  } else {
    text += "No servers fell below 50%, indicating the ecosystem is maturing.";
  }
  return text;
}

function generateEfficiencyInsight(servers: EvalSummary[]): string {
  const avgLatency = servers.length > 0
    ? Math.round(
        servers.reduce((s, x) => s + x.avgLatencyMs, 0) / servers.length,
      )
    : 0;
  const fast = servers.filter((s) => s.efficiency >= 90);

  return `Average latency across all servers was ${avgLatency}ms. ${fast.length}/${servers.length} servers scored 90+ on efficiency, meaning sub-second response times. MCP's stdio transport is inherently fast since there's no network overhead.`;
}

function generateSafetyInsight(servers: EvalSummary[]): string {
  const perfect = servers.filter((s) => s.safety === 100);
  const low = servers.filter((s) => s.safety < 70);

  let text = `${perfect.length}/${servers.length} servers scored a perfect 100 on safety. `;
  if (low.length > 0) {
    text += `${low.length} scored below 70: ${low.map((s) => `**${s.name}** (${s.safety})`).join(", ")}. `;
    text +=
      "Lower safety scores indicate the server may be susceptible to prompt injection or may expose data outside its intended scope.";
  }
  return text;
}

function generatePerServerDetails(servers: EvalSummary[]): string {
  let text = "## Individual Results\n\n";

  for (const s of servers) {
    text += `### ${s.name}\n\n`;
    text += `- **Category**: ${s.category}\n`;
    text += `- **Score**: ${s.score}/100\n`;
    text += `- **Tools discovered**: ${s.tools}\n`;
    text += `- **Tasks generated**: ${s.tasks}\n`;
    text += `- **Success rate**: ${s.successRate}%\n`;
    text += `- **Avg latency**: ${s.avgLatencyMs}ms\n`;
    text += `- **Breakdown**: Cap ${s.capability} | Rel ${s.reliability} | Eff ${s.efficiency} | Safe ${s.safety} | DX ${s.dx}\n\n`;
  }

  return text;
}

function generateFailedSection(servers: EvalSummary[]): string {
  let text = "## Servers That Failed Evaluation\n\n";
  text +=
    "These servers could not be evaluated (connection failures, crashes, or missing dependencies):\n\n";
  for (const s of servers) {
    text += `- **${s.name}** (${s.category}): ${s.error?.slice(0, 100) || "Unknown error"}\n`;
  }
  text += "\n";
  return text;
}
