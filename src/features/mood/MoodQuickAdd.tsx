import { useState } from 'react';
import { addMoodLog } from '../../db/repository';
import { ScalePicker } from '../../components/ScalePicker';

export function MoodQuickAdd({ onAdded }: { onAdded: () => void }) {
  const [moodScore, setMoodScore] = useState(3);
  const [stressScore, setStressScore] = useState(3);
  const [anxietyScore, setAnxietyScore] = useState(3);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await addMoodLog(moodScore, stressScore, anxietyScore);
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
        label="Anxiety"
        value={anxietyScore}
        onChange={setAnxietyScore}
        color="var(--orange)"
        lowHint="Relaxed"
        highHint="Very anxious"
      />
      <button type="submit" className="btn btn--dark btn--block">
        Log mood
      </button>
    </form>
  );
}
