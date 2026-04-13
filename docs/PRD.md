# AgentHunter Eval — Product Requirements Document

> The credit rating agency for AI agents.

**Version**: 0.1 (Draft)
**Date**: 2026-04-13
**Author**: James @ OrrisTech

---

## 1. Problem Statement

The AI agent ecosystem has reached critical mass — 10,000+ MCP servers, 150+ organizations on A2A, countless API-first agent services — but there is no trusted, independent way to evaluate and compare them.

**Key data points (April 2026):**

- Agent quality is the **#1 deployment barrier** for enterprises (32% cite it)
- Only **52%** of organizations with agents in production have proper evaluations
- Organizations with governance tools see **12x** more AI projects reach production
- **88–95%** of enterprise AI pilots fail to reach production
- Stanford and Consumer Reports have conceptualized "Consumer Reports for AI" but **no one has built it**

**The gap**: Protocol creators (Google, Anthropic) can build registries, but they **cannot** build neutral evaluation services — it's a conflict of interest. This is the same reason S&P exists independently of stock exchanges.

---

## 2. Product Vision

AgentHunter Eval is the **independent quality layer** for the AI agent economy.

We provide:
1. An **open-source evaluation framework** (`agent-eval` CLI) that anyone can run
2. A **hosted evaluation service** with continuous monitoring and scoring
3. A **discovery API** that lets agents programmatically find the best agent for a task

**One-liner**: "We don't build agents. We don't host agents. We rate them."

---

## 3. Definition of "Agent"

This is the foundational definition that scopes the entire product.

### What is an agent in AgentHunter Eval?

> **An agent is any AI-powered service that can be programmatically invoked, has defined input/output schemas, and can be independently tested.**

### Inclusion criteria (must meet ALL):

1. **Callable** — accessible via a network protocol (MCP, A2A, REST API, or executable package)
2. **Structured I/O** — has defined input parameters and output format
3. **Testable** — can be given a task and produce a measurable result
4. **Has a cost model** — free, per-token, per-task, or subscription

### What qualifies:

| Type | Protocol | Estimated Count (Apr 2026) |
|------|----------|---------------------------|
| MCP Servers | MCP | 10,000+ |
| A2A Agents | A2A | 500+ |
| API-first Agent Services | REST/GraphQL | 1,000+ |
| Executable Agent Packages | CLI / SDK | 2,000+ |

### What does NOT qualify:

- SaaS products with AI features (Notion AI, Canva) — these are products, not agents
- Chatbots without structured I/O (custom GPTs) — not testable in a standardized way
- Foundation models themselves (GPT-4, Claude) — components, not agents
- Local-only tools without network interface — not discoverable

### The litmus test:

> "Can I write a script that gives it a task, gets a result, and scores the result? If yes → it's an agent."

---

## 4. Target Users

### Primary: Agent Creators (supply side)

- **Who**: Developers and companies building MCP servers, A2A agents, or API agent services
- **Need**: Credibility signal — "my agent scored 92 on AgentHunter" as a trust badge
- **Behavior**: Run `agent-eval` locally during development, publish scores when ready

### Secondary: Agent Consumers (demand side)

- **Who**: Developers integrating agents into their workflows, enterprises evaluating vendors
- **Need**: "Which code review agent should I use?" — data-driven comparison, not marketing copy
- **Behavior**: Browse rankings, read eval reports, query the discovery API

### Tertiary: Other Agents (programmatic)

- **Who**: AI agents that need to delegate sub-tasks to other agents
- **Need**: Programmatic discovery — "find me the best summarization agent under $0.05/task"
- **Behavior**: Call the Discovery API, get ranked results with scores

---

## 5. Core Product Components

### 5.1 `agent-eval` CLI (Open Source)

The customer acquisition engine. Free, open-source, runs locally.

**Core workflow:**

```bash
# Initialize eval config for an agent
$ agent-eval init

# Run evaluation locally
$ agent-eval run

# Publish results to AgentHunter
$ agent-eval publish
```

**`agent-eval init`** detects the agent type and generates a config file:

```yaml
# agent-eval.yaml
agent:
  name: "my-code-reviewer"
  version: "1.2.0"
  protocol: mcp              # mcp | a2a | rest | executable
  endpoint: "npx @acme/code-reviewer"
  capabilities:
    - code-review
    - bug-detection
    - security-audit
  pricing:
    model: per-task
    estimated_cost: 0.03
    currency: USD

eval:
  runs: 50                    # number of test runs for reliability scoring
  dimensions:
    capability:
      weight: 0.30
    reliability:
      weight: 0.25
    efficiency:
      weight: 0.20
    safety:
      weight: 0.15
    developer_experience:
      weight: 0.10
```

**`agent-eval run`** executes the evaluation:

1. **Task generation** — based on declared capabilities, auto-generate test tasks using LLM
2. **Execution** — invoke the agent N times, collect outputs
3. **Scoring** — LLM-as-judge scores outputs against rubrics (human-defined per capability category)
4. **Metrics collection** — latency, token usage, cost, success/failure rate, error handling
5. **Report generation** — local HTML/JSON report with scores and breakdown

**`agent-eval publish`** submits results to the hosted platform:

- Authenticated via GitHub OAuth or API key
- Results are verified (platform re-runs a subset of tests to prevent gaming)
- Published scores appear on the agent's public profile

**Supported protocols (Phase 1):**

| Protocol | How we invoke | How we detect |
|----------|--------------|---------------|
| MCP | `npx` or `uvx` the server, call tools via MCP SDK | `mcp` field in config or auto-detect from package.json |
| A2A | HTTP POST to agent endpoint | `.well-known/agent.json` discovery |
| REST API | HTTP requests per OpenAPI spec | OpenAPI/Swagger spec URL in config |
| Executable | Run binary/script with args | `bin` field in package.json or config |

### 5.2 Evaluation Engine (Hosted)

The core product. Runs evaluations at scale, stores results, computes rankings.

**Evaluation dimensions:**

| Dimension | Weight | What we measure |
|-----------|--------|-----------------|
| **Capability** | 30% | Task completion rate, output quality (LLM-as-judge), edge case handling |
| **Reliability** | 25% | Success rate over N runs, error recovery, timeout handling, uptime |
| **Efficiency** | 20% | Latency (p50/p95/p99), token consumption, actual cost per task |
| **Safety** | 15% | Prompt injection resistance, data leakage tests, scope violation detection, permission handling |
| **Developer Experience** | 10% | Documentation quality, error messages, schema clarity, setup friction |

**Scoring formula:**

```
AgentHunter Score = Σ (dimension_score × weight) × 100

Where each dimension_score ∈ [0, 1]
```

**Test task generation:**

For each capability category, we maintain curated task sets:

```
Category: code-review
├── basic/          (10 tasks — simple function review)
├── intermediate/   (10 tasks — multi-file review with context)
├── advanced/       (10 tasks — security-focused review, subtle bugs)
└── adversarial/    (5 tasks — misleading code, prompt injection attempts)
```

Task sets are:
- **Open-source** — anyone can inspect what we're testing
- **Versioned** — scores reference which task set version was used
- **Community-contributed** — PRs welcome for new categories and tasks
- **Periodically rotated** — prevent overfitting to specific tests

**Continuous monitoring:**

- Registered agents are re-evaluated weekly (configurable)
- Score trends tracked over time
- Alerts on significant score drops
- Public status page showing monitoring results

### 5.3 Website (agenthunter.io)

The public face. Shows rankings, reports, and comparisons.

**Key pages:**

| Page | Purpose |
|------|---------|
| **Homepage** | Top agents by category, trending, recently evaluated |
| **Rankings** `/rankings/:category` | Ranked list with scores, filterable by protocol/price/score |
| **Agent Profile** `/agent/:slug` | Full eval report — score breakdown, benchmark history, trend chart |
| **Compare** `/compare?a=X&b=Y` | Side-by-side comparison of 2-3 agents |
| **Methodology** `/methodology` | Transparent explanation of how we evaluate |
| **Blog** `/blog` | Eval reports, "Top 10" lists, deep-dive articles (AI-generated, methodology is human) |
| **API Docs** `/docs/api` | Discovery API documentation |

**Content strategy:**

All content (reports, blog posts, ranking descriptions) is AI-generated based on eval data. The methodology, task sets, and scoring rubrics are human-designed. This is transparent — we say "Evaluation automated using our open-source framework" not "our team of experts tested for weeks."

### 5.4 Discovery API

The programmatic interface for agent-to-agent discovery.

**Endpoints:**

```
GET  /api/v1/discover          — search agents by capability, protocol, cost, score
GET  /api/v1/agent/:id         — get agent details + latest eval
GET  /api/v1/agent/:id/history — eval score history over time
GET  /api/v1/categories        — list capability categories
GET  /api/v1/compare           — compare multiple agents
POST /api/v1/eval/submit       — submit eval results (from CLI)
```

**Example query:**

```http
GET /api/v1/discover?capability=code-review&protocol=mcp&min_score=80&max_cost=0.10&sort=score

{
  "results": [
    {
      "name": "CodeRabbit",
      "protocol": "mcp",
      "score": 92,
      "scores": {
        "capability": 95,
        "reliability": 94,
        "efficiency": 88,
        "safety": 90,
        "dx": 85
      },
      "cost_per_task": "$0.03",
      "eval_date": "2026-04-10",
      "profile_url": "https://agenthunter.io/agent/coderabbit",
      "agent_card": "https://coderabbit.ai/.well-known/agent.json"
    }
  ]
}
```

---

## 6. Business Model

### Revenue streams:

| Stream | Who pays | Pricing | Phase |
|--------|----------|---------|-------|
| **Certified Evaluation** | Agent creators | $99–999/agent/month | Phase 2 |
| **Enterprise Subscription** | Companies using agents | $2K–20K/month | Phase 2 |
| **Discovery API** | Developers / agents | Free tier (10 req/day) → $0.001–0.01/query | Phase 3 |
| **Sponsored Listings** | Agent creators | $500–5K/month (clearly labeled) | Phase 2 |

### What's free forever:

- `agent-eval` CLI (open source, MIT)
- Basic agent profiles on the website
- Public rankings and eval reports
- Community task sets

### What's paid:

- **Certified badge** — platform re-verifies your scores, displays "AgentHunter Certified" badge
- **Continuous monitoring** — weekly re-evaluation + alerts
- **Deep eval reports** — comprehensive analysis beyond the standard dimensions
- **Private eval environments** — enterprise customers run evals in their own infra
- **Priority API access** — higher rate limits, real-time scores
- **Custom task sets** — enterprise customers define their own test scenarios

---

## 7. Data Flywheel

This is the core moat:

```
More agents register
       ↓
More eval data generated
       ↓
Scores become more accurate & comprehensive
       ↓
Rankings become more trusted
       ↓
More people/agents use Discovery API
       ↓
Usage data improves recommendations
       ↓
More agents want to be listed (credibility signal)
       ↓
(repeat)
```

Secondary flywheel from open-source:

```
Developers use agent-eval locally
       ↓
They contribute task sets and protocol adapters
       ↓
Framework becomes more comprehensive
       ↓
More developers adopt it
       ↓
More publish results to platform
       ↓
(repeat)
```

---

## 8. Competitive Positioning

| Competitor | What they do | What we do differently |
|-----------|-------------|----------------------|
| MCP Registry | Lists MCP servers | We score them |
| Braintrust / LangSmith | Eval YOUR agents (self-serve) | We provide INDEPENDENT cross-agent eval |
| ClawHub | Skill directory (listing) | We benchmark and rank |
| GPT Store | Consumer agent marketplace | We're protocol-agnostic and data-driven |
| Vercel skills.sh | 87K skills tracked | Directory only, no quality scoring |
| AgentOps | Runtime monitoring | We do pre-deployment evaluation |

**Our unique position**: The only platform that is (a) independent/neutral, (b) cross-protocol, (c) evaluation-first, and (d) open-source methodology.

---

## 9. Success Metrics

### Phase 1 (MVP — Month 1-2):

- [ ] `agent-eval` CLI published to npm
- [ ] 30+ MCP servers evaluated with real scores
- [ ] 1 viral blog post ("We benchmarked the top 30 MCP servers")
- [ ] 500+ GitHub stars on the eval framework

### Phase 2 (Platform — Month 3-4):

- [ ] Website live at agenthunter.io with rankings
- [ ] 200+ agents evaluated
- [ ] 10+ agent creators paying for certified evaluation
- [ ] Discovery API in beta

### Phase 3 (Scale — Month 5-8):

- [ ] 1,000+ agents evaluated
- [ ] 50+ paying customers (creators + enterprises)
- [ ] Discovery API in production with programmatic usage
- [ ] $10K+ MRR
- [ ] Fundraising ready

---

## 10. Technical Requirements

### Tech stack:

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| CLI | TypeScript, tsup, Commander.js | npm-publishable, same language as MCP SDK |
| Eval engine | TypeScript, Vitest (for test runner patterns) | Consistent with CLI |
| LLM-as-judge | Claude API (via Anthropic SDK) | Best for nuanced quality judgment |
| Database | Supabase (Postgres + Auth) | Fast to ship, familiar stack |
| Website | Next.js 16, Tailwind CSS | Familiar, Vercel deploy |
| API | Next.js Route Handlers | Co-located with website |
| CI/CD | GitHub Actions | Standard |
| Monorepo | Turborepo + Bun workspaces | Fast, modern |

### Key technical decisions:

1. **LLM-as-judge for quality scoring** — Use Claude to evaluate agent outputs against rubrics. Rubrics are human-written YAML files, versioned in the repo. The LLM scores, it doesn't define what "good" means.

2. **Verification layer** — When users `agent-eval publish`, the platform re-runs 20% of tests independently to prevent score manipulation. If scores diverge >15%, the submission is flagged.

3. **Protocol adapters** — Pluggable adapter pattern for MCP, A2A, REST, etc. Community can contribute new adapters.

4. **Task set versioning** — Every eval references a task set version. Scores are only comparable within the same version. When task sets update, all agents are re-evaluated.

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Agent creators game the eval | Scores become meaningless | Verification layer (re-run tests), periodic task rotation, adversarial test cases |
| LLM-as-judge is unreliable | Inconsistent scores | Multiple judge runs + consensus, human calibration on edge cases, publish confidence intervals |
| Protocol standards shift | Adapters break | Pluggable adapter architecture, follow spec repos closely |
| Big tech builds this | Existential | They can't be neutral — lean into independence. Also: open-source community can't be acquired |
| Cold start — no agents register | No data, no value | Proactively evaluate top agents WITHOUT requiring registration. Scrape MCP registry, run evals, publish results. Agents come to claim their profiles. |

---

## 12. Open Questions

1. **Naming**: Keep "AgentHunter" brand or create a new brand for the eval product? (e.g., "AgentMark", "AgentScore")
2. **Task set curation**: Who curates the initial task sets? Internal team + open-source community? Partner with academic benchmarking groups?
3. **Pricing model details**: Should certified evaluation be per-agent or per-organization?
4. **Legal**: Any liability concerns around publishing agent scores? (Cf. credit rating agency regulations)
5. **A2A vs MCP priority**: Which protocol to support first in the CLI? (Recommendation: MCP — larger ecosystem, easier to invoke locally)
