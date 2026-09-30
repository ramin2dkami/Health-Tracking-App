import { listSymptomLogsInRange } from '../../db/repository';
import type { SymptomLog } from '../../db/schema';

/** Max severity per day in range, optionally scoped to one symptom. Max is the more useful "was this a bad day" signal. */
export async function aggregateMaxSeverityByDay(
  startKey: string,
  endKey: string,
  symptomId?: number,
): Promise<Map<string, number>> {
  const logs = await listSymptomLogsInRange(startKey, endKey);
  const filtered = symptomId ? logs.filter((l) => l.symptomId === symptomId) : logs;
  const byDay = new Map<string, number>();
  for (const log of filtered) {
    const current = byDay.get(log.dateKey) ?? 0;
    if (log.severity > current) byDay.set(log.dateKey, log.severity);
  }
  return byDay;
}

export function groupLogsByDay(logs: SymptomLog[]): Map<string, SymptomLog[]> {
  const byDay = new Map<string, SymptomLog[]>();
  for (const log of logs) {
    const existing = byDay.get(log.dateKey) ?? [];
    existing.push(log);
    byDay.set(log.dateKey, existing);
  }
  return byDay;
}
