import { useEffect, useState } from 'react';
import {
  listSymptomDefinitions,
  listFoodTags,
  listSymptomLogsForDate,
  listFoodLogsForDate,
  listMoodLogsForDate,
} from '../../db/repository';
import { todayKey } from '../../db/dateKey';
import type { SymptomDefinition, FoodTag, SymptomLog, FoodLog, MoodLog } from '../../db/schema';
import { useDataVersion } from '../../data/DataVersion';
import { TodayEntryList } from './TodayEntryList';

export function TodayScreen({ onAdd }: { onAdd: () => void }) {
  const { version, bump } = useDataVersion();
  const [symptoms, setSymptoms] = useState<SymptomDefinition[]>([]);
  const [foodTags, setFoodTags] = useState<FoodTag[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);

  useEffect(() => {
    const dateKey = todayKey();
    Promise.all([
      listSymptomDefinitions(true),
      listFoodTags(),
      listSymptomLogsForDate(dateKey),
      listFoodLogsForDate(dateKey),
      listMoodLogsForDate(dateKey),
    ]).then(([s, f, sl, fl, ml]) => {
      setSymptoms(s);
      setFoodTags(f);
      setSymptomLogs(sl);
      setFoodLogs(fl);
      setMoodLogs(ml);
    });
  }, [version]);

  return (
    <div className="screen">
      <header className="page-head">
        <p className="page-head__eyebrow">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1>Today’s log</h1>
      </header>
      <TodayEntryList
        symptomLogs={symptomLogs}
        symptomsById={new Map(symptoms.map((s) => [s.id, s]))}
        foodLogs={foodLogs}
        foodTags={foodTags}
        foodTagsById={new Map(foodTags.map((t) => [t.id, t]))}
        moodLogs={moodLogs}
        onChanged={bump}
        onAdd={onAdd}
      />
    </div>
  );
}
