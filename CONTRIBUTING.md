# Contributing to agent-eval

Thanks for your interest in contributing! Here's how you can help.

## Submit Your MCP Server for Benchmarking

The fastest way to contribute — [open a Benchmark Request issue](https://github.com/OrrisTech/agent-eval/issues/new?template=benchmark-request.yml) and we'll evaluate your server.

## Add a Server to the Benchmark List

1. Fork the repo
2. Add your server to `scripts/servers.json`:

```json
{
  "name": "my-server",
  "package": "@scope/my-server",
  "endpoint": "npx -y @scope/my-server",
  "capabilities": ["what-it-does"],
  "category": "Category"
}
```

Optional fields:
- `"setup": "shell command"` — run before evaluation (e.g. create test files)
- `"maxTools": 10` — limit tools evaluated for large servers
- `"note": "Requires API key"` — any special requirements

3. Test it locally:

```bash
ANTHROPIC_API_KEY=your-key npx tsx scripts/batch-eval.ts --only my-server --tasks-per-tool 2 --runs 1
```

4. Submit a PR with the updated `servers.json` and the `results/my-server/report.json`

## Contribute to the Framework

### Setup

```bash
git clone https://github.com/OrrisTech/agent-eval
cd agent-eval
bun install
```

### Development

```bash
# Build CLI
bun run --filter @agenthunter/eval build

# Run tests (65 tests)
bun run --filter @agenthunter/eval test

# Lint
bun run --filter @agenthunter/eval lint

# Type check
bun run --filter @agenthunter/eval typecheck

# Run a single evaluation
cd /tmp && cat > agent-eval.yaml << 'EOF'
agent:
  name: "test"
  protocol: mcp
  endpoint: "npx -y @modelcontextprotocol/server-memory"
  capabilities: ["memory"]
eval:
  runs: 1
EOF
ANTHROPIC_API_KEY=your-key node ~/path-to/agent-eval/packages/agent-eval/dist/cli.js run
```

### Code Structure

```
packages/agent-eval/src/
├── cli.ts                  # CLI entry point
├── commands/               # CLI commands (init, run, report)
├── config/                 # YAML config schema + loader
├── eval/
│   ├── engine.ts           # Core eval pipeline orchestrator
│   ├── task-generator.ts   # Claude-powered test task generation
│   ├── task-store.ts       # Deterministic task set caching
│   ├── executor.ts         # Task execution + metrics collection
│   ├── scorer.ts           # LLM-as-judge scoring
│   ├── dx-scorer.ts        # Developer experience scoring (no LLM)
│   └── llm-client.ts       # Claude API client with retry
├── protocols/
│   ├── base.ts             # ProtocolAdapter interface
│   ├── mcp.ts              # MCP stdio adapter
│   └── factory.ts          # Adapter factory
└── report/
    └── generator.ts        # Report builder + terminal output
```

### Guidelines

- TypeScript strict mode, ESM only
- All new code needs tests in `tests/`
- Run `bun run lint && bun run typecheck && bun run test` before submitting
- Use Zod v4 (`zod/v4`) for runtime validation
- Comments in English, detailed enough for newcomers

## Areas Where Help is Wanted

- **A2A protocol adapter** — implement `protocols/a2a.ts` for Google's Agent-to-Agent protocol
- **REST API adapter** — implement `protocols/rest.ts` for OpenAPI-based agents
- **More MCP servers** — add popular servers to `scripts/servers.json`
- **DX scorer improvements** — better heuristics in `eval/dx-scorer.ts`
- **Multi-provider judge** — support OpenAI/Gemini as judge models in `eval/scorer.ts`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
