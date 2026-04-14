"use client";

import { useState } from "react";
import Link from "next/link";
import type { AgentSummary } from "@/lib/types";
import { ScoreBadge } from "./score-badge";

type SortKey = keyof AgentSummary;

export function RankingTable({ agents }: { agents: AgentSummary[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...agents].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortAsc ? aVal - bVal : bVal - aVal;
    }
    return String(aVal).localeCompare(String(bVal)) * (sortAsc ? 1 : -1);
  });

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const columns: { key: SortKey; label: string; hideOnMobile?: boolean }[] = [
    { key: "score", label: "Score" },
    { key: "name", label: "Server" },
    { key: "category", label: "Category", hideOnMobile: true },
    { key: "capability", label: "Cap", hideOnMobile: true },
    { key: "reliability", label: "Rel" },
    { key: "efficiency", label: "Eff", hideOnMobile: true },
    { key: "safety", label: "Safe", hideOnMobile: true },
    { key: "tools", label: "Tools", hideOnMobile: true },
    { key: "successRate", label: "Success" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-[var(--color-text-dim)]">
            <th className="py-3 px-2 text-left w-8">#</th>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`py-3 px-2 text-left cursor-pointer hover:text-white select-none ${
                  col.hideOnMobile ? "hidden md:table-cell" : ""
                }`}
                onClick={() => handleSort(col.key)}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-1">{sortAsc ? "\u2191" : "\u2193"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((agent, i) => (
            <tr
              key={agent.name}
              className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface)] transition-colors"
            >
              <td className="py-3 px-2 text-[var(--color-text-dim)]">
                {i + 1}
              </td>
              <td className="py-3 px-2">
                <ScoreBadge score={agent.score} />
              </td>
              <td className="py-3 px-2 font-medium">
                <Link
                  href={`/agent/${agent.name}`}
                  className="text-[var(--color-accent)] hover:underline"
                >
                  {agent.name}
                </Link>
              </td>
              <td className="py-3 px-2 text-[var(--color-text-dim)] hidden md:table-cell">
                {agent.category}
              </td>
              <td className="py-3 px-2 hidden md:table-cell">
                {agent.capability}
              </td>
              <td className="py-3 px-2">{agent.reliability}%</td>
              <td className="py-3 px-2 hidden md:table-cell">
                {agent.efficiency}
              </td>
              <td className="py-3 px-2 hidden md:table-cell">
                {agent.safety}
              </td>
              <td className="py-3 px-2 hidden md:table-cell">
                {agent.tools}
              </td>
              <td className="py-3 px-2">{agent.successRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
