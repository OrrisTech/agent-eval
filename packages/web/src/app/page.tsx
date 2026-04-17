import Link from "next/link";
import { Suspense } from "react";
import { CopyCommand } from "@/components/copy-command";
import { RankingTable } from "@/components/ranking-table";
import { getAllAgents, getTaskSummary } from "@/lib/data";
import type { AgentTaskSummary } from "@/lib/types";

export default function HomePage() {
  const agents = getAllAgents();
  const taskSummary = getTaskSummary();

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="py-16 text-center hero-glow">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
          AI Agent{" "}
          <span className="text-[var(--color-accent)]">Evaluation</span>
        </h1>
        <p className="text-lg text-[var(--color-text-dim)] max-w-2xl mx-auto mb-8">
          Independent evaluation platform for AI agents and their tools. Task
          completion scoring for agents. Quality benchmarks for MCP servers.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3 text-sm">
          <a
            href="https://www.npmjs.com/package/@agenthunter/eval"
            className="px-6 py-3 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-105 transition-all min-h-[44px] flex items-center justify-center"
          >
            npx @agenthunter/eval task
          </a>
          <a
            href="https://github.com/OrrisTech/agent-eval"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-lg border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-white hover:border-white/30 transition-all min-h-[44px] flex items-center justify-center"
          >
            View Source
          </a>
        </div>
      </section>

      {/* Task Rankings — agents evaluated on real tasks */}
      {taskSummary.length > 0 && (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Agent Task Rankings
              </h2>
              <p className="text-sm text-[var(--color-text-dim)] max-w-2xl">
                Agents evaluated on 5 standardized coding tasks: CLI creation,
                bug fixing, data analysis, test writing, and code refactoring.
              </p>
            </div>
            <div className="w-full sm:w-auto sm:min-w-[340px]">
              <CopyCommand
                command="npx @agenthunter/eval task"
                label="Reproduce Now"
                hint="Runs all tasks against your agent locally."
              />
            </div>
          </div>
          <TaskComparisonTable agents={taskSummary} />
        </section>
      )}

      {/* Tool Rankings — MCP servers */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Tool Quality Rankings</h2>
        <p className="text-sm text-[var(--color-text-dim)] mb-4">
          {agents.length} MCP servers benchmarked across capability,
          reliability, efficiency, safety, and developer experience.
        </p>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 card-hover">
          <Suspense fallback={<RankingTableFallback />}>
            <RankingTable agents={agents} />
          </Suspense>
        </div>
        <p className="text-xs text-[var(--color-text-dim)] mt-3">
          Scored using{" "}
          <a href="/methodology" className="underline">
            AgentHunter Eval v0.3.0
          </a>
          . Click column headers to sort.
        </p>
      </section>
    </div>
  );
}

function RankingTableFallback() {
  return (
    <div
      role="status"
      aria-label="Loading rankings"
      className="h-40 animate-pulse rounded bg-[var(--color-surface)]/50"
    />
  );
}

function TaskComparisonTable({ agents }: { agents: AgentTaskSummary[] }) {
  // Sort by pass rate descending, then by speed
  const sorted = [...agents].sort(
    (a, b) =>
      b.overallPassRate - a.overallPassRate || a.avgDuration - b.avgDuration,
  );

  // Collect all unique tasks in order
  const tasks = sorted[0]?.tasks ?? [];

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 card-hover overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-[var(--color-text-dim)]">
            <th className="py-3 px-3 text-left">Agent</th>
            <th className="py-3 px-3 text-left">Pass Rate</th>
            <th className="py-3 px-3 text-left">Avg Time</th>
            <th className="py-3 px-3 text-left hidden md:table-cell">Cost</th>
            {tasks.map((t) => (
              <th
                key={t.taskId}
                className="py-3 px-2 text-center hidden lg:table-cell"
              >
                <Link
                  href={`/task/${t.taskId}`}
                  className="hover:text-[var(--color-accent)] transition-colors"
                  title={t.taskName}
                >
                  {t.taskName.length > 15
                    ? `${t.taskName.slice(0, 13)}...`
                    : t.taskName}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((agent, i) => {
            const passCount = agent.tasks.filter((t) => t.passed).length;
            const passColor =
              agent.overallPassRate >= 1
                ? "text-emerald-400"
                : agent.overallPassRate >= 0.6
                  ? "text-amber-400"
                  : "text-red-400";

            return (
              <tr
                key={agent.agent}
                className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg)] transition-colors"
              >
                <td className="py-3 px-3">
                  <span className="font-semibold">
                    {i === 0 ? "\uD83E\uDD47 " : i === 1 ? "\uD83E\uDD48 " : ""}
                    {agent.model}
                  </span>
                </td>
                <td className={`py-3 px-3 font-semibold ${passColor}`}>
                  {passCount}/{agent.tasks.length}
                </td>
                <td className="py-3 px-3 text-[var(--color-text-dim)]">
                  {(agent.avgDuration / 1000).toFixed(1)}s
                </td>
                <td className="py-3 px-3 text-[var(--color-text-dim)] hidden md:table-cell font-mono text-xs">
                  {agent.totalCostUsd && agent.totalCostUsd > 0
                    ? `$${agent.totalCostUsd.toFixed(3)}`
                    : "—"}
                </td>
                {agent.tasks.map((task) => (
                  <td
                    key={task.taskId}
                    className="py-3 px-2 text-center hidden lg:table-cell"
                    title={`${task.taskName}: ${task.passed ? "PASS" : "FAIL"} (${(task.avgDurationMs / 1000).toFixed(1)}s)`}
                  >
                    {task.passed ? (
                      <span className="text-emerald-400">{"\u2713"}</span>
                    ) : (
                      <span className="text-red-400">{"\u2717"}</span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
