import type { SymptomFoodLink } from './foodAssociations';
import { FLARE_SEVERITY, type TrendSummaryData } from './summarizeTrends';
import { Sparkline } from './Sparkline';
import type { EnergySummary } from './summarizeEnergy';
import { DENSE_DAYS, directionPhrase, pct, shortDate } from './trendFormat';

const MAX_TRIGGER_CARDS = 2;
// Darker than the check-in's --orange so the line reads on the cream card, and distinct from symptom colors.
const ENERGY_COLOR = '#ee7d3b';

const ENERGY_TITLES = {
  improving: 'Your energy is picking up',
  worsening: 'Your energy is dipping',
  steady: 'Your energy is holding steady',
} as const;

export function TrendHighlights({
  summary,
  energy,
  days,
  onSelectDay,
}: {
  summary: TrendSummaryData;
  energy: EnergySummary | null;
  days: string[];
  onSelectDay: (dateKey: string) => void;
}) {
  if (summary.trends.length === 0) return null;

  const [top] = summary.trends;
  const triggers: SymptomFoodLink[] = [];
  for (const link of summary.foodLinks) {
    if (triggers.length === MAX_TRIGGER_CARDS) break;
    if (!triggers.some((t) => t.symptom.id === link.symptom.id)) triggers.push(link);
  }
  const flare = summary.longestFlare;
  const showRun = flare !== null && flare.days >= 2;
  const flareSubject = summary.trends.length === 1 ? top.symptom.name : 'any symptom';

  return (
    <div className="trend-highlights">
      <article className="card highlight">
        <p className="highlight__eyebrow">Most severe</p>
        <h3 className="highlight__title">
          {summary.trends.length === 1 ? top.symptom.name : `${top.symptom.name} is your toughest symptom`}
        </h3>
        <p className="highlight__body">
          Avg {top.avg.toFixed(1)}/5 on {top.daysLogged} of {days.length} days{directionPhrase(top)}.
        </p>
        <Sparkline values={top.series} color={top.symptom.color} className="highlight__spark" area />
      </article>

      <article className="card highlight">
        <p className="highlight__eyebrow">Flare-ups</p>
        <h3 className="highlight__title">
          {summary.flareDays === 0
            ? 'No flare-ups'
            : `${summary.flareDays} flare-up ${summary.flareDays === 1 ? 'day' : 'days'}`}
        </h3>
        <p className="highlight__body">
          {summary.flareDays === 0
            ? 'Nothing reached 4 or 5 in this period.'
            : `Days ${flareSubject} hit 4 or 5.${showRun ? ` Longest run: ${shortDate(flare.startKey)}–${shortDate(flare.endKey)}.` : ''}`}
        </p>
        <div className={`day-strip ${days.length >= DENSE_DAYS ? 'day-strip--dense' : ''}`}>
          {days.map((dateKey, i) => {
            // One band per symptom that flared, so "any symptom" days show which ones.
            const flared = summary.trends.filter((t) => t.series[i] >= FLARE_SEVERITY);
            const names = flared.map((t) => t.symptom.name).join(', ');
            return (
              <button
                key={dateKey}
                type="button"
                className="day-strip__day"
                onClick={() => onSelectDay(dateKey)}
                aria-label={`${shortDate(dateKey)}: ${flared.length ? `flare-up (${names})` : 'no flare-up'}`}
                title={flared.length ? `${shortDate(dateKey)} · ${names}` : shortDate(dateKey)}
              >
                {flared.map((t) => (
                  <span key={t.symptom.id} className="day-strip__band" style={{ background: t.symptom.color }} />
                ))}
              </button>
            );
          })}
          {showRun ? (
            <span
              className="day-strip__outline"
              style={{
                left: `${(flare.startIndex / days.length) * 100}%`,
                width: `${(flare.days / days.length) * 100}%`,
              }}
            />
          ) : null}
        </div>
        <div className="strip-axis">
          <span>{shortDate(days[0])}</span>
          <span>{shortDate(days[days.length - 1])}</span>
        </div>
      </article>

      <article className="card highlight">
        <p className="highlight__eyebrow">Energy</p>
        {energy === null ? (
          <>
            <h3 className="highlight__title">No energy check-ins yet</h3>
            <p className="highlight__body">Rate your energy when you log mood &amp; stress to see it here.</p>
          </>
        ) : (
          <>
            <h3 className="highlight__title">
              {energy.direction ? ENERGY_TITLES[energy.direction] : `Energy averages ${energy.avg.toFixed(1)}/5`}
            </h3>
            <p className="highlight__body">
              Avg {energy.avg.toFixed(1)}/5 across {energy.daysLogged} {energy.daysLogged === 1 ? 'check-in' : 'check-ins'}.
              {energy.flareAvg !== null && energy.otherAvg !== null
                ? ` On ${summary.trends.length === 1 ? `days ${top.symptom.name} hit 4 or 5` : 'flare-up days'} it averages ${energy.flareAvg.toFixed(1)}, vs ${energy.otherAvg.toFixed(1)} on other days.`
                : ''}
            </p>
            <Sparkline values={energy.series} color={ENERGY_COLOR} className="highlight__spark" area />
          </>
        )}
      </article>

      {triggers.map((link) => (
        <article key={`${link.symptom.id}-${link.tagId}`} className="card highlight">
          <p className="highlight__eyebrow">Possible trigger</p>
          <h3 className="highlight__title">
            {link.symptom.name} shows up more on {link.tagName} days
          </h3>
          <div className="trigger-compare">
            <span>Days with {link.tagName}</span>
            <span className="trigger-compare__track">
              <span className="trigger-compare__fill" style={{ width: pct(link.avgWith), background: link.symptom.color }} />
            </span>
            <span className="trigger-compare__value">{pct(link.avgWith)}</span>
            <span>Other days</span>
            <span className="trigger-compare__track">
              <span className="trigger-compare__fill trigger-compare__fill--other" style={{ width: pct(link.avgWithout) }} />
            </span>
            <span className="trigger-compare__value">{pct(link.avgWithout)}</span>
          </div>
          <p className="highlight__note">
            Based on {link.daysWith} days you logged {link.tagName}. A pattern, not proof of cause.
          </p>
        </article>
      ))}
    </div>
  );
}
