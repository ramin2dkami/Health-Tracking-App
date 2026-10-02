import { toDateKey, todayKey } from '../db/dateKey';

/** One week of day buttons, shared by Home and Trends. Today gets a label; future days can't be picked. */
export function WeekStrip({
  week,
  selectedKey,
  onSelect,
  flat = false,
}: {
  week: Date[];
  selectedKey: string;
  onSelect: (dateKey: string) => void;
  /** Drop the strip's own card background when it already sits inside a card. */
  flat?: boolean;
}) {
  const today = todayKey();

  return (
    <div className={`week ${flat ? 'week--flat' : ''}`}>
      {week.map((d) => {
        const key = toDateKey(d);
        const isToday = key === today;
        const isSelected = key === selectedKey;
        return (
          <button
            key={key}
            type="button"
            className={`week__day ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
            aria-pressed={isSelected}
            disabled={key > today}
            onClick={() => onSelect(key)}
            aria-label={
              isToday ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
            }
          >
            {/* Every column keeps the slot so weekday letters stay in one row. */}
            <span className="week__today">{isToday ? 'Today' : ''}</span>
            <span className="week__label">{d.toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
            <span className="week__dot">{d.getDate()}</span>
          </button>
        );
      })}
    </div>
  );
}
