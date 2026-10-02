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
  const [templates, setTemplates] = useState(initialTemplates);
  const [tagNamesById, setTagNamesById] = useState(() => new Map(foodTags.map((t) => [t.id, t.name])));
  const [savingName, setSavingName] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState('');
  // The one selected saved meal; edits to its foods can overwrite it.
  const [loadedId, setLoadedId] = useState<number | null>(null);
  // Foods the selected meal added, so swapping meals doesn't remove foods entered separately.
  const [mealAdded, setMealAdded] = useState<string[]>([]);
  const [confirmingOverwrite, setConfirmingOverwrite] = useState(false);
  const [nameError, setNameError] = useState('');

  const allTags = () => withTypedTag(pendingTags, input);

  function templateTagNames(template: MealTemplate) {
    return template.tagIds.map((id) => tagNamesById.get(id)).filter((n): n is string => !!n);
  }

  // Only one saved meal at a time: picking another swaps out the previous meal's foods (typed extras stay),
  // and tapping the selected meal again removes it.
  function selectTemplate(template: MealTemplate) {
    const kept = pendingTags.filter((n) => !mealAdded.includes(n));
    if (template.id === loadedId) {
      setPendingTags(kept);
      setLoadedId(null);
      setMealAdded([]);
    } else {
      const added = templateTagNames(template).filter((n) => !kept.includes(n));
      setPendingTags([...kept, ...added]);
      setLoadedId(template.id);
      setMealAdded(added);
    }
    setSavedMessage('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tags = allTags();
    if (tags.length === 0) return;
    const tagIds = await Promise.all(tags.map((name) => findOrCreateFoodTag(name)));
    // Logged under the name of the selected saved meal, if any.
    await addFoodLog(tagIds, loaded?.name);
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
    setMealAdded([]);
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
    else startSaving('');
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
      <FoodTagInput
        tags={pendingTags}
        onTagsChange={setPendingTags}
        input={input}
        onInputChange={setInput}
        foodTags={foodTags}
      />
      {templates.length > 0 && (
        <div>
          <span className="field-label">Or pick a saved meal</span>
          <div className="chips" role="group" aria-label="Saved meals">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`chip chip--meal ${t.id === loadedId ? 'is-selected' : ''}`}
                aria-pressed={t.id === loadedId}
                onClick={() => selectTemplate(t)}
                title={templateTagNames(t).join(' · ')}
              >
                {t.name}
              </button>
            ))}
          </div>
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
        <button type="submit" className="btn btn--pink" disabled={!hasTags}>
          Log food
        </button>
      </div>

      {savingName !== null && (
        <Dialog title="Save as a meal" onClose={() => setSavingName(null)}>
          <p className="dialog__body">{allTags().join(' · ')}</p>
          <input
            className="input dialog__input"
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
            aria-label="Meal name"
            autoFocus
          />
          {nameError && (
            <p className="field-error" role="alert">
              {nameError}
            </p>
          )}
          <div className="dialog__actions">
            <button type="button" className="btn btn--dark" onClick={handleSaveTemplate} disabled={!savingName.trim()}>
              Save meal
            </button>
            <button type="button" className="btn btn--small" onClick={() => setSavingName(null)}>
              Cancel
            </button>
          </div>
        </Dialog>
      )}

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
