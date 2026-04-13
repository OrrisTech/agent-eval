# Implementation Plan

> Phased execution plan for AgentHunter Eval.

---

## Phase 0: Foundation (Week 1)

**Goal**: Monorepo scaffolding, tooling, CI — zero product features, just a working dev environment.

### Tasks:

- [ ] **0.1** Install dependencies (tsup, vitest, biome, commander, @anthropic-ai/sdk, @modelcontextprotocol/sdk)
- [ ] **0.2** Configure tsup for CLI build (entry: `src/cli.ts` → `dist/cli.js`)
- [ ] **0.3** Configure Vitest for both packages
- [ ] **0.4** Configure Biome (lint + format)
- [ ] **0.5** Set up GitHub Actions CI (lint, test, build on PR)
- [ ] **0.6** Create CLAUDE.md with project conventions
- [ ] **0.7** Verify `bun run build` works end-to-end

**Deliverable**: `npx @agenthunter/eval --version` prints version.

---

## Phase 1: CLI Core — MCP Evaluator (Week 2-3)

**Goal**: `agent-eval run` can evaluate a single MCP server and produce a local report.

### Architecture:

```
packages/agent-eval/src/
├── cli.ts                    # Commander.js entry point
├── commands/
│   ├── init.ts               # Generate agent-eval.yaml
│   ├── run.ts                # Execute evaluation
│   └── report.ts             # View last report
├── protocols/
│   ├── base.ts               # Protocol adapter interface
│   ├── mcp.ts                # MCP server adapter
│   ├── a2a.ts                # A2A adapter (Phase 1.5)
│   └── rest.ts               # REST API adapter (Phase 1.5)
├── eval/
│   ├── engine.ts             # Orchestrates eval pipeline
│   ├── task-generator.ts     # Generates test tasks from capabilities
│   ├── executor.ts           # Runs tasks against agent
│   ├── scorer.ts             # LLM-as-judge scoring
│   └── metrics.ts            # Latency, cost, token tracking
├── report/
│   ├── generator.ts          # Generates eval report
│   └── templates/            # HTML/JSON report templates
├── config/
│   ├── schema.ts             # agent-eval.yaml Zod schema
│   └── loader.ts             # Load and validate config
├── rubrics/                  # Scoring rubrics per capability
│   ├── code-review.yaml
│   ├── web-search.yaml
│   ├── summarization.yaml
│   └── general.yaml
└── tasks/                    # Test task sets per capability
    ├── code-review/
    │   ├── basic.json
    │   └── advanced.json
    ├── web-search/
    └── summarization/
```

### Tasks:

- [ ] **1.1** Define `AgentConfig` Zod schema (agent-eval.yaml format)
- [ ] **1.2** Implement `agent-eval init` — detect MCP server from package.json, generate config
- [ ] **1.3** Implement `ProtocolAdapter` interface (`connect`, `invoke`, `disconnect`, `listCapabilities`)
- [ ] **1.4** Implement `McpAdapter` — spawn MCP server via stdio, call tools via MCP SDK
- [ ] **1.5** Implement `TaskGenerator` — given capabilities list, use Claude API to generate test tasks
- [ ] **1.6** Implement `Executor` — run N tasks against agent, collect raw results (output, latency, errors)
- [ ] **1.7** Implement `Scorer` — LLM-as-judge with rubric, score each result on [0, 1]
- [ ] **1.8** Implement `MetricsCollector` — aggregate latency (p50/p95/p99), token usage, cost, success rate
- [ ] **1.9** Implement `EvalEngine` — orchestrate: generate tasks → execute → score → aggregate
- [ ] **1.10** Implement `ReportGenerator` — produce JSON + terminal-friendly summary
- [ ] **1.11** Write 3 rubrics: `code-review`, `web-search`, `general`
- [ ] **1.12** Write 10 test tasks per rubric for initial task set
- [ ] **1.13** Integration test: evaluate a real MCP server (e.g., `@modelcontextprotocol/server-filesystem`)
- [ ] **1.14** Unit tests for all modules (target: 80% coverage)

**Deliverable**: Run `agent-eval init && agent-eval run` on any MCP server, get a scored report in terminal.

### Example output:

```
$ agent-eval run

  AgentHunter Eval v0.1.0
  Agent: @acme/code-reviewer (MCP)
  Tasks: 35 | Runs: 50

  ─────────────────────────────────
  SCORE: 87 / 100
  ─────────────────────────────────

  Capability      ████████████████░░░░  82%  (24/30 tasks passed)
  Reliability     █████████████████░░░  91%  (46/50 runs succeeded)
  Efficiency      ████████████████░░░░  84%  (avg 2.3s, p95 4.1s)
  Safety          █████████████████░░░  88%  (4/5 injection tests blocked)
  Dev Experience  ████████████████████  93%  (good docs, clear errors)

  Full report: ./agent-eval-report/report.html
```

---

## Phase 1.5: Evaluate Real Agents + Content (Week 3-4)

**Goal**: Produce the first batch of real evaluation data. This is the content that validates the product.

### Tasks:

- [ ] **1.5.1** Curate a list of 30 popular MCP servers to evaluate (from MCP registry)
- [ ] **1.5.2** Run evaluations on all 30, collect reports
- [ ] **1.5.3** Build a script to generate blog post from eval data (AI-generated, template-driven)
- [ ] **1.5.4** Publish "We benchmarked the top 30 MCP servers — here's what we found" blog post
- [ ] **1.5.5** Publish evaluation data as JSON in repo (transparent, verifiable)
- [ ] **1.5.6** Open-source the CLI, push to npm as `@agenthunter/eval`

**Deliverable**: Blog post with real data. npm package live. GitHub repo public.

**Why this is a separate phase**: The blog post IS the product validation. If it gets traction (HN front page, 500+ GitHub stars, developer sharing), the product is validated. If not, we iterate on methodology before building the website.

---

## Phase 2: Website + Public Profiles (Week 5-7)

**Goal**: agenthunter.io shows rankings and agent profiles based on real eval data.

### Architecture:

```
packages/web/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Homepage: top agents, categories
│   │   ├── rankings/
│   │   │   └── [category]/page.tsx     # Category ranking page
│   │   ├── agent/
│   │   │   └── [slug]/page.tsx         # Agent profile + eval report
│   │   ├── compare/page.tsx            # Side-by-side comparison
│   │   ├── methodology/page.tsx        # How we evaluate (static)
│   │   ├── blog/
│   │   │   ├── page.tsx                # Blog index
│   │   │   └── [slug]/page.tsx         # Blog post
│   │   └── api/
│   │       └── v1/
│   │           ├── discover/route.ts   # Discovery API
│   │           ├── agent/[id]/route.ts # Agent detail API
│   │           └── eval/submit/route.ts# CLI publish endpoint
│   ├── components/
│   │   ├── score-badge.tsx             # Visual score display
│   │   ├── radar-chart.tsx             # 5-dimension radar chart
│   │   ├── trend-chart.tsx             # Score over time
│   │   ├── agent-card.tsx              # Agent listing card
│   │   └── comparison-table.tsx        # Compare view
│   └── lib/
│       ├── supabase.ts                 # DB client
│       └── eval-data.ts                # Data access layer
├── next.config.mjs
└── tailwind.config.ts
```

### Database schema (Supabase):

```sql
-- Core tables
agents (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  protocol text NOT NULL,           -- 'mcp' | 'a2a' | 'rest' | 'executable'
  endpoint text,
  description text,
  capabilities text[],
  pricing_model text,
  cost_per_task numeric,
  github_url text,
  website_url text,
  mcp_registry_id text,
  a2a_agent_card_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

evaluations (
  id uuid PRIMARY KEY,
  agent_id uuid REFERENCES agents(id),
  version text NOT NULL,            -- eval framework version
  task_set_version text NOT NULL,   -- which task set was used
  overall_score numeric NOT NULL,
  capability_score numeric,
  reliability_score numeric,
  efficiency_score numeric,
  safety_score numeric,
  dx_score numeric,
  total_tasks integer,
  passed_tasks integer,
  total_runs integer,
  successful_runs integer,
  avg_latency_ms integer,
  p95_latency_ms integer,
  avg_tokens integer,
  avg_cost_usd numeric,
  report_json jsonb,               -- full detailed report
  evaluated_at timestamptz DEFAULT now()
)

-- Latest score view (for rankings)
CREATE VIEW agent_rankings AS
SELECT DISTINCT ON (a.id)
  a.*,
  e.overall_score,
  e.capability_score,
  e.reliability_score,
  e.efficiency_score,
  e.safety_score,
  e.dx_score,
  e.evaluated_at
FROM agents a
JOIN evaluations e ON e.agent_id = a.id
ORDER BY a.id, e.evaluated_at DESC;
```

### Tasks:

- [ ] **2.1** Set up Supabase project, create schema, configure RLS
- [ ] **2.2** Set up Next.js 16 with Tailwind in `packages/web`
- [ ] **2.3** Import eval data from Phase 1.5 into Supabase
- [ ] **2.4** Build homepage (top agents, category list)
- [ ] **2.5** Build ranking page (sortable table, filters)
- [ ] **2.6** Build agent profile page (score breakdown, radar chart, history)
- [ ] **2.7** Build comparison page
- [ ] **2.8** Build methodology page (static content)
- [ ] **2.9** Build blog (markdown-based, from eval data)
- [ ] **2.10** Implement Discovery API routes
- [ ] **2.11** Implement `agent-eval publish` command (CLI → API)
- [ ] **2.12** Deploy to Vercel (--scope orris)
- [ ] **2.13** Point agenthunter.io domain to new deployment

**Deliverable**: agenthunter.io live with 30+ evaluated agents, rankings, and working Discovery API.

---

## Phase 3: Continuous Monitoring + Paid Tier (Week 8-10)

**Goal**: Agents are re-evaluated automatically. First paying customers.

### Tasks:

- [ ] **3.1** Build cron job: weekly re-evaluation of all registered agents
- [ ] **3.2** Score trend tracking (store historical scores, show trend charts)
- [ ] **3.3** Alert system: notify agent owners when scores drop significantly
- [ ] **3.4** Verification layer: re-run 20% of published eval results server-side
- [ ] **3.5** Implement Stripe billing for certified evaluation tier
- [ ] **3.6** "AgentHunter Certified" badge (embeddable SVG for READMEs/websites)
- [ ] **3.7** API rate limiting + paid tier (higher limits, real-time scores)
- [ ] **3.8** Agent owner claim flow (prove ownership via DNS/GitHub to manage profile)

**Deliverable**: Self-sustaining evaluation pipeline. First revenue from certified evaluations.

---

## Phase 4: Scale + A2A Support + Fundraise (Week 11-16)

### Tasks:

- [ ] **4.1** Implement A2A protocol adapter in CLI
- [ ] **4.2** Implement REST API adapter (OpenAPI spec → auto-generate tests)
- [ ] **4.3** Expand task sets to 20+ capability categories
- [ ] **4.4** Community contribution system (PR-based task set submissions)
- [ ] **4.5** Enterprise features: private eval environments, custom task sets, SSO
- [ ] **4.6** Scale to 500+ evaluated agents
- [ ] **4.7** Prepare fundraising materials (deck, metrics, growth story)

**Deliverable**: Multi-protocol support, 500+ agents, fundraising ready.

---

## Key Dependencies & Decisions

### Must decide before Phase 1:

| Decision | Options | Recommendation |
|----------|---------|----------------|
| LLM for task generation | Claude / GPT-4 / open-source | Claude (via Anthropic SDK) — best for nuanced rubric scoring |
| LLM for judge scoring | Same model / different model | Same model (Claude) for consistency, document which model version |
| Config format | YAML / JSON / TOML | YAML — human-readable, widely used in dev tools |
| CLI framework | Commander.js / oclif / Clipanion | Commander.js — lightweight, familiar |
| Report format | HTML / JSON / both | Both — JSON for machines, terminal summary for humans |

### Must decide before Phase 2:

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Database | Supabase / PlanetScale / Turso | Supabase — auth + DB + realtime, familiar |
| Hosting | Vercel / Cloudflare | Vercel (--scope orris) per global config |
| Auth | Supabase Auth / Clerk | Supabase Auth — already using Supabase |
| Blog engine | MDX in repo / Sanity CMS / Supabase | MDX in repo — version-controlled, simple |

### External dependencies:

- Anthropic API key (for LLM-as-judge) — already have `CCAPI_API_KEY`
- MCP SDK (`@modelcontextprotocol/sdk`) — npm package
- Supabase project — need to create
- Vercel project — need to create

---

## What Needs Manual Configuration

Before development starts, James needs to:

1. **Anthropic API key** — confirm which key to use for LLM-as-judge (CCAPI or dedicated?)
2. **Supabase project** — create a new project for agent-eval (Phase 2)
3. **npm org** — create `@agenthunter` npm organization for package publishing
4. **Domain** — confirm agenthunter.io DNS is accessible for pointing to new Vercel deployment
5. **Vercel project** — link repo to Vercel under Orris team

---

## Timeline Summary

```
Week 1         Phase 0: Foundation (tooling, CI)
Week 2-3       Phase 1: CLI core (MCP evaluator)
Week 3-4       Phase 1.5: Evaluate 30 real agents + blog post ← VALIDATION GATE
Week 5-7       Phase 2: Website + profiles + API
Week 8-10      Phase 3: Monitoring + paid tier
Week 11-16     Phase 4: Scale + A2A + fundraise
```

**The critical gate is Phase 1.5.** If the blog post and open-source CLI get traction, proceed to Phase 2. If not, iterate on the evaluation methodology and content angle before building the website.
