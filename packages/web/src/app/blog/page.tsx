import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
};

export default function BlogPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Blog</h1>

      <a
        href="https://dev.to/jamesai/i-benchmarked-12-mcp-servers-heres-what-i-found-1124"
        target="_blank"
        rel="noopener noreferrer"
        className="block p-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/50 transition group"
      >
        <p className="text-xs text-[var(--color-text-dim)] mb-2">
          April 14, 2026
        </p>
        <h2 className="text-xl font-semibold group-hover:text-[var(--color-accent)] transition">
          I Benchmarked 12 MCP Servers — Here&apos;s What I Found
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-dim)]">
          I built an open-source eval framework and scored 12 popular MCP
          servers across capability, reliability, efficiency, and safety. The
          results were surprising.
        </p>
        <span className="mt-3 inline-block text-sm text-[var(--color-accent)]">
          Read on Dev.to &rarr;
        </span>
      </a>
    </div>
  );
}
