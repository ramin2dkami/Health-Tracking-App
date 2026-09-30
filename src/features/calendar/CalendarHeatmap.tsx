import { toDateKey, todayKey } from '../../db/dateKey';
import { severityColor } from './severityColors';

function buildWeek(weekStart: Date): Date[] {
  return Array.from(
    { length: 7 },
    (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i),
  );
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function CalendarHeatmap({
  weekStart,
  severityByDay,
  onSelectDay,
}: {
  weekStart: Date;
  severityByDay: Map<string, number>;
  onSelectDay: (dateKey: string) => void;
}) {
  const cells = buildWeek(weekStart);
  const today = todayKey();

  return (
    <div className="heatmap">
      {WEEKDAYS.map((w, i) => (
        <div key={i} className="heatmap__weekday" aria-hidden="true">
          {w}
        </div>
      ))}
      {cells.map((date, i) => {
        const dateKey = toDateKey(date);
        const severity = severityByDay.get(dateKey);
        return (
          <button
            key={i}
            type="button"
            className={`heatmap__cell ${dateKey === today ? 'is-today' : ''}`}
            style={{ background: severityColor(severity) }}
            onClick={() => onSelectDay(dateKey)}
            aria-label={`${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}: ${severity ? `worst severity ${severity}` : 'no symptoms logged'}`}
          >
            {date.getDate()}
          </button>
        );
      })}
    </div>
  );
}
