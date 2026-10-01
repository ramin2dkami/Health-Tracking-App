import { db } from './schema';
import { todayKey } from './dateKey';
import type {
  SymptomDefinition,
  SymptomLog,
  FoodTag,
  FoodLog,
  MealTemplate,
  MoodLog,
  WeatherLog,
  Profile,
} from './schema';

// --- Symptom definitions ---

export async function listSymptomDefinitions(includeArchived = false): Promise<SymptomDefinition[]> {
  const all = await db.symptomDefinitions.toArray();
  return includeArchived ? all : all.filter((s) => !s.archived);
}

export async function addSymptomDefinition(name: string, color: string): Promise<number> {
  return db.symptomDefinitions.add({
    name,
    color,
    createdAt: new Date().toISOString(),
    archived: false,
  } as SymptomDefinition);
}

// Saturated enough to read as chart lines on the cream background.
export const SYMPTOM_COLORS = ['#e2557f', '#5b7fd6', '#5f9e3f', '#d99a1c', '#8b6fd1', '#d9793a'];

// Matches names case-insensitively and brings back an archived symptom rather than duplicating it.
export async function findOrCreateSymptomDefinition(rawName: string): Promise<SymptomDefinition> {
  const name = rawName.trim();
  const all = await db.symptomDefinitions.toArray();
  const existing = all.find((s) => s.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    if (existing.archived) await db.symptomDefinitions.update(existing.id, { archived: false });
    return { ...existing, archived: false };
  }
  const active = all.filter((s) => !s.archived).length;
  const color = SYMPTOM_COLORS[active % SYMPTOM_COLORS.length];
  const id = await addSymptomDefinition(name, color);
  return (await db.symptomDefinitions.get(id))!;
}

export async function archiveSymptomDefinition(id: number): Promise<void> {
  await db.symptomDefinitions.update(id, { archived: true });
}

export async function renameSymptomDefinition(id: number, name: string, color: string): Promise<void> {
  await db.symptomDefinitions.update(id, { name, color });
}

// --- Symptom logs ---

export async function addSymptomLog(symptomId: number, severity: number, note?: string): Promise<number> {
  const now = new Date();
  return db.symptomLogs.add({
    symptomId,
    severity,
    note,
    timestamp: now.toISOString(),
    dateKey: todayKey(),
  } as SymptomLog);
}

export async function listSymptomLogsForDate(dateKey: string): Promise<SymptomLog[]> {
  return db.symptomLogs.where('dateKey').equals(dateKey).sortBy('timestamp');
}

export async function listSymptomLogsInRange(startKey: string, endKey: string): Promise<SymptomLog[]> {
  return db.symptomLogs.where('dateKey').between(startKey, endKey, true, true).toArray();
}

export async function deleteSymptomLog(id: number): Promise<void> {
  await db.symptomLogs.delete(id);
}

export async function updateSymptomLog(id: number, severity: number, note?: string): Promise<void> {
  await db.symptomLogs.update(id, { severity, note });
}

// --- Food tags ---

export async function listFoodTags(): Promise<FoodTag[]> {
  return db.foodTags.toArray();
}

export async function findOrCreateFoodTag(rawName: string): Promise<number> {
  const name = rawName.trim().toLowerCase();
  const existing = await db.foodTags.where('name').equals(name).first();
  if (existing) return existing.id;
  return db.foodTags.add({ name, createdAt: new Date().toISOString() } as FoodTag);
}

export async function deleteFoodTag(id: number): Promise<void> {
  await db.foodTags.delete(id);
}

// --- Food logs ---

export async function addFoodLog(tagIds: number[], mealLabel?: string): Promise<number> {
  const now = new Date();
  return db.foodLogs.add({
    tagIds,
    mealLabel,
    timestamp: now.toISOString(),
    dateKey: todayKey(),
  } as FoodLog);
}

export async function listFoodLogsForDate(dateKey: string): Promise<FoodLog[]> {
  return db.foodLogs.where('dateKey').equals(dateKey).sortBy('timestamp');
}

export async function listFoodLogsInRange(startKey: string, endKey: string): Promise<FoodLog[]> {
  return db.foodLogs.where('dateKey').between(startKey, endKey, true, true).toArray();
}

export async function deleteFoodLog(id: number): Promise<void> {
  await db.foodLogs.delete(id);
}

// --- Meal templates ---

export async function listMealTemplates(): Promise<MealTemplate[]> {
  return db.mealTemplates.toArray();
}

// Saving under an existing name overwrites that meal's tags.
export async function saveMealTemplate(name: string, tagIds: number[]): Promise<MealTemplate> {
  const clean = name.trim();
  const existing = await db.mealTemplates.where('name').equals(clean).first();
  if (existing) {
    await db.mealTemplates.update(existing.id, { tagIds });
    return { ...existing, tagIds };
  }
  const template = { name: clean, tagIds, createdAt: new Date().toISOString() } as MealTemplate;
  template.id = await db.mealTemplates.add(template);
  return template;
}

export async function updateMealTemplateTags(id: number, tagIds: number[]): Promise<void> {
  await db.mealTemplates.update(id, { tagIds });
}

export async function deleteMealTemplate(id: number): Promise<void> {
  await db.mealTemplates.delete(id);
}

// --- Mood logs ---

export async function addMoodLog(
  moodScore: number,
  stressScore?: number,
  energyScore?: number,
  note?: string,
): Promise<number> {
  const now = new Date();
  return db.moodLogs.add({
    moodScore,
    stressScore,
    energyScore,
    note,
    timestamp: now.toISOString(),
    dateKey: todayKey(),
  } as MoodLog);
}

export async function listMoodLogsForDate(dateKey: string): Promise<MoodLog[]> {
  return db.moodLogs.where('dateKey').equals(dateKey).sortBy('timestamp');
}

export async function listMoodLogsInRange(startKey: string, endKey: string): Promise<MoodLog[]> {
  return db.moodLogs.where('dateKey').between(startKey, endKey, true, true).toArray();
}

/** Days in range with at least one symptom, food or mood entry. */
export async function listLoggedDateKeys(startKey: string, endKey: string): Promise<Set<string>> {
  const tables = [db.symptomLogs, db.foodLogs, db.moodLogs];
  const keys = await Promise.all(
    tables.map((t) => t.where('dateKey').between(startKey, endKey, true, true).keys()),
  );
  return new Set(keys.flat().map(String));
}

export async function deleteMoodLog(id: number): Promise<void> {
  await db.moodLogs.delete(id);
}

// --- Weather logs ---

export async function getWeatherLogForDate(dateKey: string): Promise<WeatherLog | undefined> {
  return db.weatherLogs.where('dateKey').equals(dateKey).first();
}

export async function upsertWeatherLog(entry: Omit<WeatherLog, 'id'>): Promise<void> {
  const existing = await getWeatherLogForDate(entry.dateKey);
  if (existing) {
    await db.weatherLogs.update(existing.id, entry);
  } else {
    await db.weatherLogs.add(entry as WeatherLog);
  }
}

export async function listWeatherLogsInRange(startKey: string, endKey: string): Promise<WeatherLog[]> {
  return db.weatherLogs.where('dateKey').between(startKey, endKey, true, true).toArray();
}

// --- Profile ---

export async function getProfile(): Promise<Profile | undefined> {
  return db.profile.toCollection().first();
}

export async function createProfile(name: string, email?: string): Promise<Profile> {
  const profile = {
    name: name.trim(),
    email: email?.trim() || undefined,
    createdAt: new Date().toISOString(),
    goals: [],
    suspectedTriggers: [],
  } as Omit<Profile, 'id'> as Profile;
  profile.id = await db.profile.add(profile);
  return profile;
}

// Tracks exactly the chosen symptoms: new names are created (or un-archived), unchosen ones are archived.
export async function completeOnboarding(
  profileId: number,
  { symptomNames, goals, triggerNames }: { symptomNames: string[]; goals: string[]; triggerNames: string[] },
): Promise<void> {
  const keptIds = new Set<number>();
  // Sequential so each new symptom gets the next color.
  for (const name of symptomNames) {
    keptIds.add((await findOrCreateSymptomDefinition(name)).id);
  }
  const unchosen = (await listSymptomDefinitions()).filter((s) => !keptIds.has(s.id));
  await Promise.all(unchosen.map((s) => archiveSymptomDefinition(s.id)));

  // Also saved as food tags so they show up as suggestions when logging food.
  await Promise.all(triggerNames.map((n) => findOrCreateFoodTag(n)));
  await db.profile.update(profileId, {
    goals,
    suspectedTriggers: triggerNames,
    onboardedAt: new Date().toISOString(),
  });
}

export async function restartOnboarding(profileId: number): Promise<void> {
  await db.profile.update(profileId, { onboardedAt: undefined });
}
