import { useEffect, useMemo, useState } from 'react';
import { CalendarHeatmap } from './CalendarHeatmap';
import { DayDetailModal } from './DayDetailModal';
import { TrendHighlights } from './TrendHighlights';
import { SymptomRows } from './SymptomRows';
import { summarizeTrends } from './summarizeTrends';
import { aggregateMaxSeverityByDay } from './aggregateSeverity';
import { SEVERITY_COLORS } from './severityColors';
import {
  listSymptomDefinitions,
  listSymptomLogsInRange,
  listFoodLogsInRange,
  listFoodTags,
} from '../../db/repository';
import { toDateKey, dateKeysBetween } from '../../db/dateKey';
import type { FoodLog, FoodTag, SymptomDefinition, SymptomLog } from '../../db/schema';
import { useDataVersion } from '../../data/DataVersion';
import { Icon } from '../../components/Icon';

const ALL_TIME = 3650;
const RANGE_OPTIONS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: 'All', days: ALL_TIME },
];

function startOfWeek(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function rangeStartKey(days: number): string {
  const now = new Date();
  return toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)));
}

export function CalendarScreen() {
  const { version } = useDataVersion();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [severityByDay, setSeverityByDay] = useState<Map<string, number>>(new Map());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<SymptomDefinition[]>([]);
  const [filterSymptomId, setFilterSymptomId] = useState<number | 'all'>('all');
  const [rangeDays, setRangeDays] = useState(30);
  const [rangeLogs, setRangeLogs] = useState<SymptomLog[]>([]);
  const [rangeFoodLogs, setRangeFoodLogs] = useState<FoodLog[]>([]);
  const [foodTags, setFoodTags] = useState<FoodTag[]>([]);

  useEffect(() => {
    listSymptomDefinitions().then(setSymptoms);
    listFoodTags().then(setFoodTags);
  }, [version]);

  useEffect(() => {
    const start = toDateKey(weekStart);
    const end = toDateKey(addDays(weekStart, 6));
    aggregateMaxSeverityByDay(start, end, filterSymptomId === 'all' ? undefined : filterSymptomId).then(
      setSeverityByDay,
    );
  }, [weekStart, filterSymptomId, version]);

  useEffect(() => {
    const start = rangeStartKey(rangeDays);
    const end = toDateKey(new Date());
    Promise.all([listSymptomLogsInRange(start, end), listFoodLogsInRange(start, end)]).then(([sl, fl]) => {
      setRangeLogs(sl);
      setRangeFoodLogs(fl);
    });
  }, [rangeDays, version]);

  const days = useMemo(() => {
    const end = toDateKey(new Date());
    if (rangeDays !== ALL_TIME) return dateKeysBetween(rangeStartKey(rangeDays), end);
    if (rangeLogs.length === 0) return [];
    const earliest = rangeLogs.reduce((min, l) => (l.dateKey < min ? l.dateKey : min), end);
    return dateKeysBetween(earliest, end);
  }, [rangeDays, rangeLogs]);

  const scopedSymptoms = useMemo(
    () => (filterSymptomId === 'all' ? symptoms : symptoms.filter((s) => s.id === filterSymptomId)),
    [symptoms, filterSymptomId],
  );
  const summary = useMemo(
    () => summarizeTrends({ days, allLogs: rangeLogs, foodLogs: rangeFoodLogs, tags: foodTags, symptoms: scopedSymptoms }),
    [days, rangeLogs, rangeFoodLogs, foodTags, scopedSymptoms],
  );

  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="screen">
      <header className="page-head">
        <p className="page-head__eyebrow">When are things worst?</p>
        <h1>Trends</h1>
      </header>

      {symptoms.length > 0 && (
        <div className="chips chips--scroll" role="group" aria-label="Filter by symptom">
          <button
            type="button"
            className={`chip ${filterSymptomId === 'all' ? 'is-selected' : ''}`}
            aria-pressed={filterSymptomId === 'all'}
            onClick={() => setFilterSymptomId('all')}
          >
            All symptoms
          </button>
          {symptoms.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`chip ${filterSymptomId === s.id ? 'is-selected' : ''}`}
              aria-pressed={filterSymptomId === s.id}
              onClick={() => setFilterSymptomId(s.id)}
            >
              <span className="color-dot" style={{ background: s.color }} />
              {s.name}
            </button>
          ))}
        </div>
      )}

      <section className="card">
        <div className="card__head">
          <button type="button" className="icon-btn" onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label="Previous week">
            <Icon name="chevronLeft" />
          </button>
          <h2>{weekLabel}</h2>
          <button type="button" className="icon-btn" onClick={() => setWeekStart((w) => addDays(w, 7))} aria-label="Next week">
            <Icon name="chevronRight" />
          </button>
        </div>
        <CalendarHeatmap weekStart={weekStart} severityByDay={severityByDay} onSelectDay={setSelectedDate} />
        <div className="legend" aria-label="Worst symptom severity scale">
          <span>None</span>
          {SEVERITY_COLORS.map((c, i) => (
            <span key={c} className="legend__swatch" style={{ background: c }} title={i ? `Severity ${i}` : 'No symptoms'} />
          ))}
          <span>Severe</span>
        </div>
      </section>

      <section className="trends">
        <div className="trends__head">
          <h2>Severity over time</h2>
          <div className="segmented" role="group" aria-label="Date range">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                className={rangeDays === opt.days ? 'is-selected' : ''}
                aria-pressed={rangeDays === opt.days}
                onClick={() => setRangeDays(opt.days)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {summary.trends.length === 0 ? (
          <p className="muted">No symptoms logged in this range yet.</p>
        ) : (
          <>
            <TrendHighlights summary={summary} days={days} onSelectDay={setSelectedDate} />
            <section className="card">
              <div className="card__head">
                <h2>By symptom</h2>
                <span className="card__hint">Tap to dig in</span>
              </div>
              <SymptomRows summary={summary} days={days} foodLogs={rangeFoodLogs} />
              <p className="insight-footnote">
                Food links compare days you logged symptoms. Associations, not proof of cause.
              </p>
            </section>
          </>
        )}
      </section>

      {selectedDate && <DayDetailModal dateKey={selectedDate} onClose={() => setSelectedDate(null)} />}
    </div>
  );
}
