import { db, diaryTables } from './schema';
import { toDateKey } from './dateKey';
import { SYMPTOM_COLORS } from './repository';
import type { SymptomDefinition, SymptomLog, FoodTag, FoodLog, MealTemplate, MoodLog, WeatherLog } from './schema';

/*
 * Demo persona: someone with IBS whose gut flares ripple out into seborrheic dermatitis,
 * anxiety and poor sleep. Dairy, garlic, onion, beans and wheat drive gut symptoms; coffee drives
 * anxiety and bad sleep; alcohol and sugar drive skin flares; peppermint tea eases bloating.
 * Stress (4–5) brings on anxiety and poor sleep the same day and skin flares the next.
 * The evening check-in records mood, stress and energy; energy drops after poor sleep and on bad days.
 * Trigger foods get rarer over the 90 days, as if they're learning what to avoid, so trends improve.
 *
 * Food effects land on the same day as the food because the insight code compares same-day
 * symptom and food presence.
 */

const DAYS = 90;
// Picked because it tells the clearest story in the 30- and 90-day insights (triggers and stress & mood).
const SEED = 108;

// Deterministic so the demo looks the same every time it's loaded.
function makeRandom(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type Trigger = 'dairy' | 'garlic' | 'onion' | 'beans' | 'wheat' | 'coffee' | 'alcohol' | 'sugar';

// Everything the model can bring on, each logged as a symptom.
const EFFECTS = ['Bloating', 'Stomach pain', 'Seborrheic dermatitis', 'Anxiety', 'Poor sleep'] as const;
type SymptomName = (typeof EFFECTS)[number];
// Anxiety goes last so the other symptoms keep the colors they had before it was logged.
const LOGGED_SYMPTOMS: SymptomName[] = [...EFFECTS.filter((name) => name !== 'Anxiety'), 'Anxiety'];

// Each meal is a safe base plus the triggers it carries. Risky meals reuse the everyday base foods,
// so only the trigger itself stands out in the insights.
const BREAKFASTS: { tags: string[]; triggers: Trigger[] }[] = [
  { tags: ['oats', 'banana', 'peanut butter'], triggers: [] },
  { tags: ['eggs', 'spinach'], triggers: [] },
  { tags: ['oats', 'blueberries', 'lactose-free yogurt'], triggers: [] },
  { tags: ['eggs', 'spinach'], triggers: ['wheat', 'dairy'] },
  { tags: ['oats', 'banana'], triggers: ['dairy'] },
];
const LUNCHES: { label: string; tags: string[]; triggers: Trigger[] }[] = [
  { label: 'Lunch', tags: ['chicken', 'rice', 'carrots'], triggers: [] },
  { label: 'Lunch', tags: ['salmon', 'rice', 'spinach'], triggers: [] },
  { label: 'Lunch', tags: ['chicken', 'potato', 'carrots'], triggers: [] },
  { label: 'Chicken wrap', tags: ['chicken', 'spinach'], triggers: ['wheat', 'dairy'] },
  { label: 'Burrito bowl', tags: ['rice', 'chicken'], triggers: ['beans', 'onion'] },
  { label: 'Lentil soup', tags: ['carrots', 'potato'], triggers: ['garlic', 'beans'] },
];
const DINNERS: { label: string; tags: string[]; triggers: Trigger[] }[] = [
  { label: 'Dinner', tags: ['chicken', 'rice', 'zucchini'], triggers: [] },
  { label: 'Dinner', tags: ['salmon', 'potato', 'zucchini'], triggers: [] },
  { label: 'Dinner', tags: ['salmon', 'rice', 'carrots'], triggers: [] },
  { label: 'Dinner', tags: ['chicken', 'rice', 'tomato sauce'], triggers: [] },
  { label: 'Pizza night', tags: ['tomato sauce'], triggers: ['wheat', 'dairy', 'garlic', 'onion'] },
  { label: 'Pasta', tags: ['tomato sauce', 'zucchini'], triggers: ['wheat', 'garlic'] },
  { label: 'Takeout curry', tags: ['chicken', 'rice'], triggers: ['onion', 'dairy'] },
  { label: 'Chili', tags: ['rice', 'carrots'], triggers: ['beans', 'onion'] },
];

const TRIGGERS = new Set<string>(['dairy', 'garlic', 'onion', 'beans', 'wheat', 'coffee', 'alcohol', 'sugar']);

// Daily chances for the add-ons that aren't part of a meal, before the 90-day improvement kicks in.
const COFFEE_CHANCE = 0.6;
const WEEKDAY_ALCOHOL_CHANCE = 0.18;
const WEEKEND_ALCOHOL_CHANCE = 0.45;
const SWEET_SNACK_CHANCE = 0.3;

// Per-symptom chance from each cause; causes combine as independent chances.
const SYMPTOM_BASE: Record<SymptomName, number> = {
  Bloating: 0.07,
  'Stomach pain': 0.05,
  'Seborrheic dermatitis': 0.07,
  Anxiety: 0.1,
  'Poor sleep': 0.1,
};
const TRIGGER_EFFECTS: Partial<Record<Trigger, Partial<Record<SymptomName, number>>>> = {
  dairy: { Bloating: 0.8, 'Stomach pain': 0.6 },
  garlic: { Bloating: 0.3, 'Stomach pain': 0.2 },
  onion: { Bloating: 0.3, 'Stomach pain': 0.2 },
  beans: { Bloating: 0.65, 'Stomach pain': 0.35 },
  wheat: { Bloating: 0.2 },
  coffee: { Anxiety: 0.75, 'Poor sleep': 0.65 },
  alcohol: { 'Poor sleep': 0.75, 'Seborrheic dermatitis': 0.65 },
  sugar: { 'Seborrheic dermatitis': 0.55 },
};

// How much a stressful day (4–5) multiplies the chance of *not* getting each symptom that day.
const STRESS_SAME_DAY: Record<SymptomName, number> = {
  Anxiety: 0.45,
  'Poor sleep': 0.5,
  Bloating: 1,
  'Stomach pain': 1,
  'Seborrheic dermatitis': 1,
};

const NOTES: Partial<Record<SymptomName, string[]>> = {
  Bloating: ['Jeans felt tight by mid-afternoon', 'Gassy and uncomfortable', 'Stomach visibly swollen'],
  'Stomach pain': ['Cramping after eating', 'Sharp pain, lower left side', 'Had to lie down for a bit'],
  'Seborrheic dermatitis': ['Flaky patches around eyebrows', 'Itchy scalp, lots of flakes', 'Redness along the nose'],
  'Poor sleep': ['Took ages to fall asleep', 'Woke up at 3am', 'Restless, tossing and turning'],
  Anxiety: ['Racing thoughts all afternoon', 'Felt on edge', 'Tight chest, hard to focus'],
};

function at(day: Date, hour: number, minute: number) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
}

export async function hasAnyData(): Promise<boolean> {
  const counts = await Promise.all(diaryTables().map((t) => t.count()));
  return counts.some((c) => c > 0);
}

export async function clearAllData(): Promise<void> {
  const tables = diaryTables();
  await db.transaction('rw', tables, () => Promise.all(tables.map((t) => t.clear())));
}

/** Replaces everything in the diary with the demo persona's last 90 days. */
export async function loadDemoData(now = new Date(), seed = SEED): Promise<void> {
  const random = makeRandom(seed);
  const chance = (p: number) => random() < p;
  const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)];
  const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

  const createdAt = at(now, 0, 0);
  createdAt.setDate(createdAt.getDate() - DAYS);

  const symptomDefs: SymptomDefinition[] = LOGGED_SYMPTOMS.map((name, i) => ({
    id: i + 1,
    name,
    color: SYMPTOM_COLORS[i % SYMPTOM_COLORS.length],
    createdAt: createdAt.toISOString(),
    archived: false,
  }));
  const symptomId = new Map(symptomDefs.map((s) => [s.name, s.id]));

  const foodTags: FoodTag[] = [];
  const tagId = (name: string) => {
    let tag = foodTags.find((t) => t.name === name);
    if (!tag) {
      tag = { id: foodTags.length + 1, name, createdAt: createdAt.toISOString() };
      foodTags.push(tag);
    }
    return tag.id;
  };

  const foodLogs: Omit<FoodLog, 'id'>[] = [];
  const symptomLogs: Omit<SymptomLog, 'id'>[] = [];
  const moodLogs: Omit<MoodLog, 'id'>[] = [];
  const weatherLogs: Omit<WeatherLog, 'id'>[] = [];

  let pressure = 1014;
  let previousStress = 0;
  for (let i = 0; i < DAYS; i++) {
    const day = at(now, 0, 0);
    day.setDate(day.getDate() - (DAYS - 1 - i));
    const dateKey = toDateKey(day);
    const isToday = i === DAYS - 1;
    const progress = i / (DAYS - 1);
    // Trigger meals get rarer as they learn what sets them off: ~55% of meals early on, ~20% by the end.
    const triggerMealChance = 0.55 - 0.35 * progress;
    const weekend = day.getDay() === 0 || day.getDay() === 6;

    const exposures = new Set<Trigger>();
    const addFood = (hour: number, minute: number, tags: string[], label?: string) => {
      const timestamp = at(day, hour, minute);
      if (isToday && timestamp > now) return;
      for (const t of tags) if (TRIGGERS.has(t)) exposures.add(t as Trigger);
      foodLogs.push({ timestamp: timestamp.toISOString(), dateKey, tagIds: tags.map(tagId), mealLabel: label });
    };
    const meal = <M extends { tags: string[]; triggers: Trigger[] }>(options: M[]) => {
      const safe = options.filter((o) => o.triggers.length === 0);
      const risky = options.filter((o) => o.triggers.length > 0);
      return chance(triggerMealChance) ? pick(risky) : pick(safe);
    };

    const breakfast = meal(BREAKFASTS);
    const breakfastTags = [...breakfast.tags, ...breakfast.triggers];
    const hadCoffee = chance(COFFEE_CHANCE - 0.25 * progress);
    if (hadCoffee) breakfastTags.push('coffee');
    addFood(between(7, 8), between(0, 45), breakfastTags, 'Breakfast');

    const lunch = meal(LUNCHES);
    addFood(between(12, 13), between(0, 50), [...lunch.tags, ...lunch.triggers], lunch.label);

    const dinner = meal(weekend ? DINNERS.concat(DINNERS.filter((d) => d.triggers.length > 0)) : DINNERS);
    const dinnerTags = [...dinner.tags, ...dinner.triggers];
    const hadAlcohol = chance((weekend ? WEEKEND_ALCOHOL_CHANCE : WEEKDAY_ALCOHOL_CHANCE) * (1 - 0.4 * progress));
    if (hadAlcohol) dinnerTags.push('alcohol');
    addFood(between(18, 19), between(0, 55), dinnerTags, dinner.label);

    if (chance(SWEET_SNACK_CHANCE * (1 - 0.3 * progress))) addFood(between(15, 16), between(0, 55), ['sugar'], 'Sweet snack');
    const hadPeppermint = chance(0.25 + 0.3 * progress);
    if (hadPeppermint) addFood(20, between(0, 50), ['peppermint tea'], 'Tea');

    // Work stress: calmer weekends, two rough patches, and the odd spike day.
    const roughPatch = (progress > 0.35 && progress < 0.5) || (progress > 0.75 && progress < 0.85);
    const spike = chance(0.08) ? 2 : 0;
    const stress = Math.min(5, Math.max(1, (weekend ? 2 : 3) + (roughPatch ? 1 : 0) + spike + between(-1, 1)));

    const hits = new Map<SymptomName, number>();
    for (const name of EFFECTS) {
      let miss = 1 - SYMPTOM_BASE[name];
      let causes = 0;
      for (const trigger of exposures) {
        const p = TRIGGER_EFFECTS[trigger]?.[name];
        if (p) {
          miss *= 1 - p;
          causes++;
        }
      }
      if (name === 'Bloating' && hadPeppermint) miss = 1 - (1 - miss) * 0.35;
      if (stress >= 4) miss *= STRESS_SAME_DAY[name];
      // Skin flares lag: yesterday's stress shows up today.
      if (name === 'Seborrheic dermatitis' && previousStress >= 4) miss *= 0.4;
      if (chance(1 - miss)) hits.set(name, Math.min(5, Math.max(1, 2 + causes + between(-1, 1))));
    }
    // A bad gut day feeds anxiety and wrecks sleep.
    const gutFlare = Math.max(hits.get('Bloating') ?? 0, hits.get('Stomach pain') ?? 0);
    if (gutFlare >= 4) {
      if (!hits.has('Anxiety') && chance(0.3)) hits.set('Anxiety', between(2, 4));
      if (!hits.has('Poor sleep') && chance(0.3)) hits.set('Poor sleep', between(2, 4));
    }

    const symptomTimes: Record<SymptomName, [number, number]> = {
      Bloating: [14, 21],
      'Stomach pain': [13, 21],
      'Seborrheic dermatitis': [8, 10],
      'Poor sleep': [22, 23],
      Anxiety: [10, 18],
    };
    for (const [name, severity] of hits) {
      const [from, to] = symptomTimes[name];
      const timestamp = at(day, between(from, to), between(0, 59));
      if (isToday && timestamp > now) continue;
      const notes = NOTES[name];
      symptomLogs.push({
        symptomId: symptomId.get(name)!,
        severity,
        timestamp: timestamp.toISOString(),
        dateKey,
        note: notes && chance(0.3) ? pick(notes) : undefined,
      });
    }

    const worst = Math.max(0, ...hits.values());
    const mood = Math.min(5, Math.max(1, 4 - Math.floor(worst / 2) - (stress >= 4 ? 1 : 0) + between(0, 1)));
    // Today's check-in lands earlier so the home screen has a score to show.
    const moodTime = isToday ? new Date(Math.min(at(day, 21, 0).getTime(), now.getTime() - 20 * 60000)) : at(day, 21, between(0, 45));
    if (!isToday || moodTime >= at(day, 7, 0)) {
      const energy = Math.min(
        5,
        Math.max(1, 4 - (hits.has('Poor sleep') ? 2 : 0) - (gutFlare >= 4 ? 1 : 0) + between(-1, 1)),
      );
      moodLogs.push({
        moodScore: mood,
        stressScore: stress,
        energyScore: energy,
        timestamp: moodTime.toISOString(),
        dateKey,
      });
    }
    previousStress = stress;

    // Leave today's weather for the live fetch.
    if (!isToday) {
      pressure = Math.min(1030, Math.max(998, pressure + between(-6, 6)));
      const wet = pressure < 1008 && chance(0.6);
      weatherLogs.push({
        dateKey,
        fetchedAt: at(day, 8, 0).toISOString(),
        lat: 43.65,
        lon: -79.38,
        tempC: Math.round((12 + 8 * Math.sin((i / DAYS) * Math.PI) + between(-3, 3)) * 10) / 10,
        pressureHPa: pressure,
        precipitationMm: wet ? between(1, 12) : 0,
        weatherCode: wet ? pick([61, 63, 80]) : pick([0, 1, 2, 3]),
        humidity: wet ? between(75, 95) : between(45, 70),
      });
    }
  }

  const mealTemplates: MealTemplate[] = [
    { id: 1, name: 'Usual breakfast', tagIds: ['oats', 'banana', 'peanut butter'].map(tagId), createdAt: createdAt.toISOString() },
    { id: 2, name: 'Safe dinner', tagIds: ['chicken', 'rice', 'zucchini'].map(tagId), createdAt: createdAt.toISOString() },
    { id: 3, name: 'Salmon bowl', tagIds: ['salmon', 'rice', 'spinach'].map(tagId), createdAt: createdAt.toISOString() },
  ];

  const tables = diaryTables();
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()));
    await db.symptomDefinitions.bulkAdd(symptomDefs);
    await db.foodTags.bulkAdd(foodTags);
    await db.mealTemplates.bulkAdd(mealTemplates);
    await db.foodLogs.bulkAdd(foodLogs as FoodLog[]);
    await db.symptomLogs.bulkAdd(symptomLogs as SymptomLog[]);
    await db.moodLogs.bulkAdd(moodLogs as MoodLog[]);
    await db.weatherLogs.bulkAdd(weatherLogs as WeatherLog[]);
  });
}
