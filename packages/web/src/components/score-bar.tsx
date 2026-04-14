/**
 * Horizontal bar for showing a dimension score (0-100)
 */
export function ScoreBar({
  label,
  score,
  weight,
}: {
  label: string;
  score: number;
  weight?: string;
}) {
  const color =
    score >= 80
      ? "bg-emerald-500"
      : score >= 60
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-sm text-[var(--color-text-dim)] shrink-0">
        {label}
        {weight && (
          <span className="text-xs text-[var(--color-text-dim)]/50 ml-1">
            ({weight})
          </span>
        )}
      </span>
      <div className="flex-1 h-3 rounded-full bg-[var(--color-border)] overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-10 text-right text-sm font-mono">{score}%</span>
    </div>
  );
}
