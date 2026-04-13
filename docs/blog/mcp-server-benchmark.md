---
title: "We Benchmarked 5 MCP Servers — Here's What We Found"
date: 2026-04-13
author: AgentHunter Eval
---

# We Benchmarked 5 MCP Servers — Here's What We Found

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
npx agent-eval init
npx agent-eval run
```

## Rankings

| Rank | Server | Category | Score | Capability | Reliability | Efficiency | Safety |
|------|--------|----------|-------|------------|-------------|------------|--------|
| 1 🥇 | **mcp-sequential-thinking** | Reasoning | **77** | 33 | 100 | 100 | 100 |
| 2 🥈 | **mcp-datetime** | Utilities | **75** | 52 | 73 | 100 | 92 |
| 3 🥉 | **context7** | Search | **73** | 44 | 100 | 88 | 67 |
| 4 | **mcp-everything** | Reference | **68** | 48 | 77 | 76 | 82 |
| 5 | **mcp-filesystem** | Filesystem | **62** | 54 | 14 | 100 | 100 |


## Key Findings

### 1. Reliability varies wildly

Of 5 servers tested, 2 achieved 80%+ reliability. However, 1 server(s) fell below 50%: **mcp-filesystem** (14%). Low reliability usually means the server crashes, times out, or returns errors for valid inputs.

### 2. Efficiency is generally excellent

Average latency across all servers was 879ms. 3/5 servers scored 90+ on efficiency, meaning sub-second response times. MCP's stdio transport is inherently fast since there's no network overhead.

### 3. Safety scores reveal gaps

2/5 servers scored a perfect 100 on safety. 1 scored below 70: **context7** (67). Lower safety scores indicate the server may be susceptible to prompt injection or may expose data outside its intended scope.

## Individual Results

### mcp-sequential-thinking

- **Category**: Reasoning
- **Score**: 77/100
- **Tools discovered**: 1
- **Tasks generated**: 3
- **Success rate**: 100%
- **Avg latency**: 2ms
- **Breakdown**: Cap 33 | Rel 100 | Eff 100 | Safe 100 | DX 70

### mcp-datetime

- **Category**: Utilities
- **Score**: 75/100
- **Tools discovered**: 10
- **Tasks generated**: 30
- **Success rate**: 73%
- **Avg latency**: 2ms
- **Breakdown**: Cap 52 | Rel 73 | Eff 100 | Safe 92 | DX 70

### context7

- **Category**: Search
- **Score**: 73/100
- **Tools discovered**: 2
- **Tasks generated**: 6
- **Success rate**: 100%
- **Avg latency**: 1642ms
- **Breakdown**: Cap 44 | Rel 100 | Eff 88 | Safe 67 | DX 70

### mcp-everything

- **Category**: Reference
- **Score**: 68/100
- **Tools discovered**: 13
- **Tasks generated**: 39
- **Success rate**: 77%
- **Avg latency**: 2747ms
- **Breakdown**: Cap 48 | Rel 77 | Eff 76 | Safe 82 | DX 70

### mcp-filesystem

- **Category**: Filesystem
- **Score**: 62/100
- **Tools discovered**: 14
- **Tasks generated**: 42
- **Success rate**: 14%
- **Avg latency**: 1ms
- **Breakdown**: Cap 54 | Rel 14 | Eff 100 | Safe 100 | DX 70



## Servers That Failed Evaluation

These servers could not be evaluated (connection failures, crashes, or missing dependencies):

- **mcp-memory** (Memory): - Loading config...
[32m✔[39m Config loaded: mcp-memory (MCP)
- Connecting to agent via MCP...
[3
- **mcp-fetch** (Web): - Loading config...
[32m✔[39m Config loaded: mcp-fetch (MCP)
- Connecting to agent via MCP...

Err
- **mcp-git** (DevTools): - Loading config...
[32m✔[39m Config loaded: mcp-git (MCP)
- Connecting to agent via MCP...
[32m✔
- **playwright-mcp** (Browser): - Loading config...
[32m✔[39m Config loaded: playwright-mcp (MCP)
- Connecting to agent via MCP...
- **mcp-puppeteer** (Browser): - Loading config...
[32m✔[39m Config loaded: mcp-puppeteer (MCP)
- Connecting to agent via MCP...

- **mcp-sqlite** (Database): - Loading config...
[32m✔[39m Config loaded: mcp-sqlite (MCP)
- Connecting to agent via MCP...

Er
- **notion-mcp** (Productivity): - Loading config...
[32m✔[39m Config loaded: notion-mcp (MCP)
- Connecting to agent via MCP...
[3



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

ANTHROPIC_API_KEY=your-key npx agent-eval run
```

## What's Next

We're expanding to evaluate A2A agents and REST API agents. If you'd like your MCP server benchmarked, [open an issue](https://github.com/OrrisTech/agent-eval/issues) or submit a PR to our server list.

---

*Evaluations run on 2026-04-13 using agent-eval v0.1.0. Scores may vary between runs due to LLM non-determinism. Full raw data available in the [results directory](https://github.com/OrrisTech/agent-eval/tree/main/results).*
