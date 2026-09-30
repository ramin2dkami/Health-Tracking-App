export function ScalePicker({
  label,
  value,
  onChange,
  color,
  lowHint,
  highHint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  color: string;
  lowHint: string;
  highHint: string;
}) {
  return (
    <fieldset className="scale">
      <legend className="field-label">{label}</legend>
      <div className="scale__options">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`scale__option ${value === n ? 'is-selected' : ''}`}
            style={value === n ? { background: color } : undefined}
            aria-pressed={value === n}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="scale__hints">
        <span>{lowHint}</span>
        <span>{highHint}</span>
      </div>
    </fieldset>
  );
}
