import type { SymptomDefinition, SymptomLog, FoodLog, FoodTag, MoodLog } from '../../db/schema';
import { deleteSymptomLog, deleteFoodLog, deleteMoodLog } from '../../db/repository';
import { Icon, type IconName } from '../../components/Icon';

interface Props {
  symptomLogs: SymptomLog[];
  symptomsById: Map<number, SymptomDefinition>;
  foodLogs: FoodLog[];
  foodTagsById: Map<number, FoodTag>;
  moodLogs: MoodLog[];
  onChanged: () => void;
  onAdd: () => void;
}

type Row =
  | { kind: 'symptom'; time: string; entry: SymptomLog }
  | { kind: 'food'; time: string; entry: FoodLog }
  | { kind: 'mood'; time: string; entry: MoodLog };

const KIND_STYLE: Record<Row['kind'], { icon: IconName; color: string }> = {
  symptom: { icon: 'bolt', color: 'var(--pink)' },
  food: { icon: 'food', color: 'var(--yellow)' },
  mood: { icon: 'smile', color: 'var(--lavender)' },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function TodayEntryList({
  symptomLogs,
  symptomsById,
  foodLogs,
  foodTagsById,
  moodLogs,
  onChanged,
  onAdd,
}: Props) {
  const rows: Row[] = [
    ...symptomLogs.map((entry) => ({ kind: 'symptom' as const, time: entry.timestamp, entry })),
    ...foodLogs.map((entry) => ({ kind: 'food' as const, time: entry.timestamp, entry })),
    ...moodLogs.map((entry) => ({ kind: 'mood' as const, time: entry.timestamp, entry })),
  ].sort((a, b) => b.time.localeCompare(a.time));

  async function handleDelete(row: Row) {
    if (row.kind === 'symptom') await deleteSymptomLog(row.entry.id);
    if (row.kind === 'food') await deleteFoodLog(row.entry.id);
    if (row.kind === 'mood') await deleteMoodLog(row.entry.id);
    onChanged();
  }

  if (rows.length === 0) {
    return (
      <div className="empty-card">
        <p>Nothing logged yet today.</p>
        <button type="button" className="btn btn--dark" onClick={onAdd}>
          Add your first entry
        </button>
      </div>
    );
  }

  return (
    <ul className="entries">
      {rows.map((row) => {
        const { icon, color } = KIND_STYLE[row.kind];
        let title = '';
        let detail = '';
        if (row.kind === 'symptom') {
          title = symptomsById.get(row.entry.symptomId)?.name ?? 'Unknown symptom';
          detail = `Severity ${row.entry.severity}/5`;
        } else if (row.kind === 'food') {
          title = row.entry.mealLabel ?? 'Food';
          detail = row.entry.tagIds.map((id) => foodTagsById.get(id)?.name ?? '?').join(' · ');
        } else {
          title = 'Mood & stress';
          detail = [
            `Overall mood ${row.entry.moodScore}/5`,
            row.entry.stressScore ? `Stress ${row.entry.stressScore}/5` : null,
            row.entry.anxietyScore ? `Anxiety ${row.entry.anxietyScore}/5` : null,
          ]
            .filter(Boolean)
            .join(' · ');
        }
        return (
          <li key={`${row.kind}-${row.entry.id}`} className="entry">
            <span className="entry__icon" style={{ background: color }}>
              <Icon name={icon} size={18} />
            </span>
            <span className="entry__text">
              <span className="entry__title">{title}</span>
              <span className="entry__detail">{detail}</span>
            </span>
            <span className="entry__time">{formatTime(row.time)}</span>
            <button
              type="button"
              className="icon-btn icon-btn--small"
              onClick={() => handleDelete(row)}
              aria-label={`Delete ${title}`}
            >
              <Icon name="trash" size={16} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
