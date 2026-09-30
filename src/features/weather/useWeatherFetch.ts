import { useCallback, useEffect, useState } from 'react';
import { getWeatherLogForDate, upsertWeatherLog } from '../../db/repository';
import { todayKey } from '../../db/dateKey';
import type { WeatherLog } from '../../db/schema';

type WeatherStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'error';

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    pressure_msl: number;
    weather_code: number;
  };
}

async function fetchWeatherForCoords(lat: number, lon: number): Promise<Omit<WeatherLog, 'id'>> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,pressure_msl,weather_code&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo request failed: ${res.status}`);
  const data: OpenMeteoResponse = await res.json();
  return {
    dateKey: todayKey(),
    fetchedAt: new Date().toISOString(),
    lat,
    lon,
    tempC: data.current.temperature_2m,
    pressureHPa: data.current.pressure_msl,
    precipitationMm: data.current.precipitation,
    weatherCode: data.current.weather_code,
    humidity: data.current.relative_humidity_2m,
  };
}

export function useWeatherFetch() {
  const [status, setStatus] = useState<WeatherStatus>('idle');
  const [weather, setWeather] = useState<WeatherLog | undefined>(undefined);

  const fetchAndStore = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const entry = await fetchWeatherForCoords(
            position.coords.latitude,
            position.coords.longitude,
          );
          await upsertWeatherLog(entry);
          const stored = await getWeatherLogForDate(todayKey());
          setWeather(stored);
          setStatus('ready');
        } catch {
          setStatus('error');
        }
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 3600000 },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = await getWeatherLogForDate(todayKey());
      if (cancelled) return;
      if (existing) {
        setWeather(existing);
        setStatus('ready');
      } else {
        fetchAndStore();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchAndStore]);

  return { status, weather, retry: fetchAndStore };
}
