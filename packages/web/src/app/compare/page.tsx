import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CompareControls } from "@/components/compare-controls";
import { getTaskSummary } from "@/lib/data";
import type { AgentTaskSummary } from "@/lib/types";

export const metadata: Metadata = {
  title: "Compare Agents",
  description:
    "Head-to-head task comparison between two AI agents — per-task wins, speed delta, cost delta.",
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const summary = getTaskSummary();

  // Default to the top two agents if nothing was specified
  const defaultA = summary[0]?.agent ?? "";
  const defaultB = summary[1]?.agent ?? "";

  const slugA = a ?? defaultA;
  const slugB = b ?? defaultB;

  const agentA = summary.find((s) => s.agent === slugA);
  const agentB = summary.find((s) => s.agent === slugB);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Head-to-Head Compare</h1>
        <p className="text-sm text-[var(--color-text-dim)]">
          Two agents, ten tasks, one clear picture. Pick any two agents to see
          where each one wins, how much faster, and how much cheaper.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="h-14 animate-pulse rounded bg-[var(--color-surface)]/50" />
        }
      >
        <CompareControls agents={summary} slugA={slugA} slugB={slugB} />
      </Suspense>

      {agentA && agentB ? (
        <CompareResult agentA={agentA} agentB={agentB} />
      ) : (
        <p className="text-[var(--color-text-dim)]">
          Pick two agents above to compare.
        </p>
      )}
    </div>
  );
}

function CompareResult({
  agentA,
  agentB,
}: {
  agentA: AgentTaskSummary;
  agentB: AgentTaskSummary;
}) {
  // Join tasks on taskId — most task sets overlap fully across agents
  const taskIds = agentA.tasks.map((t) => t.taskId);
  const rows = taskIds.flatMap((taskId) => {
    const tA = agentA.tasks.find((t) => t.taskId === taskId);
    const tB = agentB.tasks.find((t) => t.taskId === taskId);
    if (!tA || !tB) return [];
    return [{ taskId, taskName: tA.taskName, a: tA, b: tB }];
  });

  const winsA = rows.filter((r) => r.a.passed && !r.b.passed).length;
  const winsB = rows.filter((r) => r.b.passed && !r.a.passed).length;
  const ties = rows.filter((r) => r.a.passed === r.b.passed).length;

  const passA = agentA.tasks.filter((t) => t.passed).length;
  const passB = agentB.tasks.filter((t) => t.passed).length;
  const speedRatio =
    agentB.avgDuration > 0 ? agentA.avgDuration / agentB.avgDuration : 0;
  const costA = agentA.totalCostUsd ?? 0;
  const costB = agentB.totalCostUsd ?? 0;

  return (
    <div className="mt-8 space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AgentCard
          agent={agentA}
          passCount={passA}
          accent={winsA > winsB}
          color="cyan"
        />
        <AgentCard
          agent={agentB}
          passCount={passB}
          accent={winsB > winsA}
          color="amber"
        />
      </div>

      {/* Scoreboard */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="text-xl font-semibold mb-4">Scoreboard</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <Stat label={`${agentA.model} wins`} value={String(winsA)} />
          <Stat label="Ties" value={String(ties)} dim />
          <Stat label={`${agentB.model} wins`} value={String(winsB)} />
        </div>
        <div className="mt-6 text-sm text-[var(--color-text-dim)] space-y-1">
          {speedRatio > 0 && (
            <p>
              {speedRatio > 1
                ? `${agentB.model} is ${speedRatio.toFixed(2)}× faster on average than ${agentA.model}.`
                : `${agentA.model} is ${(1 / speedRatio).toFixed(2)}× faster on average than ${agentB.model}.`}
            </p>
          )}
          {costA > 0 && costB > 0 && (
            <p>
              Total cost: {agentA.model} {formatCost(costA)} vs {agentB.model}{" "}
              {formatCost(costB)} ({costRatio(costA, costB)}).
            </p>
          )}
          {(costA === 0 || costB === 0) && (
            <p className="text-xs text-[var(--color-text-dim)]/70">
              Cost unavailable for at least one agent — re-run the eval to
              capture token usage and populate cost data.
            </p>
          )}
        </div>
      </div>

      {/* Per-task table */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-dim)]">
              <th scope="col" className="py-3 px-3 text-left font-normal">
                Task
              </th>
              <th
                scope="col"
                className="py-3 px-3 text-center font-normal whitespace-nowrap"
              >
                {agentA.model}
              </th>
              <th
                scope="col"
                className="py-3 px-3 text-center font-normal whitespace-nowrap"
              >
                {agentB.model}
              </th>
              <th scope="col" className="py-3 px-3 text-right font-normal">
                Δ time
              </th>
              <th scope="col" className="py-3 px-3 text-right font-normal">
                Winner
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ taskId, taskName, a, b }) => {
              const deltaMs = a.avgDurationMs - b.avgDurationMs;
              const winner =
                a.passed && !b.passed
                  ? agentA.model
                  : b.passed && !a.passed
                    ? agentB.model
                    : a.passed && b.passed
                      ? deltaMs < 0
                        ? agentA.model
                        : deltaMs > 0
                          ? agentB.model
                          : "tie"
                      : "both failed";
              return (
                <tr
                  key={taskId}
                  className="border-b border-[var(--color-border)]/50 last:border-b-0"
                >
                  <td className="py-3 px-3">
                    <Link
                      href={`/task/${taskId}`}
                      className="hover:text-[var(--color-accent)] transition-colors"
                    >
                      {taskName}
                    </Link>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <PassCell passed={a.passed} duration={a.avgDurationMs} />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <PassCell passed={b.passed} duration={b.avgDurationMs} />
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs">
                    {formatDelta(deltaMs)}
                  </td>
                  <td className="py-3 px-3 text-right text-xs">{winner}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgentCard({
  agent,
  passCount,
  accent,
  color,
}: {
  agent: AgentTaskSummary;
  passCount: number;
  accent: boolean;
  color: "cyan" | "amber";
}) {
  const accentClass =
    color === "cyan"
      ? "border-cyan-500/40 bg-cyan-500/5"
      : "border-amber-500/40 bg-amber-500/5";
  return (
    <div
      className={`rounded-lg border p-5 ${
        accent
          ? accentClass
          : "border-[var(--color-border)] bg-[var(--color-surface)]"
      }`}
    >
      <div className="text-xs uppercase tracking-widest text-[var(--color-text-dim)] mb-1">
        {accent ? "Leading" : "Challenger"}
      </div>
      <h3 className="text-xl font-semibold mb-2">{agent.model}</h3>
      <div className="flex flex-wrap gap-4 text-sm text-[var(--color-text-dim)]">
        <span>
          <span className="text-white font-semibold">
            {passCount}/{agent.tasks.length}
          </span>{" "}
          passed
        </span>
        <span>
          <span className="text-white font-semibold">
            {(agent.avgDuration / 1000).toFixed(1)}s
          </span>{" "}
          avg
        </span>
        {(agent.totalCostUsd ?? 0) > 0 && (
          <span>
            <span className="text-white font-semibold">
              {formatCost(agent.totalCostUsd ?? 0)}
            </span>{" "}
            total
          </span>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  dim,
}: {
  label: string;
  value: string;
  dim?: boolean;
}) {
  return (
    <div>
      <div
        className={`text-3xl font-bold ${dim ? "text-[var(--color-text-dim)]" : "text-[var(--color-accent)]"}`}
      >
        {value}
      </div>
      <div className="text-xs uppercase tracking-widest text-[var(--color-text-dim)] mt-1">
        {label}
      </div>
    </div>
  );
}

function PassCell({ passed, duration }: { passed: boolean; duration: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      {passed ? (
        <span className="text-emerald-400">{"\u2713"}</span>
      ) : (
        <span className="text-red-400">{"\u2717"}</span>
      )}
      <span className="text-xs text-[var(--color-text-dim)] font-mono">
        {(duration / 1000).toFixed(1)}s
      </span>
    </div>
  );
}

function formatDelta(ms: number): string {
  const seconds = ms / 1000;
  const sign = seconds > 0 ? "+" : "";
  return `${sign}${seconds.toFixed(1)}s`;
}

function formatCost(usd: number): string {
  if (usd === 0) return "—";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

function costRatio(a: number, b: number): string {
  if (a === 0 || b === 0) return "ratio unavailable";
  const ratio = a / b;
  if (ratio > 1) return `${ratio.toFixed(1)}× more expensive`;
  return `${(1 / ratio).toFixed(1)}× cheaper`;
}
