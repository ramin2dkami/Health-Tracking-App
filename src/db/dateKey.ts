/** Derives a local-time YYYY-MM-DD key so entries land on the day the user experienced them, not UTC's. */
export function toDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** Every date key from start to end, inclusive. */
export function dateKeysBetween(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  const cursor = new Date(`${startKey}T00:00:00`);
  const end = new Date(`${endKey}T00:00:00`);
  while (cursor <= end) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}
