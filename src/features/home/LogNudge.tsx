import { Icon } from '../../components/Icon';
import { ADD_OPTIONS, type AddMode } from '../add/addOptions';

// Mood first: a quick check-in is the easiest way to start the day's log.
const NUDGE_ORDER: AddMode[] = ['mood', 'food', 'symptom'];

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
  const options = NUDGE_ORDER.map((mode) => ADD_OPTIONS.find((o) => o.mode === mode)!);

  return (
    <section className="card nudge" aria-label="Log today">
      <h2 className="nudge__title">{title}</h2>
      <p className="nudge__body">{body}</p>
      <div className="nudge__actions">
        {options.map((o) => (
          <button key={o.mode} type="button" className="nudge__action" onClick={() => onAdd(o.mode)}>
            <span className="nudge__icon" style={{ background: o.color }}>
              <Icon name={o.icon} size={18} />
            </span>
            {o.label}
          </button>
        ))}
      </div>
    </section>
  );
}
