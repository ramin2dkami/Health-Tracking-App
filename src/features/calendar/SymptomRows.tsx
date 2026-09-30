import { useMemo, useState } from 'react';
import type { FoodLog } from '../../db/schema';
import type { SymptomTrend, TrendSummaryData } from './summarizeTrends';
import { Sparkline } from './Sparkline';
import { DENSE_DAYS, pct, shortDate } from './trendFormat';
import { Icon } from '../../components/Icon';

const COLLAPSED_ROWS = 3;
const MAX_FOOD_CHIPS = 3;

const PILL_LABELS = { improving: 'Easing', worsening: 'Worse', steady: 'Steady' } as const;

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
              <span className="color-dot" style={{ background: t.symptom.color }} />
              <span className="symptom-row__text">
                <span className="symptom-row__name">{t.symptom.name}</span>
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

  return (
    <div className="symptom-row__detail">
      <div className={`severity-bars ${days.length >= DENSE_DAYS ? 'severity-bars--dense' : ''}`}>
        {trend.series.map((severity, i) => (
          <span key={days[i]} className={`severity-bars__day ${shadedDays?.has(days[i]) ? 'is-shaded' : ''}`}>
            <span
              className="severity-bars__bar"
              style={{ height: `${(severity / 5) * 100}%`, background: trend.symptom.color }}
            />
          </span>
        ))}
        <span className="severity-bars__avg" style={{ top: avgTop }} />
        <span className="severity-bars__avg-label" style={{ top: avgTop }}>
          avg {trend.avg.toFixed(1)}
        </span>
      </div>
      <div className="strip-axis">
        <span>{shortDate(days[0])}</span>
        <span>{shortDate(days[Math.floor(days.length / 2)])}</span>
        <span>{shortDate(days[days.length - 1])}</span>
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
              {l.tagName} · {pct(l.avgWith)} vs {pct(l.avgWithout)}
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
