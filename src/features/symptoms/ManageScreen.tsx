import { useEffect, useState } from 'react';
import {
  listSymptomDefinitions,
  addSymptomDefinition,
  archiveSymptomDefinition,
  renameSymptomDefinition,
  listFoodTags,
  deleteFoodTag,
  listMealTemplates,
  getProfile,
  restartOnboarding,
  SYMPTOM_COLORS,
} from '../../db/repository';
import type { SymptomDefinition, FoodTag, MealTemplate, Profile } from '../../db/schema';
import { loadDemoData, clearAllData, hasAnyData } from '../../db/demoData';
import { MealTemplateManager } from '../food/MealTemplateManager';
import { Dialog } from '../../components/Dialog';
import { useDataVersion } from '../../data/DataVersion';
import { goalLabel } from '../onboarding/options';

export function ManageScreen() {
  const { version, bump: refresh } = useDataVersion();
  const [symptoms, setSymptoms] = useState<SymptomDefinition[]>([]);
  const [foodTags, setFoodTags] = useState<FoodTag[]>([]);
  const [mealTemplates, setMealTemplates] = useState<MealTemplate[]>([]);
  const [profile, setProfile] = useState<Profile | undefined>();
  const [newSymptomName, setNewSymptomName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [demoBusy, setDemoBusy] = useState(false);
  // In-app confirm: window.confirm is silently blocked in some embedded browsers.
  const [confirming, setConfirming] = useState<'demo' | 'clear' | null>(null);

  useEffect(() => {
    Promise.all([listSymptomDefinitions(), listFoodTags(), listMealTemplates(), getProfile()]).then(([s, f, t, p]) => {
      setSymptoms(s);
      setFoodTags(f);
      setMealTemplates(t);
      setProfile(p);
    });
  }, [version]);

  async function handleAddSymptom(e: React.FormEvent) {
    e.preventDefault();
    const name = newSymptomName.trim();
    if (!name) return;
    const color = SYMPTOM_COLORS[symptoms.length % SYMPTOM_COLORS.length];
    await addSymptomDefinition(name, color);
    setNewSymptomName('');
    refresh();
  }

  async function handleArchive(id: number) {
    await archiveSymptomDefinition(id);
    refresh();
  }

  function startEdit(s: SymptomDefinition) {
    setEditingId(s.id);
    setEditingName(s.name);
  }

  async function saveEdit(s: SymptomDefinition) {
    const name = editingName.trim();
    if (name) {
      await renameSymptomDefinition(s.id, name, s.color);
    }
    setEditingId(null);
    refresh();
  }

  async function handleDeleteTag(id: number) {
    await deleteFoodTag(id);
    refresh();
  }

  async function handleLoadDemo() {
    if (await hasAnyData()) setConfirming('demo');
    else await loadDemo();
  }

  async function loadDemo() {
    setConfirming(null);
    setDemoBusy(true);
    try {
      await loadDemoData();
    } finally {
      setDemoBusy(false);
      refresh();
    }
  }

  async function handleRedoSetup() {
    if (!profile) return;
    await restartOnboarding(profile.id);
    refresh();
  }

  async function clearAll() {
    setConfirming(null);
    await clearAllData();
    refresh();
  }

  return (
    <div className="screen">
      <header className="page-head">
        <p className="page-head__eyebrow">Your setup</p>
        <h1>Manage</h1>
      </header>

      {profile && (
        <section className="card">
          <div className="card__head">
            <div>
              <h2>{profile.name}</h2>
              {profile.email && <p className="muted">{profile.email}</p>}
            </div>
            <button type="button" className="btn btn--small" onClick={handleRedoSetup}>
              Redo setup
            </button>
          </div>
          <ul className="rows">
            <li className="row">
              <span className="row__label">
                Goals
                <span className="row__sub">{profile.goals.map(goalLabel).join(', ') || 'None picked'}</span>
              </span>
            </li>
            <li className="row">
              <span className="row__label">
                Suspected foods
                <span className="row__sub">{profile.suspectedTriggers.join(', ') || 'None yet'}</span>
              </span>
            </li>
          </ul>
        </section>
      )}

      <section className="card">
        <h2 className="card__title">Symptoms you track</h2>
        <form onSubmit={handleAddSymptom} className="inline-form">
          <input
            className="input"
            value={newSymptomName}
            onChange={(e) => setNewSymptomName(e.target.value)}
            placeholder="e.g. stomach pain, scalp flare"
            aria-label="New symptom name"
          />
          <button type="submit" className="btn btn--dark">
            Add
          </button>
        </form>
        <ul className="rows">
          {symptoms.map((s) => (
            <li key={s.id} className="row">
              <span className="color-dot color-dot--lg" style={{ background: s.color }} />
              {editingId === s.id ? (
                <>
                  <input
                    className="input input--compact"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    aria-label="Symptom name"
                    autoFocus
                  />
                  <button type="button" className="btn btn--small btn--dark" onClick={() => saveEdit(s)}>
                    Save
                  </button>
                </>
              ) : (
                <>
                  <span className="row__label">{s.name}</span>
                  <button type="button" className="btn btn--small" onClick={() => startEdit(s)}>
                    Rename
                  </button>
                  <button type="button" className="btn btn--small" onClick={() => handleArchive(s.id)}>
                    Archive
                  </button>
                </>
              )}
            </li>
          ))}
          {symptoms.length === 0 && <li className="muted">No symptoms yet — add the ones you want to track.</li>}
        </ul>
      </section>

      <section className="card">
        <h2 className="card__title">Saved meals</h2>
        <p className="card__sub">Pick these when logging food, or save new ones from the Log food screen.</p>
        <MealTemplateManager templates={mealTemplates} foodTags={foodTags} onChanged={refresh} />
      </section>

      <section className="card">
        <h2 className="card__title">Food tags</h2>
        {foodTags.length === 0 ? (
          <p className="muted">Tags appear here as you log food.</p>
        ) : (
          <div className="chips">
            {foodTags.map((t) => (
              <span key={t.id} className="chip chip--small">
                {t.name}
                <button
                  type="button"
                  className="chip__remove"
                  onClick={() => handleDeleteTag(t.id)}
                  aria-label={`Delete ${t.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="card__title">Demo data</h2>
        <p className="card__sub">
          Fill the diary with 90 days of sample entries from someone with IBS whose flares bring on seborrheic
          dermatitis, anxiety and poor sleep. Replaces everything currently in your diary.
        </p>
        <div className="form-actions">
          <button type="button" className="btn" onClick={() => setConfirming('clear')} disabled={demoBusy}>
            Clear all data
          </button>
          <button type="button" className="btn btn--dark" onClick={handleLoadDemo} disabled={demoBusy}>
            {demoBusy ? 'Loading…' : 'Load demo data'}
          </button>
        </div>
      </section>

      {confirming && (
        <Dialog
          title={confirming === 'demo' ? 'Replace your diary with demo data?' : 'Delete everything in your diary?'}
          onClose={() => setConfirming(null)}
        >
          <p className="dialog__body">
            {confirming === 'demo'
              ? 'Everything currently in your diary is replaced with 90 days of sample entries. This can’t be undone.'
              : 'All your logs, symptoms, foods and saved meals are deleted. This can’t be undone.'}
          </p>
          <div className="dialog__actions">
            <button type="button" className="btn btn--dark" onClick={confirming === 'demo' ? loadDemo : clearAll}>
              {confirming === 'demo' ? 'Replace with demo data' : 'Delete everything'}
            </button>
            <button type="button" className="btn btn--small" onClick={() => setConfirming(null)}>
              Cancel
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
