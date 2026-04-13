# agent-eval

**The credit rating agency for AI agents.** Open-source evaluation framework for benchmarking MCP servers, A2A agents, and API-first agent services.

## Quick Start

```bash
# Initialize config for your agent
npx agent-eval init

# Run evaluation
ANTHROPIC_API_KEY=your-key npx agent-eval run

# View results
cat agent-eval-report/report.json
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

| Rank | Server | Score | Reliability |
|------|--------|-------|-------------|
| 🥇 | mcp-sequential-thinking | **77** | 100% |
| 🥈 | mcp-datetime | **75** | 73% |
| 🥉 | context7 | **73** | 100% |
| 4 | mcp-everything | **68** | 77% |
| 5 | mcp-filesystem | **62** | 14% |

Raw evaluation data: [`results/`](results/)

## Supported Protocols

- **MCP** (Model Context Protocol) — stdio transport
- **A2A** — coming in Phase 2
- **REST API** — coming in Phase 2

## Development

```bash
git clone https://github.com/OrrisTech/agent-eval
cd agent-eval
bun install
bun run --filter agent-eval build
bun run --filter agent-eval test
```

## License

MIT
