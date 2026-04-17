"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { AgentSummary } from "@/lib/types";
import { ScoreBadge } from "./score-badge";

type SortKey = keyof AgentSummary;

const SORTABLE_KEYS: SortKey[] = [
  "score",
  "name",
  "category",
  "capability",
  "reliability",
  "efficiency",
  "safety",
  "tools",
  "successRate",
];

function isSortKey(value: string | null): value is SortKey {
  return !!value && (SORTABLE_KEYS as string[]).includes(value);
}

export function RankingTable({ agents }: { agents: AgentSummary[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL is the source of truth: ?sort=score&dir=desc
  const sortParam = searchParams.get("sort");
  const dirParam = searchParams.get("dir");
  const sortKey: SortKey = isSortKey(sortParam) ? sortParam : "score";
  const sortAsc = dirParam === "asc";

  const sorted = useMemo(
    () =>
      [...agents].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortAsc ? aVal - bVal : bVal - aVal;
        }
        return String(aVal).localeCompare(String(bVal)) * (sortAsc ? 1 : -1);
      }),
    [agents, sortKey, sortAsc],
  );

  const handleSort = useCallback(
    (key: SortKey) => {
      const params = new URLSearchParams(searchParams.toString());
      let nextDir: "asc" | "desc";
      if (key === sortKey) {
        nextDir = sortAsc ? "desc" : "asc";
      } else {
        nextDir = "desc";
      }
      params.set("sort", key);
      params.set("dir", nextDir);
      // Default view (score desc) uses a clean URL
      if (key === "score" && nextDir === "desc") {
        params.delete("sort");
        params.delete("dir");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams, sortAsc, sortKey],
  );

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

  function ariaSort(key: SortKey): "ascending" | "descending" | "none" {
    if (sortKey !== key) return "none";
    return sortAsc ? "ascending" : "descending";
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-[var(--color-text-dim)]">
            <th scope="col" className="py-3 px-2 text-left w-8">
              #
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                aria-sort={ariaSort(col.key)}
                tabIndex={0}
                className={`py-3 px-2 text-left cursor-pointer hover:text-white select-none transition-colors ${
                  col.hideOnMobile ? "hidden md:table-cell" : ""
                }`}
                onClick={() => handleSort(col.key)}
                onKeyDown={(e) => e.key === "Enter" && handleSort(col.key)}
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
              className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface)] hover:shadow-sm transition-all"
            >
              <td className="py-3 px-2 text-[var(--color-text-dim)]">
                {i < 3 ? (
                  <span className="font-bold text-[var(--color-accent)]">
                    {i + 1}
                  </span>
                ) : (
                  i + 1
                )}
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
              <td className="py-3 px-2 hidden md:table-cell">{agent.safety}</td>
              <td className="py-3 px-2 hidden md:table-cell">{agent.tools}</td>
              <td className="py-3 px-2">{agent.successRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
