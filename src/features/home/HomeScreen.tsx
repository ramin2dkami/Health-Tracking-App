import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listSymptomLogsForDate,
  listMoodLogsForDate,
  listLoggedDateKeys,
  getProfile,
} from '../../db/repository';
import { todayKey, toDateKey } from '../../db/dateKey';
import type { SymptomLog, MoodLog } from '../../db/schema';
import { useDataVersion } from '../../data/DataVersion';
import { useWeatherFetch } from '../weather/useWeatherFetch';
import { describeWeatherCode } from '../weather/weatherCodes';
import { aggregateMaxSeverityByDay } from '../calendar/aggregateSeverity';
import { severityColor } from '../calendar/severityColors';
import { Blob } from '../../components/Blob';
import { computeDayScore } from './dayScore';
import { InsightsSection } from './InsightsSection';
import { LogNudge } from './LogNudge';
import type { AddMode } from '../add/addOptions';

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function lastSevenDays(): Date[] {
  const days: Date[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    days.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
  }
  return days;
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
  const navigate = useNavigate();
  const weather = useWeatherFetch();

  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [weekSeverity, setWeekSeverity] = useState<Map<string, number>>(new Map());
  const [name, setName] = useState('');
  const [loggedToday, setLoggedToday] = useState<boolean | null>(null);
  const [history, setHistory] = useState<{ streak: number; daysSinceLast: number | null }>({
    streak: 0,
    daysSinceLast: null,
  });

  const week = lastSevenDays();

  useEffect(() => {
    const now = new Date();
    const key = toDateKey(now);
    const days = lastSevenDays();
    Promise.all([
      listSymptomLogsForDate(key),
      listMoodLogsForDate(key),
      aggregateMaxSeverityByDay(toDateKey(days[0]), toDateKey(days[6])),
      getProfile(),
      listLoggedDateKeys(toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - HISTORY_DAYS)), key),
    ]).then(([sl, ml, ws, profile, logged]) => {
      setSymptomLogs(sl);
      setMoodLogs(ml);
      setWeekSeverity(ws);
      setName(profile?.name ?? '');
      setLoggedToday(logged.has(key));
      setHistory(loggingHistory(logged, now));
    });
  }, [version]);

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
          {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
        {weather.status === 'ready' && weather.weather && weatherInfo ? (
          <span className="pill">
            {weatherInfo.icon} {Math.round(weather.weather.tempC)}°
          </span>
        ) : null}
      </header>

      <section className="home__hero">
        <p className="home__greeting">{greeting(now.getHours())}
          {name ? `, ${name}` : ''}, how are you feeling today?</p>
        <div className="score">
          <span className={`score__value ${score === null ? 'score__value--empty' : ''}`}>
            {score === null ? '0.0' : score.toFixed(1)}
          </span>
          <Blob shape="star" color="var(--pink)" size={30} rotate={12} className="score__spark" />
        </div>
        <p className="score__caption">
          {score === null ? 'Log a symptom or your mood to see today’s score' : 'your day score, out of 10'}
        </p>
      </section>

      {loggedToday === false ? (
        <LogNudge streak={history.streak} daysSinceLast={history.daysSinceLast} onAdd={onAdd} />
      ) : null}

      <section className="section">
        <div className="section__head">
          <h2>Your week</h2>
        </div>
        <div className="week">
          {week.map((d) => {
            const key = toDateKey(d);
            const sev = weekSeverity.get(key);
            const isToday = key === todayKey();
            return (
              <button
                key={key}
                type="button"
                className={`week__day ${isToday ? 'is-today' : ''}`}
                onClick={() => navigate('/calendar')}
                aria-label={`${d.toLocaleDateString(undefined, { weekday: 'long' })}: ${sev ? `worst symptom ${sev} of 5` : 'no symptoms logged'}`}
              >
                <span className="week__label">{d.toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
                <span className="week__dot" style={{ background: severityColor(sev) }}>
                  {d.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <InsightsSection />
    </div>
  );
}
