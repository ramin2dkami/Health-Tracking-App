import { useEffect, useMemo, useRef, useState } from 'react';
import type { FoodLog } from '../../db/schema';
import type { SymptomTrend, TrendSummaryData } from './summarizeTrends';
import { Sparkline } from './Sparkline';
import { DENSE_DAYS, pct, shortDate } from './trendFormat';
import { Icon } from '../../components/Icon';

const COLLAPSED_ROWS = 3;
const MAX_FOOD_CHIPS = 3;

const PILL_LABELS = { improving: 'Easing', worsening: 'Worse', steady: 'Steady' } as const;

// Y-axis labels for the 1–5 severity scale.
const SEVERITY_TICKS = [1, 2, 3, 4, 5];

function longDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function SymptomRows({
  summary,
  days,
  foodLogs,
}: {
  summary: TrendSummaryData;
  days: string[];
  foodLogs: FoodLog[];
}) {
  // undefined = nothing chosen yet, so the top symptom starts open; null = user closed everything.
  const [openId, setOpenId] = useState<number | null | undefined>(undefined);
  const [tagId, setTagId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const shadedDays = useMemo(() => {
    if (tagId === null) return null;
    return new Set(foodLogs.filter((l) => l.tagIds.includes(tagId)).map((l) => l.dateKey));
  }, [tagId, foodLogs]);

  const { trends } = summary;
  const activeId = openId === undefined ? trends[0]?.symptom.id : openId;
  const visible = showAll ? trends : trends.slice(0, COLLAPSED_ROWS);

  function toggle(id: number) {
    setOpenId(activeId === id ? null : id);
    setTagId(null);
  }

  return (
    <div className="symptom-rows">
      {visible.map((t) => {
        const open = t.symptom.id === activeId;
        return (
          <div key={t.symptom.id} className={`symptom-row ${open ? 'is-open' : ''}`}>
            <button
              type="button"
              className="symptom-row__head"
              aria-expanded={open}
              onClick={() => toggle(t.symptom.id)}
            >
              <span className="symptom-row__text">
                <span className="symptom-row__name">
                  <span className="color-dot" style={{ background: t.symptom.color }} />
                  <span className="symptom-row__name-text">{t.symptom.name}</span>
                </span>
                <span className="symptom-row__meta">
                  avg {t.avg.toFixed(1)} · {t.daysLogged} {t.daysLogged === 1 ? 'day' : 'days'}
                </span>
              </span>
              <Sparkline values={t.series} color={t.symptom.color} className="symptom-row__spark" />
              {t.direction ? (
                <span className={`trend-pill trend-pill--${t.direction}`}>{PILL_LABELS[t.direction]}</span>
              ) : (
                <span className="trend-pill trend-pill--none" />
              )}
              <span className="symptom-row__chevron">
                <Icon name="chevronRight" size={18} />
              </span>
            </button>
            {open ? (
              <SymptomDetail
                trend={t}
                summary={summary}
                days={days}
                tagId={tagId}
                shadedDays={shadedDays}
                onPickTag={(id) => setTagId((cur) => (cur === id ? null : id))}
              />
            ) : null}
          </div>
        );
      })}
      {trends.length > COLLAPSED_ROWS ? (
        <button type="button" className="symptom-rows__more" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show fewer' : `Show all ${trends.length} symptoms`}
        </button>
      ) : null}
    </div>
  );
}

function SymptomDetail({
  trend,
  summary,
  days,
  tagId,
  shadedDays,
  onPickTag,
}: {
  trend: SymptomTrend;
  summary: TrendSummaryData;
  days: string[];
  tagId: number | null;
  shadedDays: Set<string> | null;
  onPickTag: (id: number) => void;
}) {
  const links = summary.foodLinks.filter((l) => l.symptom.id === trend.symptom.id).slice(0, MAX_FOOD_CHIPS);
  const picked = links.find((l) => l.tagId === tagId);
  const avgTop = `${100 - (trend.avg / 5) * 100}%`;
  // Day whose date and severity are shown in a popup; kept by date so range changes can't misplace it.
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const index = pickedKey === null ? -1 : days.indexOf(pickedKey);
  const pickedBar = index === -1 ? null : index;
  const barsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pickedKey === null) return;
    function onPointerDown(e: PointerEvent) {
      if (!barsRef.current?.contains(e.target as Node)) setPickedKey(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setPickedKey(null);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [pickedKey]);

  const pickedSeverity = pickedBar === null ? 0 : trend.series[pickedBar];
  const pickedAt = pickedBar === null ? 0 : (pickedBar + 0.5) / days.length;

  return (
    <div className="symptom-row__detail">
      <div className="severity-chart">
        <div className="severity-chart__y" aria-hidden="true">
          {SEVERITY_TICKS.map((n) => (
            <span key={n} style={{ bottom: `${(n / 5) * 100}%` }}>
              {n}
            </span>
          ))}
        </div>
        <div
          ref={barsRef}
          className={`severity-bars ${days.length >= DENSE_DAYS ? 'severity-bars--dense' : ''} ${
            pickedBar !== null ? 'has-pick' : ''
          }`}
        >
          {trend.series.map((severity, i) => {
            const className = `severity-bars__day ${shadedDays?.has(days[i]) ? 'is-shaded' : ''} ${
              pickedBar === i ? 'is-picked' : ''
            }`;
            const bar = (
              <span
                className="severity-bars__bar"
                style={{ height: `${(severity / 5) * 100}%`, background: trend.symptom.color }}
              />
            );
            return severity > 0 ? (
              <button
                key={days[i]}
                type="button"
                className={className}
                aria-label={`${longDate(days[i])}: ${trend.symptom.name} ${severity} of 5`}
                aria-pressed={pickedBar === i}
                onClick={() => setPickedKey(pickedBar === i ? null : days[i])}
              >
                {bar}
              </button>
            ) : (
              <span key={days[i]} className={className} />
            );
          })}
          {pickedBar !== null && pickedSeverity > 0 ? (
            <span
              className="bar-popup"
              role="status"
              style={{
                left: `${pickedAt * 100}%`,
                bottom: `calc(${(pickedSeverity / 5) * 100}% + 8px)`,
                // Keep the popup inside the chart near either edge.
                transform: `translateX(${pickedAt < 0.2 ? -15 : pickedAt > 0.8 ? -85 : -50}%)`,
              }}
            >
              <span className="bar-popup__date">{longDate(days[pickedBar])}</span>
              <strong>Severity {pickedSeverity} of 5</strong>
            </span>
          ) : null}
          <span className="severity-bars__avg" style={{ top: avgTop }} />
          <span className="severity-bars__avg-label" style={{ top: avgTop }}>
            avg {trend.avg.toFixed(1)}
          </span>
        </div>
        <span />
        <div className="strip-axis">
          <span>{shortDate(days[0])}</span>
          <span>{shortDate(days[Math.floor(days.length / 2)])}</span>
          <span>{shortDate(days[days.length - 1])}</span>
        </div>
      </div>

      <p className="symptom-row__label">Foods linked to {trend.symptom.name}</p>
      {links.length === 0 ? (
        <p className="muted">No food stands out for this symptom in this period.</p>
      ) : (
        <div className="chips" role="group" aria-label={`Shade days with a food linked to ${trend.symptom.name}`}>
          {links.map((l) => (
            <button
              key={l.tagId}
              type="button"
              className={`chip chip--small ${tagId === l.tagId ? 'is-selected' : ''}`}
              aria-pressed={tagId === l.tagId}
              onClick={() => onPickTag(l.tagId)}
            >
              {l.tagName}: {pct(l.avgWith)} of days vs {pct(l.avgWithout)} without
            </button>
          ))}
        </div>
      )}
      {picked && shadedDays ? (
        <p className="shade-caption">
          <span className="shade-caption__swatch" aria-hidden="true" />
          Shaded: {shadedDays.size} {shadedDays.size === 1 ? 'day' : 'days'} you logged {picked.tagName}.{' '}
          {trend.symptom.name} showed up on {pct(picked.avgWith)} of them vs {pct(picked.avgWithout)} of other days.
        </p>
      ) : null}
    </div>
  );
}
