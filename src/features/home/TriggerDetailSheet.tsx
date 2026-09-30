import { Sheet } from '../../components/Sheet';
import type { FoodEffect, InsightWindow } from './insights';
import { LEVEL_BADGE, capitalize } from './triggerLevels';

const pct = (share: number) => `${Math.round(share * 100)}%`;

function headline(effect: FoodEffect, windowDays: InsightWindow): string {
  const symptoms = effect.links.map((l) => l.symptom.name.toLowerCase()).join(' and ');
  switch (effect.level) {
    case 'avoid':
      return `Strongly linked to ${symptoms} over the last ${windowDays} days.`;
    case 'limit':
      return `Linked to ${symptoms} over the last ${windowDays} days.`;
    case 'help':
      return `Fewer ${symptoms} days when you had ${effect.tagName} over the last ${windowDays} days.`;
  }
}

function tip(effect: FoodEffect): string {
  const food = effect.tagName;
  const symptom = effect.links[0].symptom.name.toLowerCase();
  switch (effect.level) {
    case 'avoid':
      return `Try cutting out ${food} for 2 weeks and keep logging to see if your ${symptom} improves. Check with your doctor before cutting foods out long-term.`;
    case 'limit':
      return `Try having less ${food} for 2 weeks and keep logging to see if your ${symptom} changes.`;
    case 'help':
      return `Worth keeping ${food} in your routine and seeing if the pattern holds.`;
  }
}

function CompareBar({ label, share, fill }: { label: string; share: number; fill: string }) {
  return (
    <div className="compare__row">
      <span className="compare__label">{label}</span>
      <span className="compare__track" aria-hidden="true">
        <span className="compare__fill" style={{ width: pct(share), background: fill }} />
      </span>
      <span className="compare__value">{pct(share)}</span>
    </div>
  );
}

export function TriggerDetailSheet({
  effect,
  windowDays,
  onClose,
}: {
  effect: FoodEffect;
  windowDays: InsightWindow;
  onClose: () => void;
}) {
  const badge = LEVEL_BADGE[effect.level];
  const food = effect.tagName;

  return (
    <Sheet title={capitalize(food)} onClose={onClose}>
      <div className="trigger-sheet__hero">
        <span className={`insight-delta ${badge.className}`}>{badge.label}</span>
        <p>{headline(effect, windowDays)}</p>
      </div>

      <section className="trigger-sheet__section">
        <h3>How often symptoms showed up</h3>
        {effect.links.map((l) => (
          <div key={l.symptom.id} className="compare">
            <p className="compare__title">
              <span className="color-dot" style={{ background: l.symptom.color }} />
              {l.symptom.name}
            </p>
            <CompareBar label={`With ${food} · ${l.daysWith}d`} share={l.avgWith} fill={badge.fill} />
            <CompareBar label={`Without · ${l.daysWithout}d`} share={l.avgWithout} fill="rgba(20, 20, 20, 0.28)" />
          </div>
        ))}
      </section>

      <section className="trigger-sheet__section">
        <h3>What to try</h3>
        <p>{tip(effect)}</p>
      </section>

      <p className="insight-footnote">
        Based on days you logged symptoms. This shows a pattern in your own logs, not proof of cause or a diagnosis.
      </p>
    </Sheet>
  );
}
