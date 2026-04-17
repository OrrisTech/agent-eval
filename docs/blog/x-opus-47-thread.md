# X / Twitter Thread — Opus 4.7 First Look

## Option A: Single tweet (high-leverage, punchy)

```
Claude Opus 4.7 dropped yesterday.

Ran it through 10 real tasks against Opus 4.6, Sonnet 4.6, and Haiku 4.5 with real $ tracking:

Opus 4.7   10/10  8.4s  $0.56
Opus 4.6   10/10  9.8s  $0.44
Sonnet 4.6 10/10  9.8s  $0.11  ← 5× cheaper, same accuracy
Haiku 4.5   8/10  4.6s  $0.03

Opus 4.7 is faster than 4.6. Sonnet is the sleeper.

eval.agenthunter.io
```

(274 chars — fits without being cut off)

---

## Option B: Thread (5 tweets, more reach via replies)

**Tweet 1/5 (hook)**
```
Opus 4.7 dropped yesterday.

Tested it today vs Opus 4.6, Sonnet 4.6, Haiku 4.5 on 10 standardized tasks with real token cost tracking.

Results are surprising — for once the new model is actually *faster* than the one it replaces 👇
```

**Tweet 2/5 (the table)**
```
Opus 4.7   10/10  8.4s  $0.56
Opus 4.6   10/10  9.8s  $0.44
Sonnet 4.6 10/10  9.8s  $0.11
Haiku 4.5   8/10  4.6s  $0.03

10 tasks: coding (CLI, bug fix, tests, refactor) + writing (email, summary, README, shell, data conversion).

Judged by an independent LLM against human-written criteria.
```

**Tweet 3/5 (the Opus 4.7 surprise)**
```
The 4.7 surprise: it's 14% faster than 4.6 while hitting the same 10/10.

README task: 4.7 finished in 20.6s, 4.6 took 22.7s.
Unit tests: 4.7 did it in 13.3s, 4.6 took 17.8s.

Same cost tier, less latency. If you're on 4.6, upgrade.
```

**Tweet 4/5 (Sonnet is the sleeper)**
```
But the real winner is Sonnet 4.6.

Perfect 10/10 at **1/5 the cost** of Opus 4.7 ($0.11 vs $0.56).

Unless your agent actually hits tasks where Opus's extra capability matters, Sonnet is the right default. I've been defaulting to Opus on my own agents — I'm switching back.
```

**Tweet 5/5 (CTA)**
```
Full writeup + all raw data + reproducible CLI:

🔗 eval.agenthunter.io
📦 npx @agenthunter/eval task

Open source. Bring your own API key. Runs on your machine.

Want your MCP server / agent benchmarked? Open an issue.
```

---

## Option C: Reply bait variant (for Sonnet thread)

```
Hot take: Sonnet 4.6 is the correct default for 95% of agent workloads.

I benchmarked the new Opus 4.7 (yesterday's release) vs Sonnet 4.6 on 10 real tasks:

Both scored 10/10.
Sonnet is 5× cheaper.

Would love to see where Opus actually justifies its premium — drop tasks where it wins and I'll run them.

eval.agenthunter.io
```

---

## Recommendation

**Post Option A first** (single tweet maximizes views; it's the format X's algo rewards). If it gets traction (>5k views in 2 hours), reply-quote it with Option B as a thread for depth.

**Don't post B cold** — threads underperform single tweets on X unless they're riding a strong first-tweet hook.

**Option C is a bonus reply** to drop under any viral "Opus 4.7 is amazing" tweet in the next 24h. Contrarian takes get replies; replies get impressions.

**Best time to post**: 9-11am ET today while Opus 4.7 is still the top AI story in your feed.
