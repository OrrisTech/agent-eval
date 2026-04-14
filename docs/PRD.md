# AgentHunter Eval — Product Requirements Document

> The credit rating agency for AI agents.

**Version**: 0.3
**Date**: 2026-04-14
**Author**: James

---

## 1. Problem Statement

AI agents are everywhere — Claude Code, Devin, custom CrewAI workflows, Cursor agents — but there is no trusted, independent way to evaluate whether they can actually do the job.

Enterprises cite **agent quality as the #1 deployment barrier** (32%). Only 52% of organizations with agents in production have proper evaluations. Organizations with governance tools see **12x** more AI projects reach production.

Everyone asks the same question: **"Can this agent actually complete my task?"**

Nobody has a data-driven answer.

---

## 2. Core Insight: Agent vs Tool

This distinction is the foundation of the entire product.

### Agent
> An **agent** is an AI system that can accept a high-level task description and autonomously orchestrate tools to complete it.

Examples: Claude Code, Devin, Cursor, AutoGPT, custom CrewAI/LangGraph agents, Manus

An agent:
- Receives a goal ("publish a blog post", "fix this bug", "deploy this service")
- Plans a sequence of actions
- Calls tools to execute each step
- Handles errors and adapts
- Reports success/failure

### Tool
> A **tool** is a capability module that an agent invokes to perform a specific operation.

Examples: MCP servers, Claude Code skills, REST APIs, CLI commands, browser automation

A tool:
- Has a defined interface (input schema → output)
- Does one thing (read file, query database, send HTTP request)
- Has no autonomy — it does what it's told
- Can be evaluated in isolation

### Relationship
```
Agent (orchestrator)
├── uses Tool A (MCP server)
├── uses Tool B (REST API)
├── uses Tool C (CLI command)
└── makes decisions about which tools to use and when
```

**MCP servers, skills, CLIs, plugins — these are all tools, not agents.** Our previous v0.1-0.2 evaluated tools. Starting v0.3, we evaluate both.

---

## 3. Product Vision

AgentHunter Eval is the **independent evaluation platform** for the AI agent economy.

Two layers of evaluation:

```
Layer 2: Task Eval — "Can this agent complete real-world tasks?"
  Input:  task description + success criteria
  Output: success/failure, token cost, duration, step count

Layer 1: Tool Eval — "Are this agent's tools reliable?"
  Input:  MCP server / tool endpoint
  Output: 5-dimension quality score (capability, reliability, efficiency, safety, DX)
```

**One-liner**: "We don't build agents. We rate them — on real tasks, with real data."

---

## 4. Target Users

### Primary: People choosing agents
- **Who**: Developers and businesses evaluating which agent to use for a task
- **Need**: "Which coding agent should I use? Is Devin worth $500/mo?"
- **Value**: Data-driven comparison based on actual task completion

### Secondary: Agent builders
- **Who**: Teams building agents (using CrewAI, LangGraph, custom orchestration)
- **Need**: "Is my agent getting better? Where does it fail?"
- **Value**: Continuous evaluation during development

### Tertiary: Tool builders
- **Who**: MCP server authors, API developers
- **Need**: "Is my tool reliable? How does it compare?"
- **Value**: Quality badge and benchmark data (our existing v0.2 product)

---

## 5. Product Components

### 5.1 `agent-eval tool` (existing, v0.2)

Evaluates individual tools (MCP servers) on 5 dimensions.

```bash
agent-eval tool                    # evaluate an MCP server
agent-eval tool --config eval.yaml # with custom config
```

This is what we shipped in v0.1-0.2. It works, it has data, it stays.

### 5.2 `agent-eval task` (new, v0.3)

Evaluates an agent on end-to-end task completion.

```bash
agent-eval task --config task.yaml
```

**Task definition file** (`task.yaml`):

```yaml
task:
  name: "Create a Python CLI tool"
  description: |
    Create a Python CLI tool that takes a URL as input,
    fetches the page content, and saves it as markdown.
  success_criteria:
    - "A Python file is created"
    - "The script accepts a URL argument"
    - "Running the script produces a markdown file"
    - "The markdown file contains content from the URL"

agent:
  type: cli                        # cli | api
  command: "claude-code"           # the agent to evaluate
  args: ["--task", "{{description}}"]
  workdir: "/tmp/eval-workspace"   # isolated workspace

eval:
  timeout: 300                     # max seconds per task
  runs: 3                          # repeat for reliability
```

**What gets measured**:

| Metric | How |
|--------|-----|
| **Success** | LLM-as-judge evaluates output against success criteria |
| **Token usage** | Parse from agent output or API response |
| **Duration** | Wall-clock time from start to completion |
| **Cost** | Estimated from token usage + model pricing |
| **Steps** | Number of tool calls / actions the agent took |
| **Reliability** | Success rate across N runs |

**Output**:

```
AgentHunter Task Eval v0.3
Agent: claude-code
Task: Create a Python CLI tool

────────────────────────────────────
RESULT: PASS (3/3 runs)
────────────────────────────────────

Success Rate    ████████████████████  100%
Avg Duration    12.3s
Avg Tokens      4,521
Est. Cost       $0.04
Avg Steps       8

Criteria Results:
  ✓ A Python file is created
  ✓ The script accepts a URL argument
  ✓ Running the script produces a markdown file
  ✓ The markdown file contains content from the URL
```

### 5.3 Website (eval.agenthunter.io)

Currently shows Tool Eval rankings. Will expand to show:
- **Agent Rankings** — which agents complete which tasks best
- **Tool Rankings** — existing MCP server benchmarks
- **Task Library** — standardized tasks that anyone can use to test agents

### 5.4 Discovery API (future)

```
GET /api/v1/agents?task=coding&sort=success_rate
GET /api/v1/tools?protocol=mcp&sort=reliability
GET /api/v1/tasks?category=coding
```

---

## 6. Business Model

| Stream | Who pays | Phase |
|--------|----------|-------|
| **Open source CLI** | Nobody (acquisition) | Now |
| **Agent evaluation reports** | Agent vendors wanting certification | Phase 3 |
| **Enterprise dashboard** | Companies comparing agents | Phase 3 |
| **Task library licensing** | Companies wanting standardized benchmarks | Phase 4 |

---

## 7. Competitive Positioning

| Competitor | What they do | What we do differently |
|-----------|-------------|----------------------|
| Braintrust / LangSmith | Eval YOUR agents (self-serve) | We provide INDEPENDENT cross-agent comparison |
| SWE-bench / GAIA | Academic benchmarks (static) | We test on configurable real-world tasks |
| MCP Registry | Lists tools | We score tools AND agents |
| GPT Store | Consumer marketplace | We're protocol-agnostic with real data |

**Unique position**: The only platform that evaluates agents on real task completion AND rates their tools — independently, cross-platform, open-source.

---

## 8. Success Metrics

### v0.3 (Task Eval MVP):
- [ ] `agent-eval task` command works end-to-end
- [ ] At least 5 standardized tasks in the task library
- [ ] Test on 2-3 real agents (Claude Code, a CLI agent, etc.)

### v0.4 (Agent Rankings):
- [ ] Website shows both tool AND agent rankings
- [ ] 10+ agents evaluated on standardized tasks
- [ ] Blog post: "We tested 10 coding agents on the same 5 tasks"

### v1.0:
- [ ] 50+ agents evaluated
- [ ] 20+ standardized tasks across categories
- [ ] Discovery API in production
- [ ] First paying customers

---

## 9. Revised Roadmap

```
Phase 0: Foundation             ✅ Done
Phase 1: Tool Eval CLI          ✅ Done (agent-eval tool)
Phase 1.5: Batch Tool Eval      ✅ Done (12 MCP servers)
Phase 2: Website                ✅ Done (eval.agenthunter.io)
Phase 2.5: Repositioning        ✅ Done (this PRD update)
Phase 3: Task Eval MVP          🔄 Current
Phase 4: Agent Rankings         ⬜ Next
Phase 5: Scale + Fundraise      ⬜ Future
```

---

## 10. Open Questions

1. **Agent interface**: How do we standardize invoking different agents? CLI agents are easy (run command, check output). API agents need HTTP. IDE agents (Cursor) may not be scriptable.
2. **Task verification**: Some tasks require checking side effects (was a file created? was an API called?). How do we verify without access to the agent's environment?
3. **Cost tracking**: Different agents report token usage differently (or not at all). How do we normalize cost comparison?
4. **Task library curation**: Who writes the standardized tasks? Internal + community contributions?
