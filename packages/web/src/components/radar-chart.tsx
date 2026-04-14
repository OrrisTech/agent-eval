/**
 * SVG radar chart for 5-dimension agent scores.
 * Pure server component — no JS dependencies.
 */

const DIMENSIONS = [
  { key: "capability", label: "Capability" },
  { key: "reliability", label: "Reliability" },
  { key: "efficiency", label: "Efficiency" },
  { key: "safety", label: "Safety" },
  { key: "dx", label: "DX" },
] as const;

const SIZE = 240;
const CENTER = SIZE / 2;
const RADIUS = 90;
const LEVELS = 4;

// Calculate point position on the radar for a given dimension index and value (0-100)
function getPoint(index: number, value: number): [number, number] {
  const angle = (Math.PI * 2 * index) / DIMENSIONS.length - Math.PI / 2;
  const r = (value / 100) * RADIUS;
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)];
}

export function RadarChart({
  scores,
}: {
  scores: Record<string, number>;
}) {
  // Build the data polygon path
  const points = DIMENSIONS.map((d, i) => getPoint(i, scores[d.key] ?? 0));
  const polygon = points.map((p) => p.join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[280px]">
      {/* Background rings */}
      {Array.from({ length: LEVELS }, (_, level) => {
        const r = (RADIUS * (level + 1)) / LEVELS;
        const ringPoints = DIMENSIONS.map((_, i) => {
          const angle =
            (Math.PI * 2 * i) / DIMENSIONS.length - Math.PI / 2;
          return `${CENTER + r * Math.cos(angle)},${CENTER + r * Math.sin(angle)}`;
        }).join(" ");
        return (
          <polygon
            key={level}
            points={ringPoints}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="0.5"
          />
        );
      })}

      {/* Axis lines */}
      {DIMENSIONS.map((_, i) => {
        const [x, y] = getPoint(i, 100);
        return (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={x}
            y2={y}
            stroke="var(--color-border)"
            strokeWidth="0.5"
          />
        );
      })}

      {/* Data polygon */}
      <polygon
        points={polygon}
        fill="var(--color-accent)"
        fillOpacity="0.15"
        stroke="var(--color-accent)"
        strokeWidth="2"
      />

      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p[0]}
          cy={p[1]}
          r="3"
          fill="var(--color-accent)"
        />
      ))}

      {/* Labels */}
      {DIMENSIONS.map((d, i) => {
        const [x, y] = getPoint(i, 120);
        return (
          <text
            key={d.key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--color-text-dim)"
            fontSize="10"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}
