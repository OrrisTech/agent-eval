---
title: I Benchmarked 12 MCP Servers — Here's What I Found
published: false
description: I built an open-source eval framework and scored 12 popular MCP servers across capability, reliability, efficiency, and safety. The results were surprising.
tags: mcp, ai, agents, opensource
canonical_url: https://github.com/OrrisTech/agent-eval/blob/main/docs/blog/mcp-server-benchmark.md
cover_image:
---

*Evaluated on April 15, 2026 using [AgentHunter Eval](https://eval.agenthunter.io) v0.3.1*

The MCP ecosystem has exploded. 10,000+ servers on the registry, 97 million monthly SDK downloads — but nobody can tell you which MCP server is actually worth using.

I decided to find out.

I built [agent-eval](https://github.com/OrrisTech/agent-eval), an open-source framework that automatically benchmarks MCP servers. I pointed it at 12 popular servers and scored them on 5 dimensions.

Some results surprised me.

## TL;DR Rankings

| Rank | Server | Category | Score | Capability | Reliability | Efficiency | Safety |
|------|--------|----------|-------|------------|-------------|------------|--------|
| 1 | **context7** | Search | **89** | 83 | 100 | 87 | 100 |
| 2 | **mcp-fetch** | Web | **86** | 73 | 90 | 99 | 100 |
| 3 | **mcp-memory** | Memory | **82** | 63 | 93 | 100 | 89 |
| 4 | **notion-mcp** | Productivity | **82** | 55 | 97 | 98 | 100 |
| 5 | **mcp-datetime** | Utilities | **81** | 70 | 73 | 100 | 100 |
| 6 | **mcp-everything** | Reference | **75** | 66 | 74 | 78 | 97 |
| 7 | **mcp-sequential-thinking** | Reasoning | **71** | 15 | 100 | 100 | 100 |
| 8 | **mcp-filesystem** | Filesystem | **68** | 73 | 14 | 100 | 100 |
| 9 | **playwright-mcp** | Browser | **68** | 62 | 30 | 100 | 100 |
| 10 | **mcp-sqlite** | Database | **63** | 63 | 10 | 100 | 100 |
| 11 | **mcp-git** | DevTools | **55** | 40 | 4 | 100 | 98 |
| 12 | **mcp-puppeteer** | Browser | **47** | 51 | 0 | 50 | 100 |

Full interactive results: [eval.agenthunter.io](https://eval.agenthunter.io)

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
| **Dev Experience** | 10% | Schema quality, docs, error messages |

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
ANTHROPIC_API_KEY=your-key npx @agenthunter/eval tool
```

Output looks like this:

```
  AgentHunter Eval v0.3.1
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

## What's new since v0.1

Since the first version, I've added:

- ~~**LLM non-determinism**~~: **Fixed in v0.2.0** — tasks are cached after first generation for reproducible scores. Use `--regenerate-tasks` to force new tasks.
- ~~**DX score was a placeholder**~~: **Fixed in v0.2.0** — DX now evaluates schema quality, documentation, and error messages automatically.
- **Configurable judge model**: v0.2.0 adds `eval.judge.model` config to switch models.
- **Task evaluation**: v0.3.0 adds `agent-eval task` — evaluate agents on end-to-end task completion, not just tool quality. [I tested 3 Claude models on 10 tasks](https://eval.agenthunter.io).

## What's next

- **More agents** — testing OpenAI GPT-5, open-source agents
- **More tasks** — expanding beyond coding and writing
- **Web dashboard** — browse rankings at [eval.agenthunter.io](https://eval.agenthunter.io)
- **Multi-provider judging** — use multiple models as judges to reduce bias

The framework is fully open source: **[github.com/OrrisTech/agent-eval](https://github.com/OrrisTech/agent-eval)**

Raw evaluation data for all 12 servers is in the [results directory](https://github.com/OrrisTech/agent-eval/tree/main/results).

---

*I'm building [AgentHunter](https://agenthunter.io) — the quality layer for the AI agent economy. Independent evaluation, transparent methodology, open data. If you're building an MCP server or AI agent, I'd love to benchmark it — [open an issue](https://github.com/OrrisTech/agent-eval/issues).*
