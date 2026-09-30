import { useState } from 'react';
import type { FoodTag, MealTemplate } from '../../db/schema';
import { findOrCreateFoodTag, addFoodLog, saveMealTemplate } from '../../db/repository';

export function FoodQuickAdd({
  foodTags,
  templates: initialTemplates,
  onAdded,
}: {
  foodTags: FoodTag[];
  templates: MealTemplate[];
  onAdded: () => void;
}) {
  const [pendingTags, setPendingTags] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [mealLabel, setMealLabel] = useState('');
  const [templates, setTemplates] = useState(initialTemplates);
  const [tagNamesById, setTagNamesById] = useState(() => new Map(foodTags.map((t) => [t.id, t.name])));
  const [savingName, setSavingName] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState('');

  const query = input.trim().toLowerCase();
  const suggestions = foodTags
    .filter((t) => (query ? t.name.includes(query) : true))
    .filter((t) => !pendingTags.includes(t.name))
    .slice(0, 8);

  // Includes whatever is still typed in the box, so nothing is silently dropped.
  function allTags() {
    const typed = input.trim().toLowerCase();
    return typed && !pendingTags.includes(typed) ? [...pendingTags, typed] : pendingTags;
  }

  function addTag(name: string) {
    const clean = name.trim().toLowerCase();
    if (!clean || pendingTags.includes(clean)) return;
    setPendingTags([...pendingTags, clean]);
    setInput('');
  }

  function removeTag(name: string) {
    setPendingTags(pendingTags.filter((t) => t !== name));
  }

  function templateTagNames(template: MealTemplate) {
    return template.tagIds.map((id) => tagNamesById.get(id)).filter((n): n is string => !!n);
  }

  function applyTemplate(template: MealTemplate) {
    const names = templateTagNames(template);
    setPendingTags([...pendingTags, ...names.filter((n) => !pendingTags.includes(n))]);
    if (!mealLabel.trim()) setMealLabel(template.name);
    setSavedMessage('');
  }

  function isApplied(template: MealTemplate) {
    const names = templateTagNames(template);
    return names.length > 0 && names.every((n) => pendingTags.includes(n));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tags = allTags();
    if (tags.length === 0) return;
    const tagIds = await Promise.all(tags.map((name) => findOrCreateFoodTag(name)));
    await addFoodLog(tagIds, mealLabel.trim() || undefined);
    onAdded();
  }

  async function handleSaveTemplate() {
    const name = savingName?.trim();
    const tags = allTags();
    if (!name || tags.length === 0) return;
    const tagIds = await Promise.all(tags.map((n) => findOrCreateFoodTag(n)));
    const saved = await saveMealTemplate(name, tagIds);
    const names = new Map(tagNamesById);
    tags.forEach((n, i) => names.set(tagIds[i], n));
    setTagNamesById(names);
    const replaced = templates.some((t) => t.id === saved.id);
    setTemplates(replaced ? templates.map((t) => (t.id === saved.id ? saved : t)) : [...templates, saved]);
    setPendingTags(tags);
    setInput('');
    if (!mealLabel.trim()) setMealLabel(saved.name);
    setSavingName(null);
    setSavedMessage(replaced ? `Updated “${saved.name}”` : `Saved “${saved.name}” to your meals`);
  }

  const hasTags = allTags().length > 0;

  return (
    <form onSubmit={handleSubmit} className="form">
      {templates.length > 0 && (
        <div>
          <span className="field-label">Saved meals</span>
          <div className="chips" role="group" aria-label="Saved meals">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`chip chip--meal ${isApplied(t) ? 'is-selected' : ''}`}
                onClick={() => applyTemplate(t)}
                title={templateTagNames(t).join(' · ')}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <label>
        <span className="field-label">Meal (optional)</span>
        <input
          className="input"
          value={mealLabel}
          onChange={(e) => setMealLabel(e.target.value)}
          placeholder="Breakfast, lunch, snack…"
        />
      </label>
      <div>
        <span className="field-label">What did you eat?</span>
        <div className="tag-input">
          {pendingTags.map((t) => (
            <span key={t} className="chip is-selected chip--small">
              {t}
              <button type="button" className="chip__remove" onClick={() => removeTag(t)} aria-label={`Remove ${t}`}>
                ×
              </button>
            </span>
          ))}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingTags.length ? 'Add more…' : 'Type an ingredient, press Enter'}
          />
        </div>
        {suggestions.length > 0 && (
          <div className="chips chips--suggest">
            {suggestions.map((s) => (
              <button key={s.id} type="button" className="chip chip--small" onClick={() => addTag(s.name)}>
                + {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {savingName !== null && (
        <div className="save-meal">
          <span className="field-label">Name this meal</span>
          <div className="inline-form">
            <input
              className="input"
              value={savingName}
              onChange={(e) => setSavingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveTemplate();
                }
              }}
              placeholder="e.g. Usual breakfast"
              aria-label="Saved meal name"
              autoFocus
            />
            <button type="button" className="btn btn--dark" onClick={handleSaveTemplate} disabled={!savingName.trim()}>
              Save
            </button>
          </div>
          <button type="button" className="btn btn--small" onClick={() => setSavingName(null)}>
            Cancel
          </button>
        </div>
      )}
      {savedMessage && (
        <p className="muted" role="status">
          {savedMessage}
        </p>
      )}

      <div className="form-actions">
        <button
          type="button"
          className="btn"
          disabled={!hasTags || savingName !== null}
          onClick={() => {
            setSavingName(mealLabel.trim());
            setSavedMessage('');
          }}
        >
          Save as meal
        </button>
        <button type="submit" className="btn btn--dark" disabled={!hasTags}>
          Log food
        </button>
      </div>
    </form>
  );
}
