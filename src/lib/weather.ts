import { WeatherData } from '@/types';

// Jersey City coordinates
const JC_LAT = 40.7282;
const JC_LNG = -74.0776;

export async function getJCWeather(): Promise<WeatherData | null> {
  const apiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${JC_LAT}&lon=${JC_LNG}&appid=${apiKey}&units=imperial`
    );
    if (!res.ok) return null;
    const data = await res.json();

    const temp = Math.round(data.main.temp);
    const description: string = data.weather[0].description;
    const icon: string = data.weather[0].icon;
    const humidity: number = data.main.humidity;
    const windSpeed: number = Math.round(data.wind.speed);
    const weatherId: number = data.weather[0].id;

    // Good for ball: temp > 45°F and not rain/snow/storm
    const isBadWeather = weatherId < 800 && weatherId !== 800;
    const isGoodForBball = temp > 45 && !isBadWeather;

    return { temp, description, icon, humidity, windSpeed, isGoodForBball };
  } catch {
    return null;
  }
}

export function getWeatherIconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}
