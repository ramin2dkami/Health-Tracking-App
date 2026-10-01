import { useState } from 'react';
import type { FoodTag, MealTemplate } from '../../db/schema';
import { findOrCreateFoodTag, addFoodLog, saveMealTemplate, updateMealTemplateTags } from '../../db/repository';
import { Dialog } from '../../components/Dialog';
import { FoodTagInput } from './FoodTagInput';
import { withTypedTag } from './foodTagText';

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
  // The saved meal the form was started from; edits to it can overwrite it.
  const [loadedId, setLoadedId] = useState<number | null>(null);
  const [confirmingOverwrite, setConfirmingOverwrite] = useState(false);
  const [nameError, setNameError] = useState('');

  const allTags = () => withTypedTag(pendingTags, input);

  function templateTagNames(template: MealTemplate) {
    return template.tagIds.map((id) => tagNamesById.get(id)).filter((n): n is string => !!n);
  }

  function applyTemplate(template: MealTemplate) {
    const names = templateTagNames(template);
    setPendingTags([...pendingTags, ...names.filter((n) => !pendingTags.includes(n))]);
    // Combining a meal with other foods isn't an edit of that meal, so only track it on an empty form.
    setLoadedId(pendingTags.length === 0 ? template.id : null);
    if (!mealLabel.trim()) setMealLabel(template.name);
    setSavedMessage('');
  }

  function isApplied(template: MealTemplate) {
    const names = templateTagNames(template);
    return names.length > 0 && names.every((n) => pendingTags.includes(n));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tags = allTags();
    if (tags.length === 0) return;
    const tagIds = await Promise.all(tags.map((name) => findOrCreateFoodTag(name)));
    await addFoodLog(tagIds, mealLabel.trim() || undefined);
    onAdded();
  }

  async function resolveTags() {
    const tags = allTags();
    const tagIds = await Promise.all(tags.map((n) => findOrCreateFoodTag(n)));
    const names = new Map(tagNamesById);
    tags.forEach((n, i) => names.set(tagIds[i], n));
    setTagNamesById(names);
    setPendingTags(tags);
    setInput('');
    return tagIds;
  }

  async function handleSaveTemplate() {
    const name = savingName?.trim();
    if (!name || allTags().length === 0) return;
    // saveMealTemplate overwrites on a name match; overwriting only happens through the confirm dialog.
    if (templates.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      setNameError(`You already have a meal called “${name}”. Pick another name.`);
      return;
    }
    const saved = await saveMealTemplate(name, await resolveTags());
    setTemplates([...templates, saved]);
    setLoadedId(saved.id);
    if (!mealLabel.trim()) setMealLabel(saved.name);
    setSavingName(null);
    setSavedMessage(`Saved “${saved.name}” to your meals`);
  }

  async function handleOverwrite() {
    if (!loaded) return;
    const tagIds = await resolveTags();
    await updateMealTemplateTags(loaded.id, tagIds);
    setTemplates(templates.map((t) => (t.id === loaded.id ? { ...t, tagIds } : t)));
    setConfirmingOverwrite(false);
    setSavedMessage(`Updated “${loaded.name}”`);
  }

  function startSaving(name: string) {
    setSavingName(name);
    setNameError('');
    setSavedMessage('');
  }

  function handleSaveClick() {
    if (loaded) setConfirmingOverwrite(true);
    else startSaving(mealLabel.trim());
  }

  const hasTags = allTags().length > 0;
  const loaded = templates.find((t) => t.id === loadedId);
  const loadedUnchanged = (() => {
    if (!loaded) return false;
    const current = allTags();
    const original = templateTagNames(loaded);
    return current.length === original.length && original.every((n) => current.includes(n));
  })();

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
      <FoodTagInput
        tags={pendingTags}
        onTagsChange={setPendingTags}
        input={input}
        onInputChange={setInput}
        foodTags={foodTags}
      />

      {savingName !== null && (
        <div className="save-meal">
          <span className="field-label">Name this meal</span>
          <div className="inline-form">
            <input
              className="input"
              value={savingName}
              onChange={(e) => {
                setSavingName(e.target.value);
                setNameError('');
              }}
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
          {nameError && (
            <p className="field-error" role="alert">
              {nameError}
            </p>
          )}
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
          disabled={!hasTags || savingName !== null || loadedUnchanged}
          title={loadedUnchanged ? 'Change the foods to update this saved meal' : undefined}
          onClick={handleSaveClick}
        >
          Save as meal
        </button>
        <button type="submit" className="btn btn--dark" disabled={!hasTags}>
          Log food
        </button>
      </div>

      {confirmingOverwrite && loaded && (
        <Dialog title={`Update “${loaded.name}”?`} onClose={() => setConfirmingOverwrite(false)}>
          <p className="dialog__body">
            This replaces the foods in your saved meal “{loaded.name}” with the ones above. You can keep the original
            and save these as a new meal instead.
          </p>
          <div className="dialog__actions">
            <button type="button" className="btn btn--dark" onClick={handleOverwrite}>
              Update “{loaded.name}”
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setConfirmingOverwrite(false);
                startSaving('');
              }}
            >
              Save as new meal
            </button>
            <button type="button" className="btn btn--small" onClick={() => setConfirmingOverwrite(false)}>
              Cancel
            </button>
          </div>
        </Dialog>
      )}
    </form>
  );
}
