# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server on port 5174 with `strictPort` (also configured as `health-diary-dev` in `.claude/launch.json`). Keep the port fixed: IndexedDB is per-origin, so a different port opens an empty diary.
- `npm run build` — type-check (`tsc -b`) then production build to `dist/`
- `npx tsc -b` — type-check only
- `npm run lint` — oxlint (config in `.oxlintrc.json`; the `only-export-components` warning in `DataVersion.tsx` is pre-existing)

There is no test runner. Verify changes by type-checking and exercising the app in the preview.

## What this is

A mobile-first (max-width 480px) personal health diary: log symptoms (1–5 severity), food (free-form ingredient tags), mood/stress, and auto-fetched daily weather, then surface possible food triggers and trends. Local-only — no backend or accounts; all data lives in the browser's IndexedDB. The user's real diary data is in that IndexedDB, so clean up any test entries created while verifying in the preview.

## Architecture

**Data layer (`src/db/`)**
- `schema.ts` defines the Dexie database `HealthDiaryDB`. Schema changes require a new `db.version(n).stores(...)` block — never edit an existing version. `symptomDefinitions.name`, `foodTags.name`, and `mealTemplates.name` are unique indexes, so inserts must look up by name first (see the `findOrCreate*` / `saveMealTemplate` helpers).
- `demoData.ts` generates a deterministic 90-day IBS persona (loaded from the Manage screen; replaces all data). It writes to `db` directly in one transaction. Its trigger/effect tables and `SEED` were tuned so the Home insights surface food triggers (dairy, coffee, garlic, alcohol), peppermint tea as helping, and a Stress & mood card showing poor sleep on stressful days plus next-day skin flares. Anxiety is a symptom; the mood check-in records mood, stress and `energyScore` (older check-ins may still carry an unused `anxietyScore`). Any change to the generator shifts the random stream, so re-check both cards (and re-pick `SEED` if needed) after changing it or the thresholds in `insights.ts`. `loadDemoData(now, seed)` takes a seed for that search; run it on a scratch origin (the `health-diary-scratch` launch config, port 5175), never on 5174, since it replaces all data.
- `repository.ts` is the only other module that touches `db`; components call its functions. Symptom definitions are archived, not deleted, so historical logs keep resolving; `findOrCreateSymptomDefinition` un-archives on a name match. `SYMPTOM_COLORS` lives here and is shared by every place that creates symptoms.
- Every log row stores a `dateKey` (local-time `YYYY-MM-DD` from `dateKey.ts`) alongside the ISO timestamp. Day grouping and range queries always use `dateKey`, never UTC dates.

**Refresh model (`src/data/DataVersion.tsx`)**
There is no global store. Screens load their own data in a `useEffect` keyed on `version` from `useDataVersion()`; any write that other screens should see calls `bump()`. Forgetting `bump()` after a write is the usual cause of stale screens.

**Routing and entry (`src/App.tsx`)**
Uses `HashRouter`, so routes are `/#/`, `/#/calendar`, `/#/log`, `/#/manage`. The center + button in `BottomNav` opens `AddSheet` (`features/add/`), a bottom sheet with a menu that switches between the quick-add forms (`SymptomQuickAdd`, `FoodQuickAdd`, `MoodQuickAdd`). The sheet loads definitions once on mount and passes them down, so quick-add forms that create new definitions (new symptoms, saved meals) keep a local copy in state and append to it.

**Features (`src/features/`)**
- `onboarding/` — `ProfileGate` wraps the app in `App.tsx`: no `Profile` row shows `WelcomeScreen` (local sign-up: name, optional email, no password); a profile without `onboardedAt` shows `OnboardingFlow` (symptoms to track, goals, suspected foods). Finishing tracks exactly the chosen symptoms (others are archived) and adds suspected foods as food tags. Manage's "Redo setup" clears `onboardedAt`. The `profile` table is excluded from `clearAllData`/`loadDemoData` via `diaryTables()`.
- `home/` — day score, 7-day strip, and the Insights cards. `insights.ts` orchestrates all insight computations over a 7/30/90-day window; the thresholds deciding "Avoid" / "Limit" / "May help" are constants at the top of that file.
- `calendar/` — Trends screen (heatmap, chart, summary). Also holds shared pure analysis helpers that `home/` imports: `aggregateSeverity.ts` (max severity per day) and `foodAssociations.ts` (share of days a symptom appears with vs. without each food). A day counts as "tracked" if any symptom was logged that day.
- `food/` — food logging with saved meals (`MealTemplate`: a name plus food tag IDs). Saved meals are picked and created from inside `FoodQuickAdd`; `MealTemplateManager` on the Manage screen handles deletion.
- `symptoms/` — symptom quick-add (pick a tracked symptom or add a new one inline) and `ManageScreen` (symptoms, saved meals, food tags).
- `weather/` — `useWeatherFetch` gets geolocation and stores one `WeatherLog` per day from the Open-Meteo API (no key needed).

**Styling**
Plain CSS: design tokens (colors as `--yellow`, `--pink`, etc.) in `src/index.css`, and all component styles in one BEM-ish `src/App.css` (`.block__element`, `.block--modifier`, `is-selected` state classes). Reuse existing primitives (`.btn`, `.chip`, `.card`, `.form`, `.inline-form`, `.field-label`) before adding new classes. Charts use Recharts. `mockup.html` is a standalone design mockup, not part of the app.
