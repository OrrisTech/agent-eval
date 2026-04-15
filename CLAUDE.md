# AgentHunter Eval

The credit rating agency for AI agents — open-source evaluation platform with two layers: Task Eval (agent task completion) + Tool Eval (MCP server quality).

## Quick Reference

```bash
# Install dependencies
bun install

# Build CLI
bun run --filter agent-eval build

# Run CLI tests
bun run --filter agent-eval test

# Lint (all packages)
bun run lint

# Run CLI locally
node packages/agent-eval/dist/cli.js --help
```

## Repo Structure

```
agent-eval/
├── packages/
│   ├── agent-eval/       # CLI tool (@npm: agent-eval)
│   │   ├── src/
│   │   │   ├── cli.ts            # Commander.js entry point
│   │   │   ├── commands/         # CLI subcommands (init, run, report)
│   │   │   ├── config/           # Config schema (Zod) and loader
│   │   │   ├── protocols/        # Protocol adapters (MCP, A2A, REST)
│   │   │   ├── eval/             # Evaluation engine, task gen, scoring
│   │   │   └── report/           # Report generation
│   │   └── tests/                # Unit tests (Vitest)
│   └── web/              # Website (Next.js, Phase 2)
├── docs/
│   ├── PRD.md            # Product requirements document
│   └── IMPLEMENTATION_PLAN.md
└── turbo.json
```

## Tech Stack

- **Runtime**: Node.js 20+, Bun as package manager
- **Language**: TypeScript (strict mode)
- **CLI Build**: tsup (ESM output)
- **Testing**: Vitest
- **Linting**: Biome
- **Monorepo**: Turborepo + Bun workspaces
- **LLM**: Anthropic Claude API (for task generation + LLM-as-judge scoring)
- **Agent protocols**: MCP SDK (@modelcontextprotocol/sdk), A2A (HTTP)

## Coding Conventions

- All code comments in English, detailed enough for newcomers to understand
- Prefer mature open-source solutions over reinventing
- All new code must have corresponding unit tests in the `tests/` directory
- Tests must pass before committing
- Use Zod for all runtime validation (config, API responses, etc.)
- ESM-only (`"type": "module"` in package.json)
- Use `node:` prefix for Node.js built-in imports

## Content Generation Rules

- **CRITICAL**: When generating any content (blog posts, reports, documentation, eval configs):
  1. Check the current system date first
  2. Verify all model names/IDs are the LATEST versions as of that date (e.g. Claude Sonnet 4.6, not Sonnet 4; Opus 4.6, not Opus 4; check system context for current model IDs)
  3. Re-read the latest results/ files — never use stale data from earlier in the conversation
  4. Include the generation date in all published content
  5. Reference specific evaluation data with exact numbers from the latest results
- **Model versions**: Always use the latest model IDs when creating agent configs or referencing models. Outdated model names make the product look stale. Check the assistant system prompt for current model IDs before writing.

## Key Design Decisions

1. **Protocol adapters are pluggable** — each protocol (MCP, A2A, REST) implements a common `ProtocolAdapter` interface
2. **LLM-as-judge** — quality scoring uses Claude with human-written YAML rubrics. The LLM scores outputs, it doesn't define what "good" means
3. **Verification layer** — when users publish results, platform re-runs 20% of tests to prevent score manipulation
4. **Task sets are versioned** — scores reference which task set version was used, ensuring fair comparison

## Environment Variables

Copy `.env.example` to `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...   # Required for eval scoring (LLM-as-judge)
```

## Deployment

- Website: Vercel (--scope orris), subdomain: eval.agenthunter.io
- CLI: npm registry as `agent-eval`
