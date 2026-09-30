import { useState } from 'react';
import type { FoodTag, MealTemplate } from '../../db/schema';
import { saveMealTemplate, deleteMealTemplate } from '../../db/repository';

export function MealTemplateManager({
  templates,
  foodTags,
  onChanged,
}: {
  templates: MealTemplate[];
  foodTags: FoodTag[];
  onChanged: () => void;
}) {
  const [name, setName] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  function toggleTag(id: number) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || selectedTagIds.length === 0) return;
    await saveMealTemplate(name, selectedTagIds);
    setName('');
    setSelectedTagIds([]);
    onChanged();
  }

  async function handleDelete(id: number) {
    await deleteMealTemplate(id);
    onChanged();
  }

  const foodTagsById = new Map(foodTags.map((t) => [t.id, t]));

  return (
    <div>
      <ul className="rows">
        {templates.map((t) => (
          <li key={t.id} className="row">
            <span className="row__label">
              <strong>{t.name}</strong>
              <span className="row__sub">{t.tagIds.map((id) => foodTagsById.get(id)?.name ?? '?').join(' · ')}</span>
            </span>
            <button type="button" className="btn btn--small" onClick={() => handleDelete(t.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="form form--nested">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name, e.g. Usual breakfast"
          aria-label="Saved meal name"
        />
        {foodTags.length === 0 ? (
          <p className="muted">Log some food first — its ingredients become tags you can build a saved meal from.</p>
        ) : (
          <div className="chips" role="group" aria-label="Ingredients">
            {foodTags.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`chip chip--small ${selectedTagIds.includes(t.id) ? 'is-selected' : ''}`}
                aria-pressed={selectedTagIds.includes(t.id)}
                onClick={() => toggleTag(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
        <button
          type="submit"
          className="btn btn--dark btn--block"
          disabled={!name.trim() || selectedTagIds.length === 0}
        >
          Save meal
        </button>
      </form>
    </div>
  );
}
