# agent-eval

[![npm version](https://img.shields.io/npm/v/@agenthunter/eval)](https://www.npmjs.com/package/@agenthunter/eval)
[![CI](https://github.com/OrrisTech/agent-eval/actions/workflows/ci.yml/badge.svg)](https://github.com/OrrisTech/agent-eval/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**The credit rating agency for AI agents.** Open-source evaluation platform with two layers: **Task Eval** (can the agent complete real tasks?) and **Tool Eval** (are the agent's tools reliable?).

## Quick Start

```bash
# Evaluate an agent on a task
npx @agenthunter/eval task -c task.yaml

# Benchmark an MCP server (tool quality)
npx @agenthunter/eval tool -c agent-eval.yaml
```

## What it does

`agent-eval` connects to an AI agent, auto-generates test tasks using Claude, executes them, and scores the results across 5 dimensions:

| Dimension | Weight | What we measure |
|-----------|--------|-----------------|
| **Capability** | 30% | Task completion + output quality (LLM-as-judge) |
| **Reliability** | 25% | Success rate across multiple runs |
| **Efficiency** | 20% | Response latency |
| **Safety** | 15% | Prompt injection resistance, scope violations |
| **Dev Experience** | 10% | Schema quality, error messages |

## Sample Output

```
  AgentHunter Eval v0.1.0
  Agent: mcp-memory v1.0.0 (MCP)
  Tools: 9 | Tasks: 18 | Runs: 18

  ────────────────────────────────────────────
  SCORE: 76 / 100
  ────────────────────────────────────────────

  Capability      ███████████░░░░░░░░░  55%
  Reliability     ██████████████████░░  89%
  Efficiency      ████████████████████  100%
  Safety          █████████████░░░░░░░  67%
  Dev Experience  ██████████████░░░░░░  70%
```

## Benchmark Results

We evaluated 12 popular MCP servers. [See full results →](docs/blog/mcp-server-benchmark.md)

| Rank | Server | Score | Tools | Reliability | Category |
|------|--------|-------|-------|-------------|----------|
| 🥇 | context7 | **89** | 2 | 100% | Search |
| 🥈 | mcp-fetch | **86** | 5 | 90% | Web |
| 🥉 | mcp-memory | **82** | 9 | 93% | Memory |
| 4 | notion-mcp | **82** | 22 | 97% | Productivity |
| 5 | mcp-datetime | **81** | 10 | 73% | Utilities |
| 6 | mcp-everything | **75** | 13 | 74% | Reference |
| 7 | mcp-sequential-thinking | **71** | 1 | 100% | Reasoning |
| 8 | mcp-filesystem | **68** | 14 | 14% | Filesystem |
| 9 | playwright-mcp | **68** | 10 | 30% | Browser |
| 10 | mcp-sqlite | **63** | 5 | 10% | Database |
| 11 | mcp-git | **55** | 15 | 4% | DevTools |
| 12 | mcp-puppeteer | **47** | 7 | 0% | Browser |

Raw evaluation data: [`results/`](results/)

## Supported Protocols

- **MCP** (Model Context Protocol) — stdio transport
- **A2A** — coming in Phase 2
- **REST API** — coming in Phase 2

## Contributing

We welcome contributions! Here are some ways to help:

- **Submit your MCP server** — [open a Benchmark Request](https://github.com/OrrisTech/agent-eval/issues/new?template=benchmark-request.yml)
- **Add servers** — PR to `scripts/servers.json`
- **Build adapters** — A2A and REST protocol adapters needed
- **Improve scoring** — better DX heuristics, multi-model judge support

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

## Development

```bash
git clone https://github.com/OrrisTech/agent-eval
cd agent-eval
bun install
bun run --filter @agenthunter/eval build
bun run --filter @agenthunter/eval test   # 65 tests
```

## License

MIT
