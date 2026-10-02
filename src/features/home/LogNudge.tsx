import type { AddMode } from '../add/addOptions';

function nudgeMessage(streak: number, daysSinceLast: number | null): { title: string; body: string } {
  if (streak >= 2) {
    return {
      title: `${streak}-day streak`,
      body: 'Nothing logged yet today. Add an entry to keep your streak going.',
    };
  }
  if (daysSinceLast !== null && daysSinceLast > 1) {
    return {
      title: 'Welcome back',
      body: `Your last entry was ${daysSinceLast} days ago. Pick up where you left off, even a quick check-in helps.`,
    };
  }
  return {
    title: 'New day, nothing logged yet',
    body: 'Regular entries, even on good days, make your patterns easier to spot.',
  };
}

export function LogNudge({
  streak,
  daysSinceLast,
  onAdd,
}: {
  streak: number;
  daysSinceLast: number | null;
  onAdd: (mode: AddMode) => void;
}) {
  const { title, body } = nudgeMessage(streak, daysSinceLast);

  return (
    <section className="card nudge" aria-label="Log today">
      <h2 className="nudge__title">{title}</h2>
      <p className="nudge__body">{body}</p>
      <button type="button" className="btn btn--pink btn--block" onClick={() => onAdd('menu')}>
        Log today
      </button>
    </section>
  );
}
