"use client";

import { useCallback, useState } from "react";

export function CopyCommand({
  command,
  label = "Reproduce Now",
  hint,
}: {
  command: string;
  label?: string;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be blocked (e.g. insecure context) — fall back to a prompt
      // so the user can copy manually. This is intentionally minimal.
      window.prompt("Copy this command:", command);
    }
  }, [command]);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
          {label}
        </span>
        <button
          type="button"
          onClick={copy}
          className="text-xs px-3 py-1.5 rounded-md border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-colors min-h-[32px]"
          aria-label="Copy command to clipboard"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <code className="block font-mono text-xs sm:text-sm text-[var(--color-accent)] break-all whitespace-pre-wrap">
        {command}
      </code>
      {hint && (
        <p className="mt-2 text-[11px] text-[var(--color-text-dim)]">{hint}</p>
      )}
    </div>
  );
}
