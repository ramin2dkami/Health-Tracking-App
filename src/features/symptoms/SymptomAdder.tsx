import { useEffect, useId, useRef, useState } from 'react';
import { COMMON_SYMPTOMS, capitalize } from './commonSymptoms';

/** Search box with a dropdown of common symptoms not yet tracked, plus "Add" for anything typed. */
export function SymptomAdder({
  trackedNames,
  onAdd,
  autoFocus = false,
}: {
  trackedNames: string[];
  onAdd: (name: string) => Promise<void>;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const q = query.trim().toLowerCase();
  const tracked = new Set(trackedNames.map((n) => n.toLowerCase()));
  const options = COMMON_SYMPTOMS.filter((n) => !tracked.has(n.toLowerCase()) && (!q || n.toLowerCase().includes(q)));
  const exact = tracked.has(q) || COMMON_SYMPTOMS.some((n) => n.toLowerCase() === q);
  if (q && !exact) options.push(capitalize(query));
  const isCreate = (i: number) => q !== '' && !exact && i === options.length - 1;
  const activeIndex = Math.min(active, options.length - 1);

  async function choose(name: string) {
    await onAdd(name);
    setQuery('');
    setActive(0);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && options.length) {
      e.preventDefault();
      setOpen(true);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((activeIndex + step + options.length) % options.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const name = open ? options[activeIndex] : q ? capitalize(query) : undefined;
      if (name) choose(name);
    } else if (e.key === 'Escape' && open) {
      // Close the dropdown without the sheet's Escape handler also closing the sheet.
      e.nativeEvent.stopPropagation();
      setOpen(false);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  }

  const optionId = (i: number) => `${listId}-${i}`;

  return (
    <div ref={rootRef}>
      <input
        className="input"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options.length ? optionId(activeIndex) : undefined}
        aria-label="Add another symptom"
        placeholder="Add another symptom…"
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && options.length > 0 ? (
        // In the flow rather than floating, so the bottom sheet grows to fit it instead of clipping it.
        <ul className="combo__list" id={listId} role="listbox">
          {options.map((name, i) => (
            <li
              key={`${isCreate(i) ? 'create' : 'common'}-${name}`}
              id={optionId(i)}
              role="option"
              aria-selected={i === activeIndex}
              className={`combo__option ${i === activeIndex ? 'is-active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(name)}
            >
              {isCreate(i) ? `+ Add “${name}”` : name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
