import { getAllAgents } from "@/lib/data";
import { RankingTable } from "@/components/ranking-table";

export default function HomePage() {
  const agents = getAllAgents();

  return (
    <div>
      {/* Hero */}
      <section className="py-12 text-center">
        <h1 className="text-4xl font-bold mb-4">
          AI Agent{" "}
          <span className="text-[var(--color-accent)]">Evaluation</span>
        </h1>
        <p className="text-lg text-[var(--color-text-dim)] max-w-2xl mx-auto mb-4">
          Independent evaluation platform for AI agents and their tools.
          Task completion scoring for agents. Quality benchmarks for MCP servers.
        </p>
        <p className="text-sm text-[var(--color-text-dim)] max-w-xl mx-auto mb-6">
          Below: Tool Quality Rankings for {agents.length} MCP servers.
          Agent task evaluation coming soon.
        </p>
        <div className="flex justify-center gap-4 text-sm">
          <a
            href="https://www.npmjs.com/package/@agenthunter/eval"
            className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold hover:opacity-90 transition"
          >
            npx @agenthunter/eval task
          </a>
          <a
            href="https://github.com/OrrisTech/agent-eval"
            className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-white hover:border-white/30 transition"
          >
            View Source
          </a>
        </div>
      </section>

      {/* Tool Rankings */}
      <section>
        <h2 className="text-xl font-semibold mb-4">
          Tool Quality Rankings
        </h2>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <RankingTable agents={agents} />
        </div>
        <p className="text-xs text-[var(--color-text-dim)] mt-3">
          MCP servers scored using{" "}
          <a href="/methodology" className="underline">
            AgentHunter Eval v0.3.0
          </a>
          . Click column headers to sort. Click server name for details.
        </p>
      </section>
    </div>
  );
}
