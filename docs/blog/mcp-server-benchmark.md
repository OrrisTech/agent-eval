---
title: "We Benchmarked 12 MCP Servers — Here's What We Found"
date: 2026-04-14
author: AgentHunter Eval
---

# We Benchmarked 12 MCP Servers — Here's What We Found

The Model Context Protocol (MCP) ecosystem has exploded — over 10,000 servers on the official registry, 97 million monthly SDK downloads. But which MCP servers are actually good?

We built [agent-eval](https://github.com/OrrisTech/agent-eval), an open-source evaluation framework, and used it to benchmark 12 popular MCP servers across 5 dimensions: **Capability**, **Reliability**, **Efficiency**, **Safety**, and **Developer Experience**.

Here's what we found.

## Methodology

For each server, we:
1. Connected via stdio transport and discovered all available tools
2. Used Claude to auto-generate test tasks based on each tool's schema
3. Executed every task multiple times to measure reliability
4. Scored output quality using LLM-as-judge (Claude Sonnet 4)
5. Measured latency, success rate, and safety (prompt injection resistance)

All evaluation code is [open source](https://github.com/OrrisTech/agent-eval). You can reproduce these results yourself:

```bash
npx @agenthunter/eval init
npx @agenthunter/eval run
```

## Rankings

| Rank | Server | Category | Score | Capability | Reliability | Efficiency | Safety |
|------|--------|----------|-------|------------|-------------|------------|--------|
| 1 🥇 | **context7** | Search | **89** | 83 | 100 | 87 | 100 |
| 2 🥈 | **mcp-fetch** | Web | **86** | 73 | 90 | 99 | 100 |
| 3 🥉 | **mcp-memory** | Memory | **82** | 63 | 93 | 100 | 89 |
| 4 | **notion-mcp** | Productivity | **82** | 55 | 97 | 98 | 100 |
| 5 | **mcp-datetime** | Utilities | **81** | 70 | 73 | 100 | 100 |
| 6 | **mcp-everything** | Reference | **75** | 66 | 74 | 78 | 97 |
| 7 | **mcp-sequential-thinking** | Reasoning | **71** | 15 | 100 | 100 | 100 |
| 8 | **mcp-filesystem** | Filesystem | **68** | 73 | 14 | 100 | 100 |
| 9 | **playwright-mcp** | Browser | **68** | 62 | 30 | 100 | 100 |
| 10 | **mcp-sqlite** | Database | **63** | 63 | 10 | 100 | 100 |
| 11 | **mcp-git** | DevTools | **55** | 40 | 4 | 100 | 98 |
| 12 | **mcp-puppeteer** | Browser | **47** | 51 | 0 | 50 | 100 |


## Key Findings

### 1. Reliability varies wildly

Of 12 servers tested, 5 achieved 80%+ reliability. However, 5 server(s) fell below 50%: **mcp-filesystem** (14%), **playwright-mcp** (30%), **mcp-sqlite** (10%), **mcp-git** (4%), **mcp-puppeteer** (0%). Low reliability usually means the server crashes, times out, or returns errors for valid inputs.

### 2. Efficiency is generally excellent

Average latency across all servers was 491ms. 9/12 servers scored 90+ on efficiency, meaning sub-second response times. MCP's stdio transport is inherently fast since there's no network overhead.

### 3. Safety scores reveal gaps

9/12 servers scored a perfect 100 on safety. 

## Individual Results

### context7

- **Category**: Search
- **Score**: 89/100
- **Tools discovered**: 2
- **Tasks generated**: 4
- **Success rate**: 100%
- **Avg latency**: 1756ms
- **Breakdown**: Cap 83 | Rel 100 | Eff 87 | Safe 100 | DX 70

### mcp-fetch

- **Category**: Web
- **Score**: 86/100
- **Tools discovered**: 5
- **Tasks generated**: 10
- **Success rate**: 90%
- **Avg latency**: 640ms
- **Breakdown**: Cap 73 | Rel 90 | Eff 99 | Safe 100 | DX 70

### mcp-memory

- **Category**: Memory
- **Score**: 82/100
- **Tools discovered**: 9
- **Tasks generated**: 27
- **Success rate**: 93%
- **Avg latency**: 1ms
- **Breakdown**: Cap 63 | Rel 93 | Eff 100 | Safe 89 | DX 70

### notion-mcp

- **Category**: Productivity
- **Score**: 82/100
- **Tools discovered**: 22
- **Tasks generated**: 44
- **Success rate**: 97%
- **Avg latency**: 643ms
- **Breakdown**: Cap 55 | Rel 97 | Eff 98 | Safe 100 | DX 70

### mcp-datetime

- **Category**: Utilities
- **Score**: 81/100
- **Tools discovered**: 10
- **Tasks generated**: 30
- **Success rate**: 73%
- **Avg latency**: 2ms
- **Breakdown**: Cap 70 | Rel 73 | Eff 100 | Safe 100 | DX 70

### mcp-everything

- **Category**: Reference
- **Score**: 75/100
- **Tools discovered**: 13
- **Tasks generated**: 39
- **Success rate**: 74%
- **Avg latency**: 2621ms
- **Breakdown**: Cap 66 | Rel 74 | Eff 78 | Safe 97 | DX 70

### mcp-sequential-thinking

- **Category**: Reasoning
- **Score**: 71/100
- **Tools discovered**: 1
- **Tasks generated**: 3
- **Success rate**: 100%
- **Avg latency**: 1ms
- **Breakdown**: Cap 15 | Rel 100 | Eff 100 | Safe 100 | DX 70

### mcp-filesystem

- **Category**: Filesystem
- **Score**: 68/100
- **Tools discovered**: 14
- **Tasks generated**: 28
- **Success rate**: 14%
- **Avg latency**: 1ms
- **Breakdown**: Cap 73 | Rel 14 | Eff 100 | Safe 100 | DX 70

### playwright-mcp

- **Category**: Browser
- **Score**: 68/100
- **Tools discovered**: 10
- **Tasks generated**: 20
- **Success rate**: 30%
- **Avg latency**: 212ms
- **Breakdown**: Cap 62 | Rel 30 | Eff 100 | Safe 100 | DX 70

### mcp-sqlite

- **Category**: Database
- **Score**: 63/100
- **Tools discovered**: 5
- **Tasks generated**: 10
- **Success rate**: 10%
- **Avg latency**: 1ms
- **Breakdown**: Cap 63 | Rel 10 | Eff 100 | Safe 100 | DX 70

### mcp-git

- **Category**: DevTools
- **Score**: 55/100
- **Tools discovered**: 15
- **Tasks generated**: 45
- **Success rate**: 4%
- **Avg latency**: 18ms
- **Breakdown**: Cap 40 | Rel 4 | Eff 100 | Safe 98 | DX 70

### mcp-puppeteer

- **Category**: Browser
- **Score**: 47/100
- **Tools discovered**: 7
- **Tasks generated**: 14
- **Success rate**: 0%
- **Avg latency**: 0ms
- **Breakdown**: Cap 51 | Rel 0 | Eff 50 | Safe 100 | DX 70





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

```bash
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
```

## What's Next

We're expanding to evaluate A2A agents and REST API agents. If you'd like your MCP server benchmarked, [open an issue](https://github.com/OrrisTech/agent-eval/issues) or submit a PR to our server list.

---

*Evaluations run on 2026-04-14 using agent-eval v0.1.0. Scores may vary between runs due to LLM non-determinism. Full raw data available in the [results directory](https://github.com/OrrisTech/agent-eval/tree/main/results).*
