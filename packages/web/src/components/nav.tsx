"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Rankings" },
    { href: "/compare", label: "Compare" },
    { href: "/methodology", label: "Methodology" },
    { href: "/blog", label: "Blog" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3">
        <Link
          href="/"
          className="text-lg font-bold text-[var(--color-accent)] min-h-[44px] flex items-center gap-2.5"
          aria-label="AgentHunter Eval — home"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="shrink-0"
          >
            <g fill="none" stroke="currentColor" strokeLinecap="round">
              <circle cx="50" cy="50" r="32" strokeWidth="2.5" />
              <circle cx="50" cy="50" r="18" strokeWidth="1.5" opacity="0.55" />
              <path d="M 12 22 L 12 12 L 22 12" strokeWidth="2.5" />
              <path d="M 78 12 L 88 12 L 88 22" strokeWidth="2.5" />
              <path d="M 88 78 L 88 88 L 78 88" strokeWidth="2.5" />
              <path d="M 22 88 L 12 88 L 12 78" strokeWidth="2.5" />
              <line x1="50" y1="10" x2="50" y2="20" strokeWidth="2" />
              <line x1="50" y1="80" x2="50" y2="90" strokeWidth="2" />
              <line x1="10" y1="50" x2="20" y2="50" strokeWidth="2" />
              <line x1="80" y1="50" x2="90" y2="50" strokeWidth="2" />
            </g>
            <circle cx="50" cy="50" r="4.5" fill="currentColor" />
          </svg>
          <span>AgentHunter Eval</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 rounded-md text-sm transition-colors min-h-[44px] flex items-center ${
                pathname === link.href
                  ? "text-white bg-[var(--color-surface)]"
                  : "text-[var(--color-text-dim)] hover:text-white hover:bg-[var(--color-surface)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/OrrisTech/agent-eval"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-md text-sm text-[var(--color-text-dim)] hover:text-white hover:bg-[var(--color-surface)] transition-colors min-h-[44px] flex items-center"
          >
            GitHub
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-[var(--color-surface)] transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            {open ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 pb-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-3 rounded-md text-sm transition-colors ${
                pathname === link.href
                  ? "text-white bg-[var(--color-surface)]"
                  : "text-[var(--color-text-dim)] hover:text-white hover:bg-[var(--color-surface)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/OrrisTech/agent-eval"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-3 rounded-md text-sm text-[var(--color-text-dim)] hover:text-white hover:bg-[var(--color-surface)] transition-colors"
          >
            GitHub
          </a>
        </div>
      )}
    </nav>
  );
}
