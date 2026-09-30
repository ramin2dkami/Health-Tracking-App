import { useEffect, useState } from 'react';
import type { Profile } from '../../db/schema';
import { completeOnboarding, listSymptomDefinitions } from '../../db/repository';
import { useDataVersion } from '../../data/DataVersion';
import { Icon } from '../../components/Icon';
import { COMMON_SYMPTOMS, capitalize } from '../symptoms/commonSymptoms';
import { COMMON_TRIGGERS, ONBOARDING_GOALS } from './options';

const STEPS = [
  {
    title: 'What do you want to track?',
    sub: 'Pick the symptoms you deal with. You can change these any time in Manage.',
  },
  {
    title: 'What brings you here?',
    sub: 'Optional. Pick any that apply.',
  },
  {
    title: 'Any foods you already suspect?',
    sub: 'Optional. We’ll add them to your food list so they’re quick to log.',
  },
];

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// Chips for known options plus an input for adding your own. New entries are selected right away.
function ChipPicker({
  options,
  selected,
  onChange,
  normalize,
  placeholder,
  label,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  normalize: (raw: string) => string;
  placeholder: string;
  label: string;
}) {
  const [input, setInput] = useState('');
  // Keeps added entries visible after they're unselected.
  const [added, setAdded] = useState<string[]>([]);
  const all = [...options, ...added, ...selected];
  const shown = all.filter((name, i) => all.findIndex((n) => n.toLowerCase() === name.toLowerCase()) === i);

  function add() {
    const clean = normalize(input);
    if (!clean) return;
    const match = shown.find((n) => n.toLowerCase() === clean.toLowerCase());
    if (!match) setAdded([...added, clean]);
    if (!selected.includes(match ?? clean)) onChange([...selected, match ?? clean]);
    setInput('');
  }

  return (
    <>
      <div className="chips" role="group" aria-label={label}>
        {shown.map((name) => {
          const isOn = selected.includes(name);
          return (
            <button
              key={name}
              type="button"
              className={`chip ${isOn ? 'is-selected' : ''}`}
              aria-pressed={isOn}
              onClick={() => onChange(toggle(selected, name))}
            >
              {name}
            </button>
          );
        })}
      </div>
      <div className="inline-form onboarding__add">
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          aria-label={`Add your own: ${label.toLowerCase()}`}
        />
        <button type="button" className="btn btn--dark" onClick={add} disabled={!input.trim()}>
          Add
        </button>
      </div>
    </>
  );
}

export function OnboardingFlow({ profile }: { profile: Profile }) {
  const { bump } = useDataVersion();
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const [symptomOptions, setSymptomOptions] = useState<string[]>(COMMON_SYMPTOMS);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>(profile.goals);
  const [triggers, setTriggers] = useState<string[]>(profile.suspectedTriggers);

  // Starts from what's already tracked, so re-running setup doesn't lose anything by accident.
  useEffect(() => {
    listSymptomDefinitions().then((defs) => {
      const tracked = defs.map((d) => d.name);
      const trackedLower = new Set(tracked.map((n) => n.toLowerCase()));
      setSymptomOptions([...tracked, ...COMMON_SYMPTOMS.filter((n) => !trackedLower.has(n.toLowerCase()))]);
      setSymptoms(tracked);
      setReady(true);
    });
  }, []);

  const isLast = step === STEPS.length - 1;
  const canContinue = step !== 0 || symptoms.length > 0;

  async function finish() {
    setBusy(true);
    await completeOnboarding(profile.id, { symptomNames: symptoms, goals, triggerNames: triggers });
    bump();
  }

  function next() {
    if (isLast) finish();
    else setStep(step + 1);
  }

  if (!ready) return null;

  return (
    <div className="screen onboarding">
      <header className="onboarding__top">
        <button
          type="button"
          className={`icon-btn ${step === 0 ? 'icon-btn--ghost' : ''}`}
          onClick={() => setStep(step - 1)}
          aria-label="Back"
        >
          <Icon name="chevronLeft" />
        </button>
        <div
          className="onboarding__progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-label={`Step ${step + 1} of ${STEPS.length}`}
        >
          {STEPS.map((_, i) => (
            <span key={i} className={`onboarding__dot ${i <= step ? 'is-done' : ''}`} />
          ))}
        </div>
        <span className="icon-btn icon-btn--ghost" aria-hidden="true" />
      </header>

      <header className="page-head">
        <p className="page-head__eyebrow">
          {step === 0 ? `Hi ${profile.name}! ` : ''}Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="onboarding__title">{STEPS[step].title}</h1>
        <p className="section__sub">{STEPS[step].sub}</p>
      </header>

      <div className="onboarding__body">
        {step === 0 && (
          <ChipPicker
            label="Symptoms"
            options={symptomOptions}
            selected={symptoms}
            onChange={setSymptoms}
            normalize={capitalize}
            placeholder="Something else? e.g. hives"
          />
        )}

        {step === 1 && (
          <div className="choices" role="group" aria-label="Goals">
            {ONBOARDING_GOALS.map((g) => {
              const isOn = goals.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  className={`choice ${isOn ? 'is-selected' : ''}`}
                  aria-pressed={isOn}
                  onClick={() => setGoals(toggle(goals, g.id))}
                >
                  <span>{g.label}</span>
                  <span className="choice__check" aria-hidden="true">
                    {isOn ? '✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <ChipPicker
            label="Suspected foods"
            options={COMMON_TRIGGERS}
            selected={triggers}
            onChange={setTriggers}
            normalize={(raw) => raw.trim().toLowerCase()}
            placeholder="Another food? e.g. tomatoes"
          />
        )}
      </div>

      <footer className="onboarding__footer">
        {step === 0 && !canContinue && <p className="muted onboarding__hint">Pick at least one symptom to continue.</p>}
        <button type="button" className="btn btn--dark btn--block" onClick={next} disabled={!canContinue || busy}>
          {isLast ? 'Start my diary' : 'Continue'}
        </button>
      </footer>
    </div>
  );
}
