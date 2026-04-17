import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyCommand } from "@/components/copy-command";
import {
  getAllTaskIds,
  getTaskDetails,
  type TaskAgentDetail,
} from "@/lib/data";

// Generate static pages for all tasks
export function generateStaticParams() {
  return getAllTaskIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const task = getTaskDetails(id);
  if (!task) return { title: "Task Not Found" };

  const passCount = task.agents.filter((a) => a.passed).length;
  return {
    title: `${task.taskName} — ${passCount}/${task.agents.length} agents pass`,
    description: `Task evaluation results: ${task.taskName}. ${passCount} of ${task.agents.length} agents passed.`,
  };
}

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = getTaskDetails(id);
  if (!task) notFound();

  const passCount = task.agents.filter((a) => a.passed).length;
  const fastest = [...task.agents]
    .filter((a) => a.passed)
    .sort((a, b) => a.avgDurationMs - b.avgDurationMs)[0];

  return (
    <div>
      <Link
        href="/"
        className="text-sm text-[var(--color-text-dim)] hover:text-white mb-6 inline-block"
      >
        &larr; Back to rankings
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{task.taskName}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-[var(--color-text-dim)] mb-6">
          <span>
            <span
              className={
                passCount === task.agents.length
                  ? "text-emerald-400"
                  : "text-amber-400"
              }
            >
              {passCount}/{task.agents.length}
            </span>{" "}
            agents passed
          </span>
          {fastest && (
            <span>
              Fastest: <span className="text-white">{fastest.model}</span> (
              {(fastest.avgDurationMs / 1000).toFixed(1)}s)
            </span>
          )}
        </div>

        <CopyCommand
          command={`npx @agenthunter/eval task --task tasks/${id}.yaml`}
          hint="Runs this task against your agent and scores the output with the same rubric."
        />
      </div>

      {/* Agent comparison */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Agent Results</h2>
        <div className="space-y-3">
          {[...task.agents]
            .sort(
              (a, b) =>
                Number(b.passed) - Number(a.passed) ||
                a.avgDurationMs - b.avgDurationMs,
            )
            .map((agent) => (
              <div
                key={agent.agent}
                className={`rounded-lg border p-4 card-hover ${
                  agent.passed
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-red-500/30 bg-red-500/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-lg ${agent.passed ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {agent.passed ? "\u2713" : "\u2717"}
                    </span>
                    <div>
                      <span className="font-semibold text-white">
                        {agent.model}
                      </span>
                      <span className="text-xs text-[var(--color-text-dim)] ml-2">
                        {agent.criteriaPassed}/{agent.criteriaTotal} criteria
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono">
                      {(agent.avgDurationMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                </div>

                {/* Criteria bar */}
                <div className="mt-2 h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
                  <div
                    className={`h-full rounded-full score-bar-fill ${
                      agent.passed ? "bg-emerald-500" : "bg-red-500"
                    }`}
                    style={{
                      width: `${agent.criteriaTotal > 0 ? (agent.criteriaPassed / agent.criteriaTotal) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Criteria matrix — which criterion each agent passed/failed */}
      <CriteriaMatrix agents={task.agents} />

      {/* Speed comparison */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Speed Comparison</h2>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 card-hover">
          {[...task.agents]
            .sort((a, b) => a.avgDurationMs - b.avgDurationMs)
            .map((agent) => {
              const maxTime = Math.max(
                ...task.agents.map((a) => a.avgDurationMs),
              );
              const pct =
                maxTime > 0 ? (agent.avgDurationMs / maxTime) * 100 : 0;

              return (
                <div
                  key={agent.agent}
                  className="flex items-center gap-3 mb-2 last:mb-0"
                >
                  <span className="w-36 text-sm text-[var(--color-text-dim)] shrink-0">
                    {agent.model}
                  </span>
                  <div className="flex-1 h-4 rounded bg-[var(--color-border)] overflow-hidden">
                    <div
                      className="h-full rounded bg-[var(--color-accent)] score-bar-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm font-mono">
                    {(agent.avgDurationMs / 1000).toFixed(1)}s
                  </span>
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}

// Combine each agent's criteria into a unified, de-duplicated list so we can
// render a matrix of criterion × agent. If an agent lacks detailed criteria
// (older reports), its column shows a neutral dash for that row.
function buildCriteriaMatrix(agents: TaskAgentDetail[]) {
  const seen = new Map<string, number>();
  const criteria: string[] = [];
  for (const agent of agents) {
    for (const c of agent.criteria) {
      if (!seen.has(c.criterion)) {
        seen.set(c.criterion, criteria.length);
        criteria.push(c.criterion);
      }
    }
  }
  return criteria;
}

function CriteriaMatrix({ agents }: { agents: TaskAgentDetail[] }) {
  const criteria = buildCriteriaMatrix(agents);
  if (criteria.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-2">Failure Attribution</h2>
      <p className="text-sm text-[var(--color-text-dim)] mb-4">
        Which individual success criterion each agent passed. A single failure
        flips the whole task to "fail" — this table shows why.
      </p>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-dim)]">
              <th className="py-3 px-3 text-left font-normal">Criterion</th>
              {agents.map((a) => (
                <th
                  key={a.agent}
                  className="py-3 px-3 text-center font-normal whitespace-nowrap"
                >
                  {a.model}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((criterion) => (
              <tr
                key={criterion}
                className="border-b border-[var(--color-border)]/50 last:border-b-0"
              >
                <td className="py-3 px-3 text-[var(--color-text-dim)]">
                  {criterion}
                </td>
                {agents.map((a) => {
                  const match = a.criteria.find(
                    (c) => c.criterion === criterion,
                  );
                  if (!match) {
                    return (
                      <td
                        key={a.agent}
                        className="py-3 px-3 text-center text-[var(--color-text-dim)]/40"
                      >
                        {"\u2014"}
                      </td>
                    );
                  }
                  return (
                    <td
                      key={a.agent}
                      className="py-3 px-3 text-center"
                      title={match.reasoning}
                    >
                      {match.passed ? (
                        <span className="text-emerald-400">{"\u2713"}</span>
                      ) : (
                        <span className="text-red-400">{"\u2717"}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
