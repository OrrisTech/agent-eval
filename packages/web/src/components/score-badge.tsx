/**
 * Colored score pill — green (80+), yellow (60-79), red (<60)
 */
export function ScoreBadge({
  score,
  size = "md",
}: {
  score: number;
  size?: "sm" | "md" | "lg";
}) {
  const color =
    score >= 80
      ? "bg-emerald-500/20 text-emerald-400"
      : score >= 60
        ? "bg-amber-500/20 text-amber-400"
        : "bg-red-500/20 text-red-400";

  const sizeClass =
    size === "lg"
      ? "text-2xl px-4 py-2 font-bold"
      : size === "sm"
        ? "text-xs px-2 py-0.5"
        : "text-sm px-2.5 py-1 font-semibold";

  return (
    <span className={`inline-block rounded-full ${color} ${sizeClass}`}>
      {score}
    </span>
  );
}
