---
title: "Sonnet vs Haiku vs Opus: I Tested 3 Claude Models on 10 Real Tasks"
published: false
description: I used an open-source eval framework to test Claude Sonnet 4, Haiku 4.5, and Opus 4 on 10 standardized tasks — coding, writing, data analysis, and more. Here's what I found.
tags: ai, llm, claude, benchmarks
canonical_url: https://github.com/OrrisTech/agent-eval
cover_image:
---

*Evaluated on April 15, 2026 using [AgentHunter Eval](https://eval.agenthunter.io) v0.3.1*

Which Claude model should you use for your agent? I tested all three on the same 10 tasks to find out.

## Setup

I built [agent-eval](https://github.com/OrrisTech/agent-eval), an open-source tool that evaluates AI agents on real tasks. Each task has:
- A description (what to do)
- Success criteria (how to judge if it's done)
- An LLM judge that evaluates the output

Each model received the exact same tasks, same prompts, same judge. The only variable is the model.

## Results

| Model | Tasks Passed | Avg Time | Cost Tier |
|-------|-------------|----------|-----------|
| **Claude Sonnet 4** | **10/10** | 8.7s | $$ |
| **Claude Opus 4** | **10/10** | 9.4s | $$$$ |
| **Claude Haiku 4.5** | **9/10** | 4.4s | $ |

Sonnet and Opus both scored perfect 10/10. Haiku missed one task but was **2x faster**.

## The 10 Tasks

### Coding (5 tasks)

| Task | Sonnet 4 | Haiku 4.5 | Opus 4 |
|------|----------|-----------|--------|
| Create a CLI tool | PASS (5.0s) | PASS (3.4s) | PASS (6.6s) |
| Fix a sorting bug | PASS (3.5s) | PASS (2.6s) | PASS (3.7s) |
| Analyze CSV data | PASS (5.2s) | **FAIL** (3.4s) | PASS (6.5s) |
| Write unit tests | PASS (9.9s) | PASS (5.5s) | PASS (12.8s) |
| Refactor repetitive code | PASS (4.2s) | PASS (2.6s) | PASS (6.5s) |

### Writing & Docs (5 tasks)

| Task | Sonnet 4 | Haiku 4.5 | Opus 4 |
|------|----------|-----------|--------|
| Write a professional email | PASS (13.3s) | PASS (4.5s) | PASS (11.6s) |
| Summarize a technical doc | PASS (8.8s) | PASS (4.0s) | PASS (9.2s) |
| Create a backup shell script | PASS (5.6s) | PASS (3.3s) | PASS (6.3s) |
| Convert JSON to CSV | PASS (11.6s) | PASS (5.8s) | PASS (10.6s) |
| Write a project README | PASS (20.0s) | PASS (8.7s) | PASS (20.1s) |

## Key Findings

### 1. Haiku's failure is revealing

Haiku failed the CSV data analysis task — it couldn't correctly identify the best-selling product (Widget A with 33 units). This is a computation-heavy task requiring arithmetic across multiple rows. All three models passed the simpler coding tasks (fix a bug, write a CLI), but Haiku stumbles when precision matters.

**Takeaway**: For tasks where getting the math right matters, don't use Haiku.

### 2. Opus is overkill for most tasks

Opus passed everything, but it was the slowest (9.4s avg) and costs ~10x more than Sonnet per token. For these 10 tasks, Sonnet produced identical results in less time at lower cost.

**Takeaway**: Use Opus only when Sonnet fails — and on these tasks, it didn't.

### 3. All models ace writing tasks

Every model scored 10/10 on the writing and documentation tasks. Professional emails, technical summaries, shell scripts, READMEs — all three handle these fluently. The quality differences between models show up in computation and complex reasoning, not in text generation.

### 4. Haiku is the speed champion

At 4.4s average (2x faster than Sonnet), Haiku is the clear choice when speed matters and the task is straightforward. 9/10 pass rate at half the latency is a strong value proposition.

## How to replicate

```bash
# Create a task definition
cat > task.yaml << 'EOF'
task:
  name: "My task"
  description: "Create a hello world script"
  success_criteria:
    - "A script file is created"
    - "It prints hello world"
agent:
  type: cli
  command: "./my-agent.sh"
  args: ["{{description}}"]
eval:
  timeout: 60
  runs: 1
EOF

# Run evaluation
ANTHROPIC_API_KEY=your-key npx @agenthunter/eval task
```

## My recommendation

| Use case | Model | Why |
|----------|-------|-----|
| **General coding** | Sonnet 4 | Perfect score, fast enough, best value |
| **Quick tasks, high volume** | Haiku 4.5 | 2x faster, 90% pass rate, cheapest |
| **Mission-critical, complex** | Opus 4 | Same accuracy as Sonnet, but verify it's actually needed |
| **Writing & documentation** | Haiku 4.5 | All models score equally, so use the cheapest |

All evaluation data is open: [github.com/OrrisTech/agent-eval/results](https://github.com/OrrisTech/agent-eval/tree/main/results)

Full interactive results: [eval.agenthunter.io](https://eval.agenthunter.io)

---

*Built with [AgentHunter Eval](https://eval.agenthunter.io) — the open-source AI agent evaluation platform. Try it: `npx @agenthunter/eval task`*
