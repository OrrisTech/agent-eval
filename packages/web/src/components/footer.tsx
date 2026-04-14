export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] px-4 sm:px-6 py-8">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--color-text-dim)]">
        <p>
          Built by{" "}
          <a
            href="https://agenthunter.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent)] hover:underline"
          >
            AgentHunter
          </a>
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://www.npmjs.com/package/@agenthunter/eval"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors py-2"
          >
            npm
          </a>
          <a
            href="https://github.com/OrrisTech/agent-eval"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors py-2"
          >
            GitHub
          </a>
          <a
            href="https://dev.to/jamesai/i-benchmarked-12-mcp-servers-heres-what-i-found-1124"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors py-2"
          >
            Blog
          </a>
        </div>
      </div>
    </footer>
  );
}
