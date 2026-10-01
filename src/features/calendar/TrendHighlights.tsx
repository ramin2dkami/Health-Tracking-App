import type { SymptomFoodLink } from './foodAssociations';
import { FLARE_SEVERITY, type TrendSummaryData } from './summarizeTrends';
import { Sparkline } from './Sparkline';
import { DENSE_DAYS, directionPhrase, pct, shortDate } from './trendFormat';

const MAX_TRIGGER_CARDS = 2;

export function TrendHighlights({
  summary,
  days,
  onSelectDay,
}: {
  summary: TrendSummaryData;
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
