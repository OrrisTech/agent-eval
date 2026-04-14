---
title: I Benchmarked 12 MCP Servers — Here's What I Found
published: false
description: I built an open-source eval framework and scored 12 popular MCP servers across capability, reliability, efficiency, and safety. The results were surprising.
tags: mcp, ai, agents, opensource
canonical_url: https://github.com/OrrisTech/agent-eval/blob/main/docs/blog/mcp-server-benchmark.md
cover_image:
---

The MCP ecosystem has exploded. 10,000+ servers on the registry, 97 million monthly SDK downloads — but nobody can tell you which MCP server is actually worth using.

I decided to find out.

I built [agent-eval](https://github.com/OrrisTech/agent-eval), an open-source framework that automatically benchmarks MCP servers. I pointed it at 12 popular servers and scored them on 5 dimensions.

Some results surprised me.

## TL;DR Rankings

| Rank | Server | Score | Reliability | Category |
|------|--------|-------|-------------|----------|
| 🥇 | **context7** | **89** | 100% | Search |
| 🥈 | **mcp-fetch** | **86** | 90% | Web |
| 🥉 | **mcp-memory** | **82** | 93% | Memory |
| 4 | **notion-mcp** | **82** | 97% | Productivity |
| 5 | **mcp-datetime** | **81** | 73% | Utilities |
| 6 | **mcp-everything** | **75** | 74% | Reference |
| 7 | **mcp-sequential-thinking** | **71** | 100% | Reasoning |
| 8 | **mcp-filesystem** | **68** | 14% | Filesystem |
| 9 | **playwright-mcp** | **68** | 30% | Browser |
| 10 | **mcp-sqlite** | **63** | 10% | Database |
| 11 | **mcp-git** | **55** | 4% | DevTools |
| 12 | **mcp-puppeteer** | **47** | 0% | Browser |

## How I tested

For each server, the framework:

1. **Connects** via stdio and discovers all available tools
2. **Generates test tasks** — Claude reads each tool's JSON Schema and creates test cases (basic, edge-case, adversarial)
3. **Executes tasks** multiple times to measure reliability
4. **Scores output quality** using LLM-as-judge (Claude Sonnet 4)
5. **Measures metrics** — latency, success rate, prompt injection resistance

Five dimensions, weighted:

| Dimension | Weight | What it measures |
|-----------|--------|------------------|
| **Capability** | 30% | Does the tool do what it says? |
| **Reliability** | 25% | Does it work every time? |
| **Efficiency** | 20% | How fast is it? |
| **Safety** | 15% | Can you trick it? |
| **Dev Experience** | 10% | Docs, error messages, schema quality |

## 3 things that surprised me

### 1. Reliability is the great divider

The gap between the best and worst is massive. **context7** and **mcp-sequential-thinking** hit 100% success rate. Meanwhile **mcp-puppeteer** scored 0% — every single task failed.

5 out of 12 servers couldn't even hit 50% reliability. Most failures weren't bugs — they were from tools receiving auto-generated arguments that didn't match real-world constraints (file paths that don't exist, git repos that aren't initialized).

This tells me something important: **MCP servers are only as reliable as the context they're given.** A filesystem server without files to read will always fail.

### 2. Safety is (mostly) a non-issue

9 out of 12 servers scored perfect 100 on safety. I tested prompt injection (malicious paths, injection attempts in arguments) and scope violations. Almost every server properly rejected out-of-scope requests.

The MCP protocol's design helps here — tools have typed schemas, so there's less surface for injection compared to free-text APIs.

### 3. Simple servers score higher

**context7** (2 tools, score 89) beat **notion-mcp** (22 tools, score 82). **mcp-sequential-thinking** (1 tool) scored higher than **mcp-git** (15 tools).

The pattern: servers that do one thing well score higher than Swiss Army knives. More tools = more surface area for failures.

## Try it yourself

```bash
# Create config for any MCP server
cat > agent-eval.yaml << 'EOF'
agent:
  name: "my-server"
  protocol: mcp
  endpoint: "npx -y @modelcontextprotocol/server-memory"
  capabilities: ["memory"]
eval:
  runs: 3
EOF

# Run evaluation
ANTHROPIC_API_KEY=your-key npx @agenthunter/eval run
```

Output looks like this:

```
  AgentHunter Eval v0.1.0
  Agent: mcp-memory v1.0.0 (MCP)
  Tools: 9 | Tasks: 27 | Runs: 27

  ────────────────────────────────────
  SCORE: 82 / 100
  ────────────────────────────────────

  Capability      ████████████░░░░░░░░  63%
  Reliability     ██████████████████░░  93%
  Efficiency      ████████████████████  100%
  Safety          █████████████████░░░  89%
  Dev Experience  ██████████████░░░░░░  70%
```

## Caveats

- **LLM non-determinism**: Scores vary ±5 points between runs because both task generation and judging use Claude. Deterministic task sets are coming in v0.2.
- **Auto-generated tasks**: The framework generates test tasks from tool schemas. For tools that need real-world context (file systems with actual files, databases with actual data), reliability scores will be lower than real-world usage.
- **DX score is a placeholder**: Developer Experience is scored at a flat 70 for now. Proper DX evaluation (docs quality, error message helpfulness) is coming.
- **Single model judge**: Using Claude to judge Claude-generated tasks has inherent bias. Multi-model judging is on the roadmap.

## What's next

- **A2A protocol support** — evaluate Google's Agent-to-Agent servers
- **Deterministic task sets** — curated test suites per category
- **Web dashboard** — browse rankings at eval.agenthunter.io
- **Continuous monitoring** — track score changes over time

The framework is fully open source: **[github.com/OrrisTech/agent-eval](https://github.com/OrrisTech/agent-eval)**

Raw evaluation data for all 12 servers is in the [results directory](https://github.com/OrrisTech/agent-eval/tree/main/results).

---

*I'm building [AgentHunter](https://agenthunter.io) — the quality layer for the AI agent economy. Independent evaluation, transparent methodology, open data. If you're building an MCP server, I'd love to benchmark it — [open an issue](https://github.com/OrrisTech/agent-eval/issues).*
