import { useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { ScalePicker } from '../../components/ScalePicker';
import type { FoodTag, SymptomDefinition } from '../../db/schema';
import { findOrCreateFoodTag, updateFoodLog, updateMoodLog, updateSymptomLog } from '../../db/repository';
import { FoodTagInput } from '../food/FoodTagInput';
import { withTypedTag } from '../food/foodTagText';
import { MoodScales } from '../mood/MoodScales';
import type { Row } from './TodayEntryList';

const pad = (n: number) => String(n).padStart(2, '0');

function toTimeInput(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Same calendar day as the entry (its dateKey), new local time. */
function fromTimeInput(dateKey: string, time: string) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min);
}

const TITLES: Record<Row['kind'], string> = {
  symptom: 'Edit symptom',
  food: 'Edit food',
  mood: 'Edit mood & stress',
};

export function EditEntrySheet({
  row,
  symptomsById,
  foodTags,
  foodTagsById,
  onClose,
  onSaved,
}: {
  row: Row;
  symptomsById: Map<number, SymptomDefinition>;
  foodTags: FoodTag[];
  foodTagsById: Map<number, FoodTag>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [time, setTime] = useState(toTimeInput(row.entry.timestamp));
  const [severity, setSeverity] = useState(row.kind === 'symptom' ? row.entry.severity : 3);
  const [mealLabel, setMealLabel] = useState(row.kind === 'food' ? (row.entry.mealLabel ?? '') : '');
  const [tags, setTags] = useState(() =>
    row.kind === 'food' ? row.entry.tagIds.map((id) => foodTagsById.get(id)?.name).filter((n): n is string => !!n) : [],
  );
  const [input, setInput] = useState('');
  // Older check-ins may be missing stress or energy; start those at the middle of the scale.
  const [scores, setScores] = useState(() => ({
    moodScore: row.kind === 'mood' ? row.entry.moodScore : 3,
    stressScore: row.kind === 'mood' ? (row.entry.stressScore ?? 3) : 3,
    energyScore: row.kind === 'mood' ? (row.entry.energyScore ?? 3) : 3,
  }));

  const when = time ? fromTimeInput(row.entry.dateKey, time) : null;
  const inFuture = when !== null && when > new Date();
  const foodEmpty = row.kind === 'food' && withTypedTag(tags, input).length === 0;
  const canSave = when !== null && !inFuture && !foodEmpty;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    const timestamp = when.toISOString();
    if (row.kind === 'symptom') {
      await updateSymptomLog(row.entry.id, { severity, timestamp });
    } else if (row.kind === 'food') {
      const tagIds = await Promise.all(withTypedTag(tags, input).map((n) => findOrCreateFoodTag(n)));
      await updateFoodLog(row.entry.id, { tagIds, mealLabel: mealLabel.trim() || undefined, timestamp });
    } else {
      await updateMoodLog(row.entry.id, { ...scores, timestamp });
    }
    onSaved();
  }

  const symptom = row.kind === 'symptom' ? symptomsById.get(row.entry.symptomId) : undefined;

  return (
    <Sheet title={TITLES[row.kind]} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        {row.kind === 'symptom' && (
          <ScalePicker
            label={symptom?.name ?? 'Severity'}
            value={severity}
            onChange={setSeverity}
            color={symptom?.color ?? 'var(--pink)'}
            lowHint="Mild"
            highHint="Severe"
          />
        )}

        {row.kind === 'food' && (
          <>
            <label>
              <span className="field-label">Meal (optional)</span>
              <input
                className="input"
                value={mealLabel}
                onChange={(e) => setMealLabel(e.target.value)}
                placeholder="Breakfast, lunch, snack…"
              />
            </label>
            <FoodTagInput tags={tags} onTagsChange={setTags} input={input} onInputChange={setInput} foodTags={foodTags} />
          </>
        )}

        {row.kind === 'mood' && <MoodScales value={scores} onChange={setScores} />}

        <label>
          <span className="field-label">Time</span>
          <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </label>
        {inFuture && (
          <p className="field-error" role="alert">
            That time hasn’t happened yet.
          </p>
        )}

        <button type="submit" className="btn btn--dark btn--block" disabled={!canSave}>
          Save changes
        </button>
      </form>
    </Sheet>
  );
}
