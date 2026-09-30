import { useState } from 'react';
import type { SymptomDefinition } from '../../db/schema';
import { addSymptomLog, findOrCreateSymptomDefinition } from '../../db/repository';
import { useDataVersion } from '../../data/DataVersion';
import { capitalize } from './commonSymptoms';
import { SymptomAdder } from './SymptomAdder';

const SEVERITIES = [1, 2, 3, 4, 5];
const NEW_SYMPTOM_SEVERITY = 3;

export function SymptomQuickAdd({
  symptoms: initialSymptoms,
  onAdded,
}: {
  symptoms: SymptomDefinition[];
  onAdded: () => void;
}) {
  const [symptoms, setSymptoms] = useState(initialSymptoms);
  // Only rated symptoms get logged; tapping the selected number again clears it.
  const [ratings, setRatings] = useState<Map<number, number>>(new Map());
  const { bump } = useDataVersion();

  function rate(id: number, severity: number) {
    setRatings((prev) => {
      const next = new Map(prev);
      if (next.get(id) === severity) next.delete(id);
      else next.set(id, severity);
      return next;
    });
  }

  // Saves the symptom right away so it stays in the list even if nothing gets logged.
  async function addSymptom(name: string) {
    const symptom = await findOrCreateSymptomDefinition(capitalize(name));
    if (!symptoms.some((s) => s.id === symptom.id)) {
      setSymptoms((prev) => [...prev, symptom]);
      bump();
    }
    // They're adding it because they have it, so start it rated.
    setRatings((prev) => (prev.has(symptom.id) ? prev : new Map(prev).set(symptom.id, NEW_SYMPTOM_SEVERITY)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (ratings.size === 0) return;
    for (const [id, severity] of ratings) await addSymptomLog(id, severity);
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      {symptoms.length > 0 ? (
        <div>
          <div className="symptom-rates__head">
            <span className="field-label">Rate what you’re feeling</span>
            <span className="symptom-rates__hint">1 mild · 5 severe</span>
          </div>
          <ul className="symptom-rates">
            {symptoms.map((s) => {
              const value = ratings.get(s.id);
              return (
                <li key={s.id} className={`symptom-rate ${value ? 'is-rated' : ''}`}>
                  <span className="symptom-rate__name">
                    <span className="color-dot" style={{ background: s.color }} />
                    {s.name}
                  </span>
                  <span className="symptom-rate__scale" role="group" aria-label={`${s.name} severity`}>
                    {SEVERITIES.map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`symptom-rate__option ${value === n ? 'is-selected' : ''}`}
                        style={value === n ? { background: s.color, borderColor: s.color } : undefined}
                        aria-pressed={value === n}
                        aria-label={`${s.name} ${n} of 5`}
                        onClick={() => rate(s.id, n)}
                      >
                        {n}
                      </button>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div>
        <span className="field-label">{symptoms.length > 0 ? 'Something else?' : 'What are you feeling?'}</span>
        <SymptomAdder trackedNames={symptoms.map((s) => s.name)} onAdd={addSymptom} autoFocus={symptoms.length === 0} />
      </div>

      <button type="submit" className="btn btn--dark btn--block" disabled={ratings.size === 0}>
        {ratings.size > 1 ? `Log ${ratings.size} symptoms` : 'Log symptom'}
      </button>
    </form>
  );
}
