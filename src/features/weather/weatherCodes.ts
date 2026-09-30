// Subset of WMO weather codes used by Open-Meteo, mapped to a label + emoji icon.
const WEATHER_CODE_MAP: Record<number, { label: string; icon: string }> = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Fog', icon: '🌫️' },
  48: { label: 'Fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Drizzle', icon: '🌦️' },
  55: { label: 'Dense drizzle', icon: '🌦️' },
  61: { label: 'Light rain', icon: '🌧️' },
  63: { label: 'Rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  71: { label: 'Light snow', icon: '🌨️' },
  73: { label: 'Snow', icon: '🌨️' },
  75: { label: 'Heavy snow', icon: '🌨️' },
  80: { label: 'Rain showers', icon: '🌦️' },
  81: { label: 'Rain showers', icon: '🌦️' },
  82: { label: 'Violent showers', icon: '⛈️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm w/ hail', icon: '⛈️' },
  99: { label: 'Thunderstorm w/ hail', icon: '⛈️' },
};

export function describeWeatherCode(code: number): { label: string; icon: string } {
  return WEATHER_CODE_MAP[code] ?? { label: 'Unknown', icon: '🌡️' };
}
