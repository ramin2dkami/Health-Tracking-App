import type { FoodLog, FoodTag, SymptomDefinition, SymptomLog } from '../../db/schema';
import { linkFoodsToSymptoms, type SymptomFoodLink } from './foodAssociations';

const TREND_THRESHOLD = 0.4;
const MIN_HALF_DAYS = 2;
export const FLARE_SEVERITY = 4;
const MIN_FOOD_DAYS = 4;
const MIN_RATE_GAP = 0.25;

export type TrendDirection = 'improving' | 'worsening' | 'steady';

export interface SymptomTrend {
  symptom: SymptomDefinition;
  avg: number;
  daysLogged: number;
  firstHalfAvg: number | null;
  secondHalfAvg: number | null;
  direction: TrendDirection | null;
  /** Max severity per day, aligned with `days` (0 = not logged). */
  series: number[];
}

export interface TrendSummaryData {
  trends: SymptomTrend[];
  /** Worst severity across the given symptoms per day, aligned with `days`. */
  worstByDay: number[];
  flareDays: number;
  longestFlare: { startKey: string; endKey: string; startIndex: number; days: number } | null;
  /** Every link that clears the rate gap, strongest first. */
  foodLinks: SymptomFoodLink[];
}

function maxByDay(logs: SymptomLog[]): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const log of logs) {
    if (log.severity > (byDay.get(log.dateKey) ?? 0)) byDay.set(log.dateKey, log.severity);
  }
  return byDay;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Summarizes the visible symptoms over `days` (contiguous, ascending).
 * `allLogs` includes hidden symptoms too: any symptom logged marks a day as "tracked" for food comparisons.
 */
export function summarizeTrends({
  days,
  allLogs,
  foodLogs,
  tags,
  symptoms,
}: {
  days: string[];
  allLogs: SymptomLog[];
  foodLogs: FoodLog[];
  tags: FoodTag[];
  symptoms: SymptomDefinition[];
}): TrendSummaryData {
  const empty: TrendSummaryData = { trends: [], worstByDay: [], flareDays: 0, longestFlare: null, foodLinks: [] };
  if (days.length === 0 || symptoms.length === 0) return empty;

  const daySet = new Set(days);
  const inRange = allLogs.filter((l) => daySet.has(l.dateKey));
  const midKey = days[Math.floor(days.length / 2)];

  const trends: SymptomTrend[] = [];

  for (const symptom of symptoms) {
    const byDay = maxByDay(inRange.filter((l) => l.symptomId === symptom.id));
    if (byDay.size === 0) continue;

    const entries = [...byDay];
    const first = entries.filter(([d]) => d < midKey).map(([, v]) => v);
    const second = entries.filter(([d]) => d >= midKey).map(([, v]) => v);
    const firstHalfAvg = first.length >= MIN_HALF_DAYS ? mean(first) : null;
    const secondHalfAvg = second.length >= MIN_HALF_DAYS ? mean(second) : null;

    let direction: TrendDirection | null = null;
    if (firstHalfAvg !== null && secondHalfAvg !== null) {
      const diff = secondHalfAvg - firstHalfAvg;
      direction = diff <= -TREND_THRESHOLD ? 'improving' : diff >= TREND_THRESHOLD ? 'worsening' : 'steady';
    }

    trends.push({
      symptom,
      avg: mean([...byDay.values()]),
      daysLogged: byDay.size,
      firstHalfAvg,
      secondHalfAvg,
      direction,
      series: days.map((d) => byDay.get(d) ?? 0),
    });
  }

  trends.sort((a, b) => b.avg - a.avg);
  const foodLinks = linkFoodsToSymptoms(days, allLogs, foodLogs, tags, symptoms, MIN_FOOD_DAYS)
    .filter((l) => l.gap >= MIN_RATE_GAP)
    .sort((a, b) => b.gap - a.gap);

  const visibleIds = new Set(symptoms.map((s) => s.id));
  const combined = maxByDay(inRange.filter((l) => visibleIds.has(l.symptomId)));
  const worstByDay = days.map((d) => combined.get(d) ?? 0);
  let flareDays = 0;
  let longestFlare: TrendSummaryData['longestFlare'] = null;
  let runStart = -1;
  days.forEach((d, i) => {
    const isFlare = worstByDay[i] >= FLARE_SEVERITY;
    if (isFlare) {
      flareDays++;
      if (runStart === -1) runStart = i;
      const length = i - runStart + 1;
      if (!longestFlare || length > longestFlare.days) {
        longestFlare = { startKey: days[runStart], endKey: d, startIndex: runStart, days: length };
      }
    } else {
      runStart = -1;
    }
  });

  return { trends, worstByDay, flareDays, longestFlare, foodLinks };
}
