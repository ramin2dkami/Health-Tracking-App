import {
  listSymptomLogsInRange,
  listFoodLogsInRange,
  listMoodLogsInRange,
  listSymptomDefinitions,
  listFoodTags,
} from '../../db/repository';
import { toDateKey, dateKeysBetween } from '../../db/dateKey';
import { aggregateMaxSeverityByDay } from '../calendar/aggregateSeverity';
import { linkFoodsToSymptoms, type SymptomFoodLink } from '../calendar/foodAssociations';
import { computeDayScore } from './dayScore';
import type { SymptomLog, MoodLog } from '../../db/schema';

export type InsightWindow = 7 | 30 | 90;

// A food is a possible trigger when a symptom shows up on a clearly larger share of days with it.
const TRIGGER_MIN_DAYS = 4;
const TRIGGER_MIN_GAP = 0.25;
// "Avoid" needs a strong, consistent link backed by more days; anything weaker is "Limit".
const AVOID_MIN_GAP = 0.5;
const AVOID_MIN_RATE = 0.75;
const AVOID_MIN_DAYS = 6;
// "May help" is more often coincidence, so it needs more data and a bigger difference.
const HELPER_MIN_DAYS = 6;
const HELPER_MIN_GAP = 0.3;
const MAX_TRIGGERS = 3;
const MAX_HELPERS = 2;
// Stress card: 1–2 is calm, 4–5 is stressed; a symptom needs to show up on a clearly larger share of stressed days.
const CALM_MAX_STRESS = 2;
const STRESSED_MIN_STRESS = 4;
const STRESS_MIN_DAYS = 4;
const STRESS_MIN_GAP = 0.2;
const MAX_STRESS_EFFECTS = 3;
const LIGHT_DAY_MAX_SEVERITY = 2;
const BAD_DAY_MIN_SEVERITY = 4;
const MIN_LOGS_FOR_AVG = 2;

interface WindowRange {
  startKey: string;
  endKey: string;
  prevStartKey: string;
  prevEndKey: string;
}

function computeWindowRange(days: InsightWindow, now = new Date()): WindowRange {
  const endKey = toDateKey(now);
  const startKey = toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)));
  const prevEndKey = toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - days));
  const prevStartKey = toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (2 * days - 1)));
  return { startKey, endKey, prevStartKey, prevEndKey };
}

/** Last logged value per day (matches HomeScreen's "latest mood of the day" convention). */
function latestPerDay<T extends { dateKey: string; timestamp: string }>(logs: T[]): Map<string, T> {
  const byDay = new Map<string, T>();
  for (const log of logs) {
    const current = byDay.get(log.dateKey);
    if (!current || log.timestamp > current.timestamp) byDay.set(log.dateKey, log);
  }
  return byDay;
}

// --- Card 1: weekly trend ---

export interface TrendInsight {
  points: { dateKey: string; score: number }[];
  currentAvg: number | null;
  previousAvg: number | null;
  deltaPct: number | null;
}

function averageDayScore(
  startKey: string,
  endKey: string,
  severityByDay: Map<string, number>,
  moodByDay: Map<string, MoodLog>,
): { points: { dateKey: string; score: number }[]; avg: number | null } {
  const points: { dateKey: string; score: number }[] = [];
  for (const key of dateKeysBetween(startKey, endKey)) {
    const mood = moodByDay.get(key);
    const score = computeDayScore({
      maxSeverity: severityByDay.get(key),
      mood: mood?.moodScore,
      stress: mood?.stressScore,
    });
    if (score !== null) points.push({ dateKey: key, score });
  }
  const avg = points.length > 0 ? points.reduce((a, b) => a + b.score, 0) / points.length : null;
  return { points, avg };
}

export async function computeTrendInsight(days: InsightWindow): Promise<TrendInsight> {
  const { startKey, endKey, prevStartKey, prevEndKey } = computeWindowRange(days);

  const [severityByDay, prevSeverityByDay, moodLogs, prevMoodLogs] = await Promise.all([
    aggregateMaxSeverityByDay(startKey, endKey),
    aggregateMaxSeverityByDay(prevStartKey, prevEndKey),
    listMoodLogsInRange(startKey, endKey),
    listMoodLogsInRange(prevStartKey, prevEndKey),
  ]);

  const current = averageDayScore(startKey, endKey, severityByDay, latestPerDay(moodLogs));
  const previous = averageDayScore(prevStartKey, prevEndKey, prevSeverityByDay, latestPerDay(prevMoodLogs));

  const deltaPct =
    current.avg !== null && previous.avg !== null && previous.avg !== 0
      ? ((current.avg - previous.avg) / previous.avg) * 100
      : null;

  return { points: current.points, currentAvg: current.avg, previousAvg: previous.avg, deltaPct };
}

// --- Card 2: symptom x food correlation ---

export type FoodEffectLevel = 'avoid' | 'limit' | 'help';

export interface FoodEffect {
  tagId: number;
  tagName: string;
  level: FoodEffectLevel;
  /** Strongest link first. */
  links: SymptomFoodLink[];
}

const isAvoid = (l: SymptomFoodLink) =>
  l.gap >= AVOID_MIN_GAP && l.avgWith >= AVOID_MIN_RATE && l.daysWith >= AVOID_MIN_DAYS;

export interface TriggerInsight {
  triggers: FoodEffect[];
  helpers: FoodEffect[];
}

function groupByFood(links: SymptomFoodLink[], levelOf: (links: SymptomFoodLink[]) => FoodEffectLevel): FoodEffect[] {
  const byTag = new Map<number, SymptomFoodLink[]>();
  for (const link of links) byTag.set(link.tagId, [...(byTag.get(link.tagId) ?? []), link]);

  const levelRank: Record<FoodEffectLevel, number> = { avoid: 0, limit: 1, help: 2 };
  return [...byTag.values()]
    .map((group) => {
      const sorted = group.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
      return { tagId: sorted[0].tagId, tagName: sorted[0].tagName, level: levelOf(sorted), links: sorted };
    })
    .sort((a, b) => levelRank[a.level] - levelRank[b.level] || Math.abs(b.links[0].gap) - Math.abs(a.links[0].gap));
}

export async function computeTriggerInsight(days: InsightWindow): Promise<TriggerInsight> {
  const { startKey, endKey } = computeWindowRange(days);

  const [symptomLogs, foodLogs, tags, symptoms] = await Promise.all([
    listSymptomLogsInRange(startKey, endKey),
    listFoodLogsInRange(startKey, endKey),
    listFoodTags(),
    listSymptomDefinitions(),
  ]);

  const links = linkFoodsToSymptoms(
    dateKeysBetween(startKey, endKey),
    symptomLogs,
    foodLogs,
    tags,
    symptoms,
    TRIGGER_MIN_DAYS,
  );

  const allTriggers = groupByFood(
    links.filter((l) => l.gap >= TRIGGER_MIN_GAP),
    (group) => (group.some(isAvoid) ? 'avoid' : 'limit'),
  );
  const triggerIds = new Set(allTriggers.map((t) => t.tagId));
  const helpers = groupByFood(
    links.filter(
      (l) => l.gap <= -HELPER_MIN_GAP && l.daysWith >= HELPER_MIN_DAYS && l.daysWithout >= HELPER_MIN_DAYS,
    ),
    () => 'help',
  ).filter((h) => !triggerIds.has(h.tagId));

  return { triggers: allTriggers.slice(0, MAX_TRIGGERS), helpers: helpers.slice(0, MAX_HELPERS) };
}

// --- Card 3: stress & mood ---

export interface StressSymptomEffect {
  symptom: { id: number; name: string; color: string };
  /** Share (0–1) of calm / stressed days the symptom showed up (or, for next-day effects, the day after). */
  calmRate: number;
  stressedRate: number;
}

export interface MoodCost {
  lightDayAvg: number;
  badDayAvg: number;
  lightDays: number;
  badDays: number;
}

export interface StressMoodInsight {
  calmDays: number;
  stressedDays: number;
  /** Enough calm and stressed days to compare at all. */
  canCompare: boolean;
  /** Same-day effects, strongest first. */
  sameDay: StressSymptomEffect[];
  /** Strongest effect that shows up the day after a stressful day, for a symptom not already in `sameDay`. */
  nextDay: StressSymptomEffect | null;
  mood: MoodCost | null;
}

function nextDateKey(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return toDateKey(d);
}

export async function computeStressMoodInsight(days: InsightWindow): Promise<StressMoodInsight> {
  const { startKey, endKey } = computeWindowRange(days);

  const [moodLogs, symptomLogs, symptoms] = await Promise.all([
    listMoodLogsInRange(startKey, endKey),
    listSymptomLogsInRange(startKey, endKey),
    listSymptomDefinitions(),
  ]);

  // A day with a check-in counts as tracked, so days with no symptoms logged count as symptom-free.
  const checkIns = latestPerDay(moodLogs);
  const symptomDays = new Map<number, Set<string>>();
  const worstByDay = new Map<string, number>();
  for (const log of symptomLogs) {
    symptomDays.set(log.symptomId, (symptomDays.get(log.symptomId) ?? new Set()).add(log.dateKey));
    worstByDay.set(log.dateKey, Math.max(worstByDay.get(log.dateKey) ?? 0, log.severity));
  }

  const calm: string[] = [];
  const stressed: string[] = [];
  for (const [dateKey, log] of checkIns) {
    if (log.stressScore === undefined) continue;
    if (log.stressScore <= CALM_MAX_STRESS) calm.push(dateKey);
    else if (log.stressScore >= STRESSED_MIN_STRESS) stressed.push(dateKey);
  }

  const rate = (ds: string[], present: Set<string>) => ds.filter((d) => present.has(d)).length / ds.length;
  const effectsFor = (calmDays: string[], stressedDays: string[]) => {
    if (calmDays.length < STRESS_MIN_DAYS || stressedDays.length < STRESS_MIN_DAYS) return [];
    return symptoms
      .map((s) => {
        const present = symptomDays.get(s.id) ?? new Set<string>();
        return {
          symptom: { id: s.id, name: s.name, color: s.color },
          calmRate: rate(calmDays, present),
          stressedRate: rate(stressedDays, present),
        };
      })
      .filter((e) => e.stressedRate - e.calmRate >= STRESS_MIN_GAP)
      .sort((a, b) => b.stressedRate - b.calmRate - (a.stressedRate - a.calmRate));
  };

  const sameDay = effectsFor(calm, stressed).slice(0, MAX_STRESS_EFFECTS);
  // Only follow-up days that were themselves tracked, so a missing check-in isn't read as symptom-free.
  const followUps = (ds: string[]) => ds.map(nextDateKey).filter((d) => checkIns.has(d));
  const shown = new Set(sameDay.map((e) => e.symptom.id));
  const nextDay = effectsFor(followUps(calm), followUps(stressed)).find((e) => !shown.has(e.symptom.id)) ?? null;

  const light = [...checkIns.keys()].filter((d) => (worstByDay.get(d) ?? 0) <= LIGHT_DAY_MAX_SEVERITY);
  const bad = [...checkIns.keys()].filter((d) => (worstByDay.get(d) ?? 0) >= BAD_DAY_MIN_SEVERITY);
  const avgMood = (ds: string[]) => ds.reduce((sum, d) => sum + checkIns.get(d)!.moodScore, 0) / ds.length;
  const mood =
    light.length >= STRESS_MIN_DAYS && bad.length >= STRESS_MIN_DAYS
      ? { lightDayAvg: avgMood(light), badDayAvg: avgMood(bad), lightDays: light.length, badDays: bad.length }
      : null;

  return {
    calmDays: calm.length,
    stressedDays: stressed.length,
    canCompare: calm.length >= STRESS_MIN_DAYS && stressed.length >= STRESS_MIN_DAYS,
    sameDay,
    nextDay,
    mood,
  };
}

// --- Card 4: top/worst symptom summary ---

export interface SymptomSummaryInsight {
  mostFrequent: { symptomId: number; name: string; color: string; days: number } | null;
  highestAvgSeverity: { symptomId: number; name: string; color: string; avgSeverity: number; count: number } | null;
}

export async function computeSymptomSummaryInsight(days: InsightWindow): Promise<SymptomSummaryInsight> {
  const { startKey, endKey } = computeWindowRange(days);

  const [logs, symptoms] = await Promise.all([
    listSymptomLogsInRange(startKey, endKey),
    listSymptomDefinitions(true),
  ]);

  if (logs.length === 0) return { mostFrequent: null, highestAvgSeverity: null };

  const bySymptom = new Map<number, SymptomLog[]>();
  for (const log of logs) {
    const existing = bySymptom.get(log.symptomId) ?? [];
    existing.push(log);
    bySymptom.set(log.symptomId, existing);
  }

  let mostFrequent: SymptomSummaryInsight['mostFrequent'] = null;
  let highestAvgSeverity: SymptomSummaryInsight['highestAvgSeverity'] = null;

  for (const [symptomId, symptomLogs] of bySymptom) {
    const def = symptoms.find((s) => s.id === symptomId);
    if (!def) continue;
    const count = symptomLogs.length;
    const daysWithSymptom = new Set(symptomLogs.map((l) => l.dateKey)).size;

    if (!mostFrequent || daysWithSymptom > mostFrequent.days) {
      mostFrequent = { symptomId, name: def.name, color: def.color, days: daysWithSymptom };
    }

    if (count >= MIN_LOGS_FOR_AVG) {
      const avgSeverity = symptomLogs.reduce((sum, l) => sum + l.severity, 0) / count;
      if (!highestAvgSeverity || avgSeverity > highestAvgSeverity.avgSeverity) {
        highestAvgSeverity = { symptomId, name: def.name, color: def.color, avgSeverity, count };
      }
    }
  }

  return { mostFrequent, highestAvgSeverity };
}

// --- Orchestrator ---

export interface HomeInsights {
  trend: TrendInsight;
  triggers: TriggerInsight;
  stressMood: StressMoodInsight;
  symptomSummary: SymptomSummaryInsight;
}

export async function computeHomeInsights(days: InsightWindow): Promise<HomeInsights> {
  const [trend, triggers, stressMood, symptomSummary] = await Promise.all([
    computeTrendInsight(days),
    computeTriggerInsight(days),
    computeStressMoodInsight(days),
    computeSymptomSummaryInsight(days),
  ]);
  return { trend, triggers, stressMood, symptomSummary };
}
