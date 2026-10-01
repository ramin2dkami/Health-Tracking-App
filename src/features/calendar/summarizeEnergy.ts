import type { MoodLog } from '../../db/schema';
import { FLARE_SEVERITY, MIN_HALF_DAYS, TREND_THRESHOLD, type TrendDirection } from './summarizeTrends';

/** Each side of the flare comparison needs at least this many check-in days. */
const MIN_COMPARE_DAYS = 3;

export interface EnergySummary {
  avg: number;
  daysLogged: number;
  /** 'improving' means energy went up. */
  direction: TrendDirection | null;
  /** Daily energy aligned with `days`; gaps carry the nearest earlier check-in so the line doesn't drop to 0. */
  series: number[];
  flareAvg: number | null;
  otherAvg: number | null;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** `worstByDay` is the worst severity among the symptoms in scope, aligned with `days`. */
export function summarizeEnergy(days: string[], moodLogs: MoodLog[], worstByDay: number[]): EnergySummary | null {
  // The latest check-in of the day wins, matching how the Home insights read check-ins.
  const byDay = new Map<string, { timestamp: string; energy: number }>();
  for (const log of moodLogs) {
    if (log.energyScore === undefined) continue;
    const current = byDay.get(log.dateKey);
    if (!current || log.timestamp > current.timestamp) {
      byDay.set(log.dateKey, { timestamp: log.timestamp, energy: log.energyScore });
    }
  }
  const values = days.map((d) => byDay.get(d)?.energy ?? null);
  const logged = values.filter((v): v is number => v !== null);
  if (logged.length === 0) return null;

  const mid = Math.floor(days.length / 2);
  const first = values.slice(0, mid).filter((v): v is number => v !== null);
  const second = values.slice(mid).filter((v): v is number => v !== null);
  let direction: TrendDirection | null = null;
  if (first.length >= MIN_HALF_DAYS && second.length >= MIN_HALF_DAYS) {
    const diff = mean(second) - mean(first);
    direction = diff >= TREND_THRESHOLD ? 'improving' : diff <= -TREND_THRESHOLD ? 'worsening' : 'steady';
  }

  const flare: number[] = [];
  const other: number[] = [];
  values.forEach((v, i) => {
    if (v === null) return;
    if ((worstByDay[i] ?? 0) >= FLARE_SEVERITY) flare.push(v);
    else other.push(v);
  });
  const canCompare = flare.length >= MIN_COMPARE_DAYS && other.length >= MIN_COMPARE_DAYS;

  let last = logged[0];
  const series = values.map((v) => (v === null ? last : (last = v)));

  return {
    avg: mean(logged),
    daysLogged: logged.length,
    direction,
    series,
    flareAvg: canCompare ? mean(flare) : null,
    otherAvg: canCompare ? mean(other) : null,
  };
}
