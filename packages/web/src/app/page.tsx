import { getAllAgents, getTaskSummary } from "@/lib/data";
import { RankingTable } from "@/components/ranking-table";
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
          Independent evaluation platform for AI agents and their tools.
          Task completion scoring for agents. Quality benchmarks for MCP
          servers.
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
          <h2 className="text-xl font-semibold mb-4">
            Agent Task Rankings
          </h2>
          <p className="text-sm text-[var(--color-text-dim)] mb-4">
            Agents evaluated on 5 standardized coding tasks: CLI creation, bug
            fixing, data analysis, test writing, and code refactoring.
          </p>
          <TaskComparisonTable agents={taskSummary} />
        </section>
      )}

      {/* Tool Rankings — MCP servers */}
      <section>
        <h2 className="text-xl font-semibold mb-4">
          Tool Quality Rankings
        </h2>
        <p className="text-sm text-[var(--color-text-dim)] mb-4">
          {agents.length} MCP servers benchmarked across capability,
          reliability, efficiency, safety, and developer experience.
        </p>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 card-hover">
          <RankingTable agents={agents} />
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

function TaskComparisonTable({
  agents,
}: {
  agents: AgentTaskSummary[];
}) {
  // Sort by pass rate descending, then by speed
  const sorted = [...agents].sort(
    (a, b) =>
      b.overallPassRate - a.overallPassRate ||
      a.avgDuration - b.avgDuration,
  );

  // Collect all unique task names in order
  const taskNames =
    sorted[0]?.tasks.map((t) => t.taskName) ?? [];

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 card-hover overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-[var(--color-text-dim)]">
            <th className="py-3 px-3 text-left">Agent</th>
            <th className="py-3 px-3 text-left">Pass Rate</th>
            <th className="py-3 px-3 text-left">Avg Time</th>
            {taskNames.map((name) => (
              <th
                key={name}
                className="py-3 px-2 text-center hidden lg:table-cell"
                title={name}
              >
                {name.length > 15
                  ? `${name.slice(0, 13)}...`
                  : name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((agent, i) => {
            const passCount = agent.tasks.filter(
              (t) => t.passed,
            ).length;
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
                {agent.tasks.map((task) => (
                  <td
                    key={task.taskId}
                    className="py-3 px-2 text-center hidden lg:table-cell"
                    title={`${task.taskName}: ${task.passed ? "PASS" : "FAIL"} (${(task.avgDurationMs / 1000).toFixed(1)}s)`}
                  >
                    {task.passed ? (
                      <span className="text-emerald-400">
                        {"\u2713"}
                      </span>
                    ) : (
                      <span className="text-red-400">
                        {"\u2717"}
                      </span>
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
