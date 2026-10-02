import type { FoodTag } from '../../db/schema';

const MAX_SUGGESTIONS = 8;

/** Chip input for food tags plus quick-pick suggestions. The parent owns both the chips and the typed text. */
export function FoodTagInput({
  tags,
  onTagsChange,
  input,
  onInputChange,
  foodTags,
}: {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  input: string;
  onInputChange: (input: string) => void;
  foodTags: FoodTag[];
}) {
  const query = input.trim().toLowerCase();
  // Typing moves matches to the front but never empties the row.
  const available = foodTags.filter((t) => !tags.includes(t.name));
  const matches = query ? available.filter((t) => t.name.includes(query)) : [];
  const suggestions = [...matches, ...available.filter((t) => !matches.includes(t))].slice(0, MAX_SUGGESTIONS);

  function addTag(name: string) {
    const clean = name.trim().toLowerCase();
    if (!clean || tags.includes(clean)) return;
    onTagsChange([...tags, clean]);
    onInputChange('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    }
  }

  return (
    <div>
      <span className="field-label">What did you eat?</span>
      <div className="tag-input">
        {tags.map((t) => (
          <span key={t} className="chip is-selected chip--small">
            {t}
            <button
              type="button"
              className="chip__remove"
              onClick={() => onTagsChange(tags.filter((x) => x !== t))}
              aria-label={`Remove ${t}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length ? 'Add more…' : 'Type an ingredient…'}
        />
        <button type="button" className="btn btn--pink btn--small" disabled={!query} onClick={() => addTag(input)}>
          Add
        </button>
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
  );
}
