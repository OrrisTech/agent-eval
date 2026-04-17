import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RadarChart } from "@/components/radar-chart";
import { ScoreBadge } from "@/components/score-badge";
import { ScoreBar } from "@/components/score-bar";
import { ToolCard } from "@/components/tool-card";
import { getAgent, getAllSlugs } from "@/lib/data";

// Generate static pages for all evaluated agents
export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

// Dynamic metadata per agent
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const report = getAgent(slug);
  if (!report) return { title: "Agent Not Found" };

  return {
    title: `${report.meta.agentName} — ${report.scores.overall}/100`,
    description: `Evaluation report for ${report.meta.agentName}: ${report.scores.overall}/100 overall score across ${report.tools.length} tools.`,
  };
}

export default async function AgentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const report = getAgent(slug);
  if (!report) notFound();

  const { meta, scores, tools, execution } = report;

  return (
    <div>
      {/* Back link */}
      <Link
        href="/"
        className="text-sm text-[var(--color-text-dim)] hover:text-white mb-6 inline-block"
      >
        &larr; Back to rankings
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start gap-6 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{meta.agentName}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-[var(--color-text-dim)]">
            <span className="px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)]">
              {meta.protocol.toUpperCase()}
            </span>
            {meta.capabilities.map((cap) => (
              <span
                key={cap}
                className="px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)]"
              >
                {cap}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-[var(--color-text-dim)] font-mono">
            {meta.endpoint}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-dim)]">
            Evaluated {new Date(meta.evaluatedAt).toLocaleDateString()} with
            agent-eval v{meta.evalFrameworkVersion}
            {meta.judgeModel && ` (judge: ${meta.judgeModel})`}
          </p>
        </div>
        <div className="text-center">
          <ScoreBadge score={scores.overall} size="lg" />
          <p className="text-xs text-[var(--color-text-dim)] mt-1">
            Overall Score
          </p>
        </div>
      </div>

      {/* Scores section */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Radar chart */}
        <div className="flex justify-center items-center p-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <RadarChart
            scores={{
              capability: scores.capability,
              reliability: scores.reliability,
              efficiency: scores.efficiency,
              safety: scores.safety,
              dx: scores.developerExperience,
            }}
          />
        </div>

        {/* Score bars */}
        <div className="space-y-4 p-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <ScoreBar label="Capability" score={scores.capability} weight="30%" />
          <ScoreBar
            label="Reliability"
            score={scores.reliability}
            weight="25%"
          />
          <ScoreBar label="Efficiency" score={scores.efficiency} weight="20%" />
          <ScoreBar label="Safety" score={scores.safety} weight="15%" />
          <ScoreBar
            label="Dev Experience"
            score={scores.developerExperience}
            weight="10%"
          />
        </div>
      </div>

      {/* Execution stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Tools", value: tools.length },
          { label: "Tasks", value: execution.totalTasks },
          {
            label: "Success Rate",
            value: `${Math.round(execution.overallSuccessRate * 100)}%`,
          },
          { label: "Avg Latency", value: `${execution.latency.avgMs}ms` },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-center"
          >
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-[var(--color-text-dim)]">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tools */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Tools ({tools.length})</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {tools.map((tool) => (
            <ToolCard key={tool.name} tool={tool} />
          ))}
        </div>
      </section>

      {/* Task Scores */}
      {scores.taskScores.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Task Scores ({scores.taskScores.length})
          </h2>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-text-dim)]">
                  <th className="py-3 px-4 text-left">Tool</th>
                  <th className="py-3 px-4 text-left">Difficulty</th>
                  <th className="py-3 px-4 text-left">Capability</th>
                  <th className="py-3 px-4 text-left">Safety</th>
                  <th className="py-3 px-4 text-left hidden md:table-cell">
                    Reasoning
                  </th>
                </tr>
              </thead>
              <tbody>
                {scores.taskScores.map((ts) => (
                  <tr
                    key={`${ts.toolName}-${ts.difficulty}`}
                    className="border-b border-[var(--color-border)]/50"
                  >
                    <td className="py-2 px-4 font-mono text-xs">
                      {ts.toolName}
                    </td>
                    <td className="py-2 px-4">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          ts.difficulty === "adversarial"
                            ? "bg-red-500/20 text-red-400"
                            : ts.difficulty === "advanced"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-[var(--color-border)] text-[var(--color-text-dim)]"
                        }`}
                      >
                        {ts.difficulty}
                      </span>
                    </td>
                    <td className="py-2 px-4">
                      {(ts.capabilityScore * 100).toFixed(0)}%
                    </td>
                    <td className="py-2 px-4">
                      {(ts.safetyScore * 100).toFixed(0)}%
                    </td>
                    <td className="py-2 px-4 text-xs text-[var(--color-text-dim)] max-w-xs truncate hidden md:table-cell">
                      {ts.reasoning}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
