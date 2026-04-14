export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] px-6 py-8 text-center text-sm text-[var(--color-text-dim)]">
      <p>
        Built by{" "}
        <a
          href="https://agenthunter.io"
          className="text-[var(--color-accent)] hover:underline"
        >
          AgentHunter
        </a>
        {" | "}
        <a
          href="https://www.npmjs.com/package/@agenthunter/eval"
          className="hover:text-white"
        >
          npm
        </a>
        {" | "}
        <a
          href="https://github.com/OrrisTech/agent-eval"
          className="hover:text-white"
        >
          GitHub
        </a>
      </p>
      <p className="mt-2 text-xs">
        Independent evaluation, transparent methodology, open data.
      </p>
    </footer>
  );
}
