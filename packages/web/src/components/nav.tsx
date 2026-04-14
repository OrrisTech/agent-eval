"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Rankings" },
    { href: "/methodology", label: "Methodology" },
    { href: "/blog", label: "Blog" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3">
        <Link
          href="/"
          className="text-lg font-bold text-[var(--color-accent)] min-h-[44px] flex items-center"
        >
          AgentHunter Eval
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
