import { useEffect, useState } from 'react';
import {
  listSymptomLogsForDate,
  listMoodLogsForDate,
  listLoggedDateKeys,
  getProfile,
} from '../../db/repository';
import { startOfWeek, todayKey, toDateKey } from '../../db/dateKey';
import type { SymptomLog, MoodLog } from '../../db/schema';
import { useDataVersion } from '../../data/DataVersion';
import { useWeatherFetch } from '../weather/useWeatherFetch';
import { describeWeatherCode } from '../weather/weatherCodes';
import { Blob } from '../../components/Blob';
import { computeDayScore } from './dayScore';
import { InsightsSection } from './InsightsSection';
import { LogNudge } from './LogNudge';
import { WeekStrip } from '../../components/WeekStrip';
import type { AddMode } from '../add/addOptions';

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Monday to Sunday of the current week. */
function currentWeek(): Date[] {
  const monday = startOfWeek();
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}

// How far back to look for the streak and the last entry.
const HISTORY_DAYS = 365;

/** Consecutive days with entries, ending yesterday, and days since the most recent entry before today. */
function loggingHistory(logged: Set<string>, today: Date): { streak: number; daysSinceLast: number | null } {
  let streak = 0;
  let daysSinceLast: number | null = null;
  for (let i = 1; i <= HISTORY_DAYS; i++) {
    const key = toDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));
    if (logged.has(key)) {
      daysSinceLast ??= i;
      if (streak === i - 1) streak = i;
    } else if (daysSinceLast !== null) {
      break;
    }
  }
  return { streak, daysSinceLast };
}

export function HomeScreen({ onAdd }: { onAdd: (mode: AddMode) => void }) {
  const { version } = useDataVersion();
  const weather = useWeatherFetch();

  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [name, setName] = useState('');
  const [loggedToday, setLoggedToday] = useState<boolean | null>(null);
  const [history, setHistory] = useState<{ streak: number; daysSinceLast: number | null }>({
    streak: 0,
    daysSinceLast: null,
  });

  const week = currentWeek();
  // The day the hero shows; tapping a day in the week strip switches it.
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const isViewingToday = selectedKey === todayKey();
  const selectedDate = week.find((d) => toDateKey(d) === selectedKey) ?? new Date();

  useEffect(() => {
    const now = new Date();
    const key = toDateKey(now);
    Promise.all([
      getProfile(),
      listLoggedDateKeys(toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - HISTORY_DAYS)), key),
    ]).then(([profile, logged]) => {
      setName(profile?.name ?? '');
      setLoggedToday(logged.has(key));
      setHistory(loggingHistory(logged, now));
    });
  }, [version]);

  useEffect(() => {
    Promise.all([listSymptomLogsForDate(selectedKey), listMoodLogsForDate(selectedKey)]).then(([sl, ml]) => {
      setSymptomLogs(sl);
      setMoodLogs(ml);
    });
  }, [version, selectedKey]);

  const worst = symptomLogs.reduce<SymptomLog | undefined>(
    (acc, l) => (!acc || l.severity > acc.severity ? l : acc),
    undefined,
  );
  const latestMood = moodLogs[moodLogs.length - 1];
  const score = computeDayScore({
    maxSeverity: worst?.severity,
    mood: latestMood?.moodScore,
    stress: latestMood?.stressScore,
  });

  const now = new Date();
  const weatherInfo = weather.weather ? describeWeatherCode(weather.weather.weatherCode) : null;

  return (
    <div className="screen home">
      <header className="home__top">
        <span className="home__date">
          {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
        {isViewingToday && weather.status === 'ready' && weather.weather && weatherInfo ? (
          <span className="pill">
            {weatherInfo.icon} {Math.round(weather.weather.tempC)}°
          </span>
        ) : null}
      </header>

      <section className="home__hero">
        <p className="home__greeting">
          {isViewingToday
            ? `${greeting(now.getHours())}${name ? `, ${name}` : ''}, how are you feeling today?`
            : `How your ${selectedDate.toLocaleDateString(undefined, { weekday: 'long' })} went`}
        </p>
        <div className="score">
          <span className={`score__value ${score === null ? 'score__value--empty' : ''}`}>
            {score === null ? '0.0' : score.toFixed(1)}
          </span>
          <Blob shape="star" color="var(--pink)" size={30} rotate={12} className="score__spark" />
        </div>
        <p className="score__caption">
          {score !== null
            ? 'your day score, out of 10'
            : isViewingToday
              ? 'Log a symptom or your mood to see today’s score'
              : 'No symptoms or mood logged this day'}
        </p>
        {!isViewingToday ? (
          <button type="button" className="btn btn--small home__back" onClick={() => setSelectedKey(todayKey())}>
            Back to today
          </button>
        ) : null}
      </section>

      {isViewingToday && loggedToday === false ? (
        <LogNudge streak={history.streak} daysSinceLast={history.daysSinceLast} onAdd={onAdd} />
      ) : null}

      <section className="section">
        <div className="section__head">
          <h2>Your week</h2>
        </div>
        <WeekStrip week={week} selectedKey={selectedKey} onSelect={setSelectedKey} />
      </section>

      <InsightsSection />
    </div>
  );
}
