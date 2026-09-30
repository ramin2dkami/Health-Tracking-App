import type { SymptomTrend } from './summarizeTrends';

/** Ranges at least this long get smoothed sparklines and proportionally spaced bars. */
export const DENSE_DAYS = 30;

export function shortDate(dateKey: string): string {
  const [, m, d] = dateKey.split('-').map(Number);
  return `${m}/${d}`;
}

export const pct = (share: number) => `${Math.round(share * 100)}%`;

export function directionPhrase(t: SymptomTrend): string {
  switch (t.direction) {
    case 'improving':
      return `, easing off (${t.firstHalfAvg!.toFixed(1)} → ${t.secondHalfAvg!.toFixed(1)})`;
    case 'worsening':
      return `, getting worse (${t.firstHalfAvg!.toFixed(1)} → ${t.secondHalfAvg!.toFixed(1)})`;
    case 'steady':
      return ', holding steady';
    default:
      return '';
  }
}

/** Average over a `window`-day span centered on each day (shrinks at the edges). */
export function rolling(values: number[], window: number): number[] {
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - half), i + half + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}
