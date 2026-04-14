import { getAllAgents } from "@/lib/data";
import { RankingTable } from "@/components/ranking-table";

export default function HomePage() {
  const agents = getAllAgents();

  return (
    <div>
      {/* Hero */}
      <section className="py-12 text-center">
        <h1 className="text-4xl font-bold mb-4">
          MCP Server{" "}
          <span className="text-[var(--color-accent)]">Benchmarks</span>
        </h1>
        <p className="text-lg text-[var(--color-text-dim)] max-w-2xl mx-auto mb-6">
          Independent evaluation of {agents.length} MCP servers across
          capability, reliability, efficiency, safety, and developer experience.
        </p>
        <div className="flex justify-center gap-4 text-sm">
          <a
            href="https://www.npmjs.com/package/@agenthunter/eval"
            className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold hover:opacity-90 transition"
          >
            npx @agenthunter/eval run
          </a>
          <a
            href="https://github.com/OrrisTech/agent-eval"
            className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-white hover:border-white/30 transition"
          >
            View Source
          </a>
        </div>
      </section>

      {/* Rankings */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Rankings</h2>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <RankingTable agents={agents} />
        </div>
        <p className="text-xs text-[var(--color-text-dim)] mt-3">
          Scored using{" "}
          <a href="/methodology" className="underline">
            AgentHunter Eval v0.2.0
          </a>
          . Click column headers to sort. Click server name for details.
        </p>
      </section>
    </div>
  );
}
