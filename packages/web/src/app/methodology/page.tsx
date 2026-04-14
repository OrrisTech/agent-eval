import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How AgentHunter Eval benchmarks MCP servers.",
};

export default function MethodologyPage() {
  return (
    <article className="prose prose-invert max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">How We Evaluate</h1>

      <p className="text-[var(--color-text-dim)] mb-8">
        AgentHunter Eval is an open-source framework that automatically
        benchmarks MCP servers. Every score is reproducible — the code,
        methodology, and raw data are publicly available.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4">Pipeline</h2>
      <ol className="list-decimal list-inside space-y-2 text-[var(--color-text-dim)]">
        <li>
          <strong className="text-white">Connect</strong> — spawn the MCP
          server via stdio and discover all available tools
        </li>
        <li>
          <strong className="text-white">Generate tasks</strong> — Claude reads
          each tool&apos;s JSON Schema and creates test cases (basic, edge-case,
          adversarial)
        </li>
        <li>
          <strong className="text-white">Execute</strong> — run every task
          multiple times to measure reliability
        </li>
        <li>
          <strong className="text-white">Score</strong> — LLM-as-judge (Claude
          Sonnet 4) evaluates output quality against expected behavior
        </li>
        <li>
          <strong className="text-white">Report</strong> — aggregate into 5
          dimension scores and an overall score
        </li>
      </ol>

      <h2 className="text-xl font-semibold mt-8 mb-4">Scoring Dimensions</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-dim)]">
              <th className="py-3 pr-4 text-left">Dimension</th>
              <th className="py-3 pr-4 text-left">Weight</th>
              <th className="py-3 text-left">What we measure</th>
            </tr>
          </thead>
          <tbody className="text-[var(--color-text-dim)]">
            <tr className="border-b border-[var(--color-border)]/50">
              <td className="py-3 pr-4 font-semibold text-white">Capability</td>
              <td className="py-3 pr-4">30%</td>
              <td className="py-3">Task completion rate + output quality (LLM-as-judge). Harder tasks weighted more.</td>
            </tr>
            <tr className="border-b border-[var(--color-border)]/50">
              <td className="py-3 pr-4 font-semibold text-white">Reliability</td>
              <td className="py-3 pr-4">25%</td>
              <td className="py-3">Success rate across multiple runs of the same task.</td>
            </tr>
            <tr className="border-b border-[var(--color-border)]/50">
              <td className="py-3 pr-4 font-semibold text-white">Efficiency</td>
              <td className="py-3 pr-4">20%</td>
              <td className="py-3">Response latency. Sub-500ms = 100, over 10s = 0.</td>
            </tr>
            <tr className="border-b border-[var(--color-border)]/50">
              <td className="py-3 pr-4 font-semibold text-white">Safety</td>
              <td className="py-3 pr-4">15%</td>
              <td className="py-3">Prompt injection resistance, scope violations, data leakage.</td>
            </tr>
            <tr>
              <td className="py-3 pr-4 font-semibold text-white">Dev Experience</td>
              <td className="py-3 pr-4">10%</td>
              <td className="py-3">Schema quality (typed properties, descriptions), documentation, error message helpfulness.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-4">Overall Score</h2>
      <p className="text-[var(--color-text-dim)]">
        The overall score is a weighted average of all five dimensions, scaled
        to 0-100. Task generation uses deterministic caching — once generated,
        the same tasks are reused for fair comparison across runs.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4">Transparency</h2>
      <ul className="list-disc list-inside space-y-2 text-[var(--color-text-dim)]">
        <li>
          All evaluation code is{" "}
          <a
            href="https://github.com/OrrisTech/agent-eval"
            className="text-[var(--color-accent)] hover:underline"
          >
            open source
          </a>
        </li>
        <li>
          Raw evaluation data for every server is published in the{" "}
          <a
            href="https://github.com/OrrisTech/agent-eval/tree/main/results"
            className="text-[var(--color-accent)] hover:underline"
          >
            results directory
          </a>
        </li>
        <li>
          Anyone can reproduce results:{" "}
          <code className="bg-[var(--color-surface)] px-1.5 py-0.5 rounded text-xs">
            npx @agenthunter/eval run
          </code>
        </li>
        <li>
          The judge model is configurable — scores note which model was used
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-4">Limitations</h2>
      <ul className="list-disc list-inside space-y-2 text-[var(--color-text-dim)]">
        <li>
          LLM-generated tasks may not cover all real-world use cases
        </li>
        <li>
          Using Claude as both task generator and judge introduces bias
        </li>
        <li>
          Tools requiring real-world context (databases with data, filesystems
          with files) may score lower on reliability than in actual usage
        </li>
      </ul>
    </article>
  );
}
