import Dexie, { type EntityTable } from 'dexie';

export interface SymptomDefinition {
  id: number;
  name: string;
  color: string;
  createdAt: string;
  archived: boolean;
}

export interface SymptomLog {
  id: number;
  symptomId: number;
  severity: number; // 1-5
  timestamp: string;
  dateKey: string; // YYYY-MM-DD, local time
  note?: string;
}

export interface FoodTag {
  id: number;
  name: string;
  createdAt: string;
}

export interface FoodLog {
  id: number;
  timestamp: string;
  dateKey: string;
  tagIds: number[];
  mealLabel?: string;
}

export interface MoodLog {
  id: number;
  timestamp: string;
  dateKey: string;
  moodScore: number; // 1-5
  stressScore?: number; // 1-5
  anxietyScore?: number; // 1-5
  note?: string;
}

export interface MealTemplate {
  id: number;
  name: string;
  tagIds: number[];
  createdAt: string;
}

export interface WeatherLog {
  id: number;
  dateKey: string; // unique, one per day
  fetchedAt: string;
  lat: number;
  lon: number;
  tempC: number;
  pressureHPa: number;
  precipitationMm: number;
  weatherCode: number;
  humidity?: number;
}

// Local-only profile: one row per browser, no password. Created on the welcome screen.
export interface Profile {
  id: number;
  name: string;
  email?: string;
  createdAt: string;
  onboardedAt?: string; // unset until onboarding is finished
  goals: string[]; // ids from ONBOARDING_GOALS
  suspectedTriggers: string[]; // food names; kept as names so clearing or replacing food tags can't orphan them
}

export const db = new Dexie('HealthDiaryDB') as Dexie & {
  symptomDefinitions: EntityTable<SymptomDefinition, 'id'>;
  symptomLogs: EntityTable<SymptomLog, 'id'>;
  foodTags: EntityTable<FoodTag, 'id'>;
  foodLogs: EntityTable<FoodLog, 'id'>;
  mealTemplates: EntityTable<MealTemplate, 'id'>;
  moodLogs: EntityTable<MoodLog, 'id'>;
  weatherLogs: EntityTable<WeatherLog, 'id'>;
  profile: EntityTable<Profile, 'id'>;
};

db.version(1).stores({
  symptomDefinitions: '++id, &name, archived',
  symptomLogs: '++id, symptomId, dateKey, timestamp',
  foodTags: '++id, &name',
  foodLogs: '++id, dateKey, timestamp, *tagIds',
  moodLogs: '++id, dateKey, timestamp',
  weatherLogs: '++id, &dateKey',
});

db.version(2).stores({
  mealTemplates: '++id, &name',
});

db.version(3).stores({
  profile: '++id',
});

// Tables holding diary entries. Clearing or replacing the diary leaves the profile alone.
export const diaryTables = () => db.tables.filter((t) => t.name !== 'profile');
