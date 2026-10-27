/** WMO weather codes (Open-Meteo) as a word and a mood for the background, as SundarTV's sky does. */
export type Mood = 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog' | 'night';

export function describeWeather(code: number): { text: string; mood: Exclude<Mood, 'night'> } {
  if (code === 0) return { text: 'Clear', mood: 'clear' };
  if (code <= 2) return { text: 'Partly cloudy', mood: 'clear' };
  if (code === 3) return { text: 'Cloudy', mood: 'cloudy' };
  if (code === 45 || code === 48) return { text: 'Fog', mood: 'fog' };
  if (code >= 51 && code <= 57) return { text: 'Drizzle', mood: 'rain' };
  if (code >= 61 && code <= 67) return { text: 'Rain', mood: 'rain' };
  if (code >= 71 && code <= 77) return { text: 'Snow', mood: 'snow' };
  if (code >= 80 && code <= 82) return { text: 'Showers', mood: 'rain' };
  if (code === 85 || code === 86) return { text: 'Snow showers', mood: 'snow' };
  if (code >= 95) return { text: 'Thunderstorm', mood: 'storm' };
  return { text: 'Weather', mood: 'cloudy' };
}

export function moodFor(code: number | null, isDay: boolean | null, hour: number): Mood {
  const day = isDay ?? (hour >= 6 && hour < 19);
  if (!day) return 'night';
  return code === null ? 'clear' : describeWeather(code).mood;
}

export function greeting(hour: number): string {
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
