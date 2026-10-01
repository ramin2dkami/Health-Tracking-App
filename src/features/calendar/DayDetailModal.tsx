import { useEffect, useState, type ReactNode } from 'react';
import { Sheet } from '../../components/Sheet';
import { Icon, type IconName } from '../../components/Icon';
import {
  listSymptomLogsForDate,
  listFoodLogsForDate,
  listMoodLogsForDate,
  getWeatherLogForDate,
  listSymptomDefinitions,
  listFoodTags,
} from '../../db/repository';
import type { SymptomLog, FoodLog, MoodLog, WeatherLog, SymptomDefinition, FoodTag } from '../../db/schema';
import { describeWeatherCode } from '../weather/weatherCodes';

export function DayDetailModal({ dateKey, onClose }: { dateKey: string; onClose: () => void }) {
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [weather, setWeather] = useState<WeatherLog | undefined>();
  const [symptoms, setSymptoms] = useState<SymptomDefinition[]>([]);
  const [foodTags, setFoodTags] = useState<FoodTag[]>([]);

  useEffect(() => {
    (async () => {
      const [sl, fl, ml, w, s, f] = await Promise.all([
        listSymptomLogsForDate(dateKey),
        listFoodLogsForDate(dateKey),
        listMoodLogsForDate(dateKey),
        getWeatherLogForDate(dateKey),
        listSymptomDefinitions(true),
        listFoodTags(),
      ]);
      setSymptomLogs(sl);
      setFoodLogs(fl);
      setMoodLogs(ml);
      setWeather(w);
      setSymptoms(s);
      setFoodTags(f);
    })();
  }, [dateKey]);

  const symptomsById = new Map(symptoms.map((s) => [s.id, s]));
  const foodTagsById = new Map(foodTags.map((t) => [t.id, t]));

  const [y, m, d] = dateKey.split('-').map(Number);
  const title = new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const weatherInfo = weather ? describeWeatherCode(weather.weatherCode) : null;

  return (
    <Sheet title={title} onClose={onClose}>
      {weather && weatherInfo && (
        <p className="pill pill--block">
          {weatherInfo.icon} {Math.round(weather.tempC)}°C · {weatherInfo.label}
          {weather.humidity !== undefined ? ` · ${weather.humidity}% humidity` : ''}
        </p>
      )}

      <DetailGroup title="Symptoms" icon="bolt" color="var(--pink)" empty={symptomLogs.length === 0}>
        {symptomLogs.map((l) => (
          <li key={l.id}>
            <span className="color-dot" style={{ background: symptomsById.get(l.symptomId)?.color }} />{' '}
            {symptomsById.get(l.symptomId)?.name ?? 'Unknown'} <strong>{l.severity}/5</strong>
          </li>
        ))}
      </DetailGroup>

      <DetailGroup title="Food" icon="food" color="var(--yellow)" empty={foodLogs.length === 0}>
        {foodLogs.map((l) => (
          <li key={l.id}>
            {l.mealLabel ? <strong>{l.mealLabel}: </strong> : null}
            {l.tagIds.map((id) => foodTagsById.get(id)?.name ?? '?').join(' · ')}
          </li>
        ))}
      </DetailGroup>

      <DetailGroup title="Mood & stress" icon="smile" color="var(--lavender)" empty={moodLogs.length === 0}>
        {moodLogs.map((l) => (
          <li key={l.id}>
            Overall mood <strong>{l.moodScore}/5</strong>
            {l.stressScore ? (
              <>
                {' '}
                · Stress <strong>{l.stressScore}/5</strong>
              </>
            ) : null}
            {l.energyScore ? (
              <>
                {' '}
                · Energy <strong>{l.energyScore}/5</strong>
              </>
            ) : null}
          </li>
        ))}
      </DetailGroup>
    </Sheet>
  );
}

function DetailGroup({
  title,
  icon,
  color,
  empty,
  children,
}: {
  title: string;
  icon: IconName;
  color: string;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <section className="detail-group">
      <h3>
        <span className="entry__icon entry__icon--small" style={{ background: color }}>
          <Icon name={icon} size={14} />
        </span>
        {title}
      </h3>
      {empty ? <p className="muted">Nothing logged.</p> : <ul>{children}</ul>}
    </section>
  );
}
