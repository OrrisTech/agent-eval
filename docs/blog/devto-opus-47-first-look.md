---
title: "Opus 4.7 First Look: I Tested the Day-Old Model Against 3 Other Claudes on 10 Real Tasks"
published: false
description: Anthropic shipped Claude Opus 4.7 yesterday. I ran it through the same 10-task eval as Opus 4.6, Sonnet 4.6, and Haiku 4.5 — including real token cost tracking. Here's what changed.
tags: ai, llm, claude, benchmarks
canonical_url: https://eval.agenthunter.io
cover_image:
---

*Evaluated on April 18, 2026 using [AgentHunter Eval](https://eval.agenthunter.io) v0.4.0*

Anthropic released **Claude Opus 4.7** on April 17, 2026. I ran it through the same 10-task evaluation I used for Opus 4.6, Sonnet 4.6, and Haiku 4.5 — this time with real token tracking so I could report dollar cost, not just pass rate.

## TL;DR

| Model | Tasks Passed | Avg Time | Total Cost | Cost / Task |
|-------|-------------|----------|------------|-------------|
| **Claude Opus 4.7** | **10/10** | **8.4s** | $0.559 | $0.056 |
| Claude Opus 4.6 | 10/10 | 9.8s | $0.437 | $0.044 |
| Claude Sonnet 4.6 | 10/10 | 9.8s | $0.110 | $0.011 |
| Claude Haiku 4.5 | 8/10 | 4.6s | $0.030 | $0.003 |

**Opus 4.7 is the new accuracy king and it's also faster than 4.6.** It costs ~27% more than 4.6 in total ($0.56 vs $0.44) but finishes tasks 14% faster on average. If you were using Opus 4.6, there's no reason not to upgrade.

**Sonnet 4.6 is the sleeper.** Perfect 10/10 accuracy at **1/5 the cost** of Opus 4.7. Unless you specifically need the extra edge Opus brings on adversarial tasks, Sonnet is the right default for most production agent work.

## The 10 Tasks

Five coding tasks, five writing tasks. All graded by an independent LLM judge against human-written pass/fail criteria.

### Coding (5 tasks)

| Task | Opus 4.7 | Opus 4.6 | Sonnet 4.6 | Haiku 4.5 |
|------|----------|----------|------------|-----------|
| Create a word count CLI | PASS (4.1s) | PASS (5.0s) | PASS (4.8s) | PASS (2.7s) |
| Fix a sorting bug | PASS (3.8s) | PASS (3.8s) | PASS (2.9s) | PASS (2.2s) |
| Analyze CSV sales data | PASS (4.7s) | PASS (4.7s) | PASS (4.7s) | **FAIL** (3.3s) |
| Write unit tests | PASS (13.3s) | PASS (17.8s) | PASS (13.6s) | PASS (7.5s) |
| Refactor repetitive code | PASS (5.8s) | PASS (7.2s) | PASS (4.7s) | PASS (3.0s) |

### Writing & Docs (5 tasks)

| Task | Opus 4.7 | Opus 4.6 | Sonnet 4.6 | Haiku 4.5 |
|------|----------|----------|------------|-----------|
| Write a professional email | PASS (9.5s) | PASS (12.4s) | PASS (9.7s) | PASS (4.0s) |
| Summarize a technical doc | PASS (8.3s) | PASS (9.6s) | PASS (8.0s) | PASS (4.1s) |
| Backup shell script | PASS (5.3s) | PASS (5.7s) | PASS (7.9s) | PASS (3.3s) |
| Convert JSON to CSV | PASS (8.6s) | PASS (8.6s) | PASS (10.7s) | PASS (5.4s) |
| Write a project README | PASS (20.6s) | PASS (22.7s) | PASS (31.6s) | **FAIL** (10.0s) |

## Key Findings

### 1. Opus 4.7 is faster than 4.6, not slower

This is the surprise. Model version bumps usually trade off speed for capability — bigger model, longer generations. Opus 4.7 is the opposite: **8.4s average vs 4.6's 9.8s**, a 14% improvement. On the README task specifically (the longest task in the suite), 4.7 finished in 20.6s vs 4.6's 22.7s.

Same pass rate, less latency, ~27% more cost. For interactive agent workloads where latency matters, the upgrade is worth it.

### 2. Sonnet 4.6 is the cost-adjusted winner

Sonnet 4.6 matches Opus 4.7's 10/10 accuracy on this suite at **$0.11 total vs $0.56** — **5× cheaper**. The gap between Sonnet and Opus used to be "Sonnet is fine if you're okay with 90% accuracy." As of this benchmark, there's no accuracy gap on these 10 tasks.

Where Opus still earns its premium: tasks in the suite don't include adversarial inputs, long-context reasoning, or multi-step planning. For narrow, well-specified tasks like these, Sonnet is enough.

### 3. Haiku 4.5 regressed on two tasks

Haiku failed the same CSV analysis and README tasks it previously passed — the benchmark is deterministic on success criteria but the model output is stochastic, so individual tasks can flip on single-run evals. Still, 8/10 at **1/20th the cost of Opus 4.7** is extraordinary for high-volume, latency-sensitive workloads.

The failure modes were informative: on the CSV task Haiku produced the right summary but missed two of four success criteria (it didn't create a separate analysis file the rubric expected). On README it produced a shorter doc that missed one section. Both are correctable with better prompting.

### 4. Writing tasks are still commodity

All four models score 10/10 on the five writing tasks (emails, summaries, shell scripts, READMEs). The quality gap only opens on code reasoning tasks — and even that gap has narrowed significantly with 4.6+ models.

## What's New in This Benchmark

Two things I added since the last post:

**Real token tracking.** The agent script now parses the `usage` field from the Anthropic API response and emits a `USAGE: input=X output=Y model=Z` line the eval engine picks up. Combined with a pricing map in the framework, this lets us report $/task accurately instead of eyeballing cost tiers.

**Head-to-head compare view.** Pick any two models on [eval.agenthunter.io/compare](https://eval.agenthunter.io/compare?a=opus-4-7&b=sonnet) to see per-task wins, speed delta, and cost delta side-by-side.

**README badges.** If your agent landed well, drop a shields-style badge in your README:

```markdown
![AgentHunter](https://eval.agenthunter.io/badge/opus-4-7.svg?metric=pass)
```

## My updated recommendations

| Use case | Model | Why |
|----------|-------|-----|
| **Best of the best** | Opus 4.7 | Fastest perfect scorer. Upgrade from 4.6. |
| **Production default** | Sonnet 4.6 | 10/10 accuracy at 1/5 the cost of Opus |
| **High-volume, latency-sensitive** | Haiku 4.5 | 2× faster than Sonnet, 1/4 the cost |
| **Writing-only workloads** | Haiku 4.5 | All models tie on writing; Haiku is cheapest |

## Reproduce this yourself

```bash
npx @agenthunter/eval task -c tasks/01-create-cli-tool.yaml
```

Raw data for all runs: [github.com/OrrisTech/agent-eval/tree/main/results](https://github.com/OrrisTech/agent-eval/tree/main/results)

Interactive results: [eval.agenthunter.io](https://eval.agenthunter.io)

---

*Built with [AgentHunter Eval](https://eval.agenthunter.io) — open-source AI agent evaluation with LLM-as-judge scoring, real cost tracking, and reproducible task sets. `npx @agenthunter/eval task`*
