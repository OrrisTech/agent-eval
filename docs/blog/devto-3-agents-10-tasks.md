---
title: "Sonnet 4.6 vs Haiku 4.5 vs Opus 4.6: I Tested 3 Claude Models on 10 Real Tasks"
published: false
description: I used an open-source eval framework to test the latest Claude models — Sonnet 4.6, Haiku 4.5, and Opus 4.6 — on 10 standardized tasks. Only one model passed all 10.
tags: ai, llm, claude, benchmarks
canonical_url: https://github.com/OrrisTech/agent-eval
cover_image:
---

*Evaluated on April 15, 2026 using [AgentHunter Eval](https://eval.agenthunter.io) v0.3.1*

Which Claude model should you use for your agent? I tested the latest versions of all three on the same 10 tasks to find out.

## Results

| Model | Tasks Passed | Avg Time | Cost Tier |
|-------|-------------|----------|-----------|
| **Claude Opus 4.6** | **10/10** | 9.4s | $$$$ |
| **Claude Sonnet 4.6** | **9/10** | 10.2s | $$ |
| **Claude Haiku 4.5** | **9/10** | 3.9s | $ |

Only Opus 4.6 scored a perfect 10/10. Sonnet 4.6 and Haiku 4.5 both stumbled on the same task. Haiku was **2.5x faster** than the other two.

## The 10 Tasks

### Coding (5 tasks)

| Task | Opus 4.6 | Sonnet 4.6 | Haiku 4.5 |
|------|----------|------------|-----------|
| Create a CLI tool | PASS (4.7s) | PASS (3.9s) | PASS (2.4s) |
| Fix a sorting bug | PASS (3.8s) | PASS (5.8s) | PASS (1.9s) |
| Analyze CSV data | PASS (5.7s) | PASS (4.4s) | PASS (3.3s) |
| Write unit tests | PASS (16.2s) | **FAIL** (14.6s) | **FAIL** (4.5s) |
| Refactor repetitive code | PASS (4.9s) | PASS (3.8s) | PASS (2.4s) |

### Writing & Docs (5 tasks)

| Task | Opus 4.6 | Sonnet 4.6 | Haiku 4.5 |
|------|----------|------------|-----------|
| Write a professional email | PASS (10.6s) | PASS (10.3s) | PASS (4.2s) |
| Summarize a technical doc | PASS (8.8s) | PASS (8.1s) | PASS (3.6s) |
| Create a backup shell script | PASS (6.0s) | PASS (7.2s) | PASS (3.0s) |
| Convert JSON to CSV | PASS (8.5s) | PASS (12.2s) | PASS (4.6s) |
| Write a project README | PASS (25.0s) | PASS (32.0s) | PASS (8.7s) |

## Key Findings

### 1. Test writing is the hardest task for smaller models

Both Sonnet 4.6 and Haiku 4.5 failed the "write unit tests" task. This task requires generating a test file with correct assertions against a provided calculator function — it demands precise understanding of both the source code and test framework patterns. Only Opus 4.6 handled it correctly.

**Takeaway**: For tasks requiring multi-file reasoning (reading source + generating corresponding tests), Opus is worth the cost.

### 2. Haiku 4.5 is absurdly fast

At 3.9s average, Haiku is **2.5x faster than Sonnet 4.6** (10.2s) and **2.4x faster than Opus 4.6** (9.4s). For the README task, Haiku took 8.7s vs Sonnet's 32.0s — a 3.7x difference.

With 9/10 pass rate at that speed, Haiku is the clear winner for high-volume, latency-sensitive workloads.

### 3. Sonnet 4.6 is surprisingly slow

Sonnet 4.6 averaged 10.2s — actually slower than Opus 4.6 (9.4s) while passing fewer tasks (9 vs 10). This is unexpected: Sonnet is supposed to be the balanced middle option, but on these tasks, Opus delivers better accuracy at comparable speed.

### 4. Writing tasks are easy for everyone

All three models scored 10/10 on writing and documentation tasks. Emails, summaries, shell scripts, READMEs — no differentiation. The quality gap only appears on complex code reasoning tasks.

## My updated recommendation

| Use case | Model | Why |
|----------|-------|-----|
| **Complex coding (tests, multi-file)** | Opus 4.6 | Only model that passes all tasks |
| **Simple coding + writing** | Haiku 4.5 | 2.5x faster, 90% pass rate, cheapest |
| **General purpose** | Sonnet 4.6 | Good balance, but Haiku may be better for most tasks |

## Try it yourself

```bash
npx @agenthunter/eval task -c task.yaml
```

All evaluation data: [github.com/OrrisTech/agent-eval/results](https://github.com/OrrisTech/agent-eval/tree/main/results)

Full interactive results: [eval.agenthunter.io](https://eval.agenthunter.io)

---

*Built with [AgentHunter Eval](https://eval.agenthunter.io) — the open-source AI agent evaluation platform. `npx @agenthunter/eval task`*
