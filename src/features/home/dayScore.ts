/**
 * 0–10 score for a day, averaging whichever signals were logged:
 * worst symptom (inverted), latest mood, latest stress (inverted). Null when nothing was logged.
 */
export function computeDayScore({
  maxSeverity,
  mood,
  stress,
}: {
  maxSeverity?: number;
  mood?: number;
  stress?: number;
}): number | null {
  const parts: number[] = [];
  if (maxSeverity !== undefined) parts.push((5 - maxSeverity) / 4);
  if (mood !== undefined) parts.push((mood - 1) / 4);
  if (stress !== undefined) parts.push((5 - stress) / 4);
  if (parts.length === 0) return null;
  const avg = parts.reduce((a, b) => a + b, 0) / parts.length;
  return Math.round(avg * 100) / 10;
}
