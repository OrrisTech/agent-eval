"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { AgentTaskSummary } from "@/lib/types";

/**
 * Two-select control for picking which agents to compare. Writes its state
 * into the URL as `?a=<slug>&b=<slug>` so links are shareable.
 */
export function CompareControls({
  agents,
  slugA,
  slugB,
}: {
  agents: AgentTaskSummary[];
  slugA: string;
  slugB: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: "a" | "b", value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      router.replace(`/compare?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <AgentSelect
        agents={agents}
        value={slugA}
        onChange={(v) => update("a", v)}
        label="Agent A"
      />
      <div className="text-center text-[var(--color-text-dim)] font-mono text-xs select-none">
        VS
      </div>
      <AgentSelect
        agents={agents}
        value={slugB}
        onChange={(v) => update("b", v)}
        label="Agent B"
      />
    </div>
  );
}

function AgentSelect({
  agents,
  value,
  onChange,
  label,
}: {
  agents: AgentTaskSummary[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-accent)]"
      >
        {agents.map((a) => (
          <option key={a.agent} value={a.agent}>
            {a.model}
          </option>
        ))}
      </select>
    </label>
  );
}
