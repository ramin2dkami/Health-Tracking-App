import { useState } from 'react';
import { addMoodLog } from '../../db/repository';
import { MoodScales, type MoodScores } from './MoodScales';

export function MoodQuickAdd({ onAdded }: { onAdded: () => void }) {
  const [scores, setScores] = useState<MoodScores>({ moodScore: 3, stressScore: 3, energyScore: 3 });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await addMoodLog(scores.moodScore, scores.stressScore, scores.energyScore);
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <MoodScales value={scores} onChange={setScores} />
      <button type="submit" className="btn btn--dark btn--block">
        Log mood
      </button>
    </form>
  );
}
