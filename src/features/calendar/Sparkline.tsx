import { DENSE_DAYS, rolling } from './trendFormat';

const SMOOTHING_DAYS = 7;
/** Past this many days, the averaging window grows with the range (90 days → 15-day window). */
const LONG_RANGE_DAYS = 60;
const LONG_RANGE_WINDOWS = 6;
const POINTS_PER_WINDOW = 3;

function smoothingWindow(days: number): number {
  if (days < DENSE_DAYS) return 1;
  if (days < LONG_RANGE_DAYS) return SMOOTHING_DAYS;
  return Math.round(days / LONG_RANGE_WINDOWS);
}

/** Curve through the points, using each midpoint as a joint so the line has no corners. */
function curvePath(points: { x: number; y: number }[]): string {
  if (points.length < 3) return points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q${points[i].x} ${points[i].y} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
  }
  const last = points[points.length - 1];
  return `${d} L${last.x} ${last.y}`;
}

/** Severity (0–5) line, stretched to its CSS box. Longer ranges are averaged over wider windows. */
export function Sparkline({
  values,
  color,
  className,
  area = false,
}: {
  values: number[];
  color: string;
  className?: string;
  area?: boolean;
}) {
  const span = smoothingWindow(values.length);
  const long = values.length >= LONG_RANGE_DAYS;
  let smoothed = span > 1 ? rolling(values, span) : values;
  // Long ranges get a second pass (weighting nearby days more, which removes day-to-day jitter)
  // and plot a point every few days; the curve fills in between.
  if (long) smoothed = rolling(smoothed, span);
  const n = smoothed.length;
  const step = long ? Math.max(1, Math.floor(span / POINTS_PER_WINDOW)) : 1;
  const indexes = smoothed.map((_, i) => i).filter((i) => i % step === 0 || i === n - 1);
  const line = curvePath(
    indexes.map((i) => ({
      x: n === 1 ? 50 : Number(((i / (n - 1)) * 100).toFixed(2)),
      y: Number((100 - (smoothed[i] / 5) * 100).toFixed(2)),
    })),
  );

  return (
    <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {area ? <path d={`${line} L100 100 L0 100 Z`} fill={color} opacity={0.14} /> : null}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
