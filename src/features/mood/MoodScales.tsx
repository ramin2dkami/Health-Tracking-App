import { ScalePicker } from '../../components/ScalePicker';

export interface MoodScores {
  moodScore: number;
  stressScore: number;
  energyScore: number;
}

export function MoodScales({ value, onChange }: { value: MoodScores; onChange: (value: MoodScores) => void }) {
  return (
    <>
      <ScalePicker
        label="Overall mood"
        value={value.moodScore}
        onChange={(moodScore) => onChange({ ...value, moodScore })}
        color="var(--lavender)"
        lowHint="Low"
        highHint="Great"
      />
      <ScalePicker
        label="Stress level"
        value={value.stressScore}
        onChange={(stressScore) => onChange({ ...value, stressScore })}
        color="var(--blue)"
        lowHint="Calm"
        highHint="Very stressed"
      />
      <ScalePicker
        label="Energy level"
        value={value.energyScore}
        onChange={(energyScore) => onChange({ ...value, energyScore })}
        color="var(--orange)"
        lowHint="Drained"
        highHint="Energized"
      />
    </>
  );
}
