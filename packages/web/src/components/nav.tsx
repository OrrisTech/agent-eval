import Link from "next/link";

export function Nav() {
  return (
    <nav className="border-b border-[var(--color-border)] px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="text-lg font-bold text-[var(--color-accent)]">
          AgentHunter Eval
        </Link>
        <div className="flex gap-6 text-sm text-[var(--color-text-dim)]">
          <Link href="/" className="hover:text-white">
            Rankings
          </Link>
          <Link href="/methodology" className="hover:text-white">
            Methodology
          </Link>
          <Link href="/blog" className="hover:text-white">
            Blog
          </Link>
          <a
            href="https://github.com/OrrisTech/agent-eval"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}
