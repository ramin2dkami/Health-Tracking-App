import { useState } from 'react';
import { addMoodLog } from '../../db/repository';
import { ScalePicker } from '../../components/ScalePicker';

export function MoodQuickAdd({ onAdded }: { onAdded: () => void }) {
  const [moodScore, setMoodScore] = useState(3);
  const [stressScore, setStressScore] = useState(3);
  const [energyScore, setEnergyScore] = useState(3);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await addMoodLog(moodScore, stressScore, energyScore);
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <ScalePicker
        label="Overall mood"
        value={moodScore}
        onChange={setMoodScore}
        color="var(--lavender)"
        lowHint="Low"
        highHint="Great"
      />
      <ScalePicker
        label="Stress level"
        value={stressScore}
        onChange={setStressScore}
        color="var(--blue)"
        lowHint="Calm"
        highHint="Very stressed"
      />
      <ScalePicker
        label="Energy level"
        value={energyScore}
        onChange={setEnergyScore}
        color="var(--orange)"
        lowHint="Drained"
        highHint="Energized"
      />
      <button type="submit" className="btn btn--dark btn--block">
        Log mood
      </button>
    </form>
  );
}
