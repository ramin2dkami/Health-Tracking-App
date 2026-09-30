import type { FoodLog, FoodTag, SymptomDefinition, SymptomLog } from '../../db/schema';

export interface FoodAssociation {
  tagId: number;
  tagName: string;
  avgWith: number;
  avgWithout: number;
  gap: number;
  daysWith: number;
  daysWithout: number;
}

/**
 * For each food tag, average severity on the given days when the tag was eaten vs. when it wasn't.
 * Days missing from severityByDay count as 0 (tracked, but symptom absent).
 * Tags need at least `minDays` on each side to be included. Sorted by largest gap first.
 */
export function compareSeverityByFood(
  severityByDay: Map<string, number>,
  days: string[],
  foodLogs: FoodLog[],
  tags: FoodTag[],
  minDays: number,
): FoodAssociation[] {
  const daySet = new Set(days);
  const tagDays = new Map<number, Set<string>>();
  for (const log of foodLogs) {
    if (!daySet.has(log.dateKey)) continue;
    for (const tagId of log.tagIds) {
      const set = tagDays.get(tagId) ?? new Set<string>();
      set.add(log.dateKey);
      tagDays.set(tagId, set);
    }
  }

  const average = (ds: string[]) => ds.reduce((sum, d) => sum + (severityByDay.get(d) ?? 0), 0) / ds.length;

  const results: FoodAssociation[] = [];
  for (const tag of tags) {
    const withSet = tagDays.get(tag.id);
    if (!withSet || withSet.size < minDays) continue;
    const withDays = [...withSet];
    const withoutDays = days.filter((d) => !withSet.has(d));
    if (withoutDays.length < minDays) continue;
    const avgWith = average(withDays);
    const avgWithout = average(withoutDays);
    results.push({
      tagId: tag.id,
      tagName: tag.name,
      avgWith,
      avgWithout,
      gap: avgWith - avgWithout,
      daysWith: withDays.length,
      daysWithout: withoutDays.length,
    });
  }

  return results.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
}

/** avgWith / avgWithout are the share (0–1) of tracked days the symptom appeared, with vs. without the food. */
export interface SymptomFoodLink extends FoodAssociation {
  symptom: SymptomDefinition;
}

/**
 * Per symptom, compares how often it appeared on days with vs. without each food.
 * "Tracked" days are days with any symptom logged (from all of `symptomLogs`, not just `symptoms`).
 */
export function linkFoodsToSymptoms(
  days: string[],
  symptomLogs: SymptomLog[],
  foodLogs: FoodLog[],
  tags: FoodTag[],
  symptoms: SymptomDefinition[],
  minDays: number,
): SymptomFoodLink[] {
  const daySet = new Set(days);
  const inRange = symptomLogs.filter((l) => daySet.has(l.dateKey));
  const loggedDays = new Set(inRange.map((l) => l.dateKey));
  const trackedDays = days.filter((d) => loggedDays.has(d));

  const links: SymptomFoodLink[] = [];
  for (const symptom of symptoms) {
    const present = new Map(inRange.filter((l) => l.symptomId === symptom.id).map((l) => [l.dateKey, 1]));
    if (present.size === 0) continue;
    for (const assoc of compareSeverityByFood(present, trackedDays, foodLogs, tags, minDays)) {
      links.push({ ...assoc, symptom });
    }
  }
  return links;
}
