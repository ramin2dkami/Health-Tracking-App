import { useEffect, useState } from 'react';
import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';
import { useDataVersion } from '../../data/DataVersion';
import {
  computeHomeInsights,
  type HomeInsights,
  type InsightWindow,
  type TrendInsight,
  type StressMoodInsight,
  type StressSymptomEffect,
  type SymptomSummaryInsight,
  type TriggerInsight,
  type FoodEffect,
} from './insights';
import { Icon } from '../../components/Icon';
import { TriggerDetailSheet } from './TriggerDetailSheet';
import { LEVEL_BADGE, capitalize } from './triggerLevels';

const WINDOW_OPTIONS: InsightWindow[] = [7, 30, 90];

export function InsightsSection() {
  const { version } = useDataVersion();
  const [windowDays, setWindowDays] = useState<InsightWindow>(30);
  const [insights, setInsights] = useState<HomeInsights | null>(null);

  useEffect(() => {
    let cancelled = false;
    computeHomeInsights(windowDays).then((result) => {
      if (!cancelled) setInsights(result);
    });
    return () => {
      cancelled = true;
    };
  }, [windowDays, version]);

  return (
    <section className="section insights">
      <div className="section__head insights__head">
        <h2>Insights</h2>
        <div className="segmented" role="group" aria-label="Insights time window">
          {WINDOW_OPTIONS.map((days) => (
            <button
              key={days}
              type="button"
              className={windowDays === days ? 'is-selected' : ''}
              aria-pressed={windowDays === days}
              onClick={() => setWindowDays(days)}
            >
              {days}D
            </button>
          ))}
        </div>
      </div>

      {!insights ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <TrendCard trend={insights.trend} windowDays={windowDays} />
          <TriggersCard data={insights.triggers} windowDays={windowDays} />
          <SymptomSummaryCard summary={insights.symptomSummary} windowDays={windowDays} />
          <StressMoodCard data={insights.stressMood} hasFoodTriggers={insights.triggers.triggers.length > 0} />
        </>
      )}
    </section>
  );
}

function TrendCard({ trend, windowDays }: { trend: TrendInsight; windowDays: InsightWindow }) {
  return (
    <div className="card">
      <h3 className="card__title">Day score trend</h3>
      {trend.currentAvg === null ? (
        <p className="muted">Log symptoms or mood to start seeing your trend.</p>
      ) : (
        <>
          <div className="insight-stat">
            <span className="insight-stat__value">{trend.currentAvg.toFixed(1)}</span>
            <span className="insight-stat__unit">/10 avg</span>
            {trend.deltaPct !== null && Math.abs(trend.deltaPct) >= 1 ? (
              <span className={`insight-delta ${trend.deltaPct > 0 ? 'insight-delta--up' : 'insight-delta--down'}`}>
                {trend.deltaPct > 0 ? '▲' : '▼'} {Math.abs(trend.deltaPct).toFixed(0)}%
              </span>
            ) : null}
          </div>
          <p className="card__sub insight-caption">
            {trend.deltaPct === null
              ? `Not enough data from the previous ${windowDays} days to compare.`
              : Math.abs(trend.deltaPct) < 1
                ? `About the same as the previous ${windowDays} days.`
                : trend.deltaPct > 0
                  ? `Better than the previous ${windowDays} days.`
                  : `Worse than the previous ${windowDays} days.`}
          </p>
          {trend.points.length > 1 ? (
            <ResponsiveContainer width="100%" height={64}>
              <LineChart data={trend.points} margin={{ top: 6, right: 4, left: 4, bottom: 4 }}>
                <YAxis hide domain={[0, 10]} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--pink-strong)"
                  strokeWidth={3}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </>
      )}
    </div>
  );
}

function SymptomSummaryCard({ summary, windowDays }: { summary: SymptomSummaryInsight; windowDays: InsightWindow }) {
  return (
    <div className="card">
      <h3 className="card__title">Symptoms at a glance</h3>
      {!summary.mostFrequent ? (
        <p className="muted">No symptoms logged in this window.</p>
      ) : (
        <>
          <div className="insight-row">
            <span className="insight-row__label">Most frequent</span>
            <span className="insight-row__value">
              <span className="color-dot" style={{ background: summary.mostFrequent.color }} />
              {summary.mostFrequent.name} · {summary.mostFrequent.days} of {windowDays} days
            </span>
          </div>
          <div className="insight-row">
            <span className="insight-row__label">Most severe</span>
            <span className="insight-row__value">
              {summary.highestAvgSeverity ? (
                <>
                  <span className="color-dot" style={{ background: summary.highestAvgSeverity.color }} />
                  {summary.highestAvgSeverity.name} · avg {summary.highestAvgSeverity.avgSeverity.toFixed(1)}/5
                </>
              ) : (
                <span className="muted">needs 2+ logs</span>
              )}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function FoodEffectRow({ effect, onOpen }: { effect: FoodEffect; onOpen: () => void }) {
  const badge = LEVEL_BADGE[effect.level];
  const symptomNames = effect.links.map((l) => l.symptom.name.toLowerCase()).join(', ');

  return (
    <div className="trigger">
      <button type="button" className="trigger__head" aria-haspopup="dialog" onClick={onOpen}>
        <span className="trigger__title">
          <strong>{capitalize(effect.tagName)}</strong>
          <span className="trigger__summary">
            {effect.level === 'help' ? `Fewer ${symptomNames} days` : `Linked to ${symptomNames}`}
          </span>
        </span>
        <span className={`insight-delta ${badge.className}`}>{badge.label}</span>
        <span className="trigger__chevron">
          <Icon name="chevronRight" size={18} />
        </span>
      </button>
    </div>
  );
}

function TriggersCard({ data, windowDays }: { data: TriggerInsight; windowDays: InsightWindow }) {
  const [openEffect, setOpenEffect] = useState<FoodEffect | null>(null);
  const isEmpty = data.triggers.length === 0 && data.helpers.length === 0;
  return (
    <div className="card">
      <h3 className="card__title">Possible triggers</h3>
      {isEmpty ? (
        <p className="muted">
          No clear food patterns yet. Keep logging meals and symptoms — each food needs a few days with and without
          it before we can compare.
        </p>
      ) : (
        <>
          {[...data.triggers, ...data.helpers].map((e) => (
            <FoodEffectRow key={e.tagId} effect={e} onOpen={() => setOpenEffect(e)} />
          ))}
          <p className="insight-footnote">Based on your logs, not a diagnosis. Tap a food for details.</p>
        </>
      )}
      {openEffect ? (
        <TriggerDetailSheet effect={openEffect} windowDays={windowDays} onClose={() => setOpenEffect(null)} />
      ) : null}
    </div>
  );
}

const pct = (rate: number) => `${Math.round(rate * 100)}%`;

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function StressEffectRow({ effect, nextDay = false }: { effect: StressSymptomEffect; nextDay?: boolean }) {
  return (
    <div className="stress-effect">
      <div className="stress-effect__head">
        <span className="color-dot" style={{ background: effect.symptom.color }} />
        <strong>{effect.symptom.name}</strong>
        {nextDay ? <span className="stress-effect__tag">next day</span> : null}
      </div>
      {[
        { label: nextDay ? 'After calm' : 'Calm days', rate: effect.calmRate, color: 'var(--line)' },
        { label: nextDay ? 'After stress' : 'Stressed', rate: effect.stressedRate, color: effect.symptom.color },
      ].map((bar) => (
        <div key={bar.label} className="stress-bar">
          <span className="stress-bar__label">{bar.label}</span>
          <span className="stress-bar__track">
            <span className="stress-bar__fill" style={{ width: pct(bar.rate), background: bar.color }} />
          </span>
          <span className="stress-bar__value">{pct(bar.rate)}</span>
        </div>
      ))}
    </div>
  );
}

function StressMoodCard({ data, hasFoodTriggers }: { data: StressMoodInsight; hasFoodTriggers: boolean }) {
  const effects = data.sameDay.length > 0 || data.nextDay !== null;
  const names = data.sameDay.map((e) => e.symptom.name.toLowerCase());

  let headline: string;
  if (!data.canCompare) {
    headline =
      data.calmDays + data.stressedDays === 0
        ? 'Rate your stress when you log your mood to see how it affects your symptoms.'
        : `Not enough to compare yet: ${data.stressedDays} stressful and ${data.calmDays} calm days logged. Keep checking in.`;
  } else if (names.length > 0) {
    headline = `On stressful days, your ${listNames(names)} showed up more often.`;
  } else if (data.nextDay) {
    headline = `Stress seems to hit the day after, in your ${data.nextDay.symptom.name.toLowerCase()}.`;
  } else {
    headline = `Your symptoms don’t change much with stress.${hasFoodTriggers ? ' Food looks like the bigger factor.' : ''}`;
  }

  return (
    <div className="card">
      <h3 className="card__title">Stress &amp; mood</h3>
      {data.canCompare ? (
        <p className="card__sub">
          Stress 1–2 counts as calm, 4–5 as stressed. Based on {data.calmDays} calm and {data.stressedDays} stressed
          days.
        </p>
      ) : null}
      <p className="stress-headline">{headline}</p>

      {data.canCompare && effects ? (
        <div className="stress-effects">
          {data.sameDay.map((e) => (
            <StressEffectRow key={e.symptom.id} effect={e} />
          ))}
          {data.nextDay ? <StressEffectRow effect={data.nextDay} nextDay /> : null}
        </div>
      ) : null}
    </div>
  );
}
