export interface ForecastPeriod {
  startTime: string;
  endTime: string;
  windSpeed: number;
  windGust: number;
  temperature: number;
  temperatureUnit: string;
  apparentTemperature: number;
  probabilityOfPrecipitation: number;
  isDaytime: boolean;
}

export interface WeatherData {
  retrievedAt: string; // When this data was retrieved from NWS
  observationTime: string; // When the latest observation was taken
  forecastGeneratedAt: string; // When the forecast was generated

  currentWindSpeed: number | null; // in knots
  currentWindDirection: number | null; // in degrees
  currentTemperatureC: number | null; // in Celsius
  currentTemperatureF: number | null; // in Fahrenheit
  currentApparentTemperatureC: number | null;
  currentApparentTemperatureF: number | null;

  pastObservations: Array<{
    time: string;
    windSpeed: number; // knots
    windDirection: number;
    relativeLabel: string;
    isDaytime: boolean;
  }>

  forecast: ForecastPeriod[];
  maxForecastWind: number; // Max of (windSpeed, windGust) in knots over the forecast period
}

// Helper to convert MPH to Knots, rounded for conservatism
const mphToKnots = (mph: number) => Math.ceil(mph * 0.868976);
const cToF = (c: number) => (c * 9/5) + 32;

export async function getWeatherData(): Promise<WeatherData | null> {
  try {
    const userAgent = 'scow-preflight (app@example.com)';
    const options = { headers: { 'User-Agent': userAgent }, next: { revalidate: 300 } };

    // 1. Fetch current and past observations
    const obsRes = await fetch('https://api.weather.gov/stations/KDCA/observations?limit=12', options); // limit 12 to safely go back 2 hours even with SPECI reports
    if (!obsRes.ok) throw new Error('Failed to fetch NWS observations');
    const obsData = await obsRes.json();
    const features = obsData.features || [];
    const latestObs = features[0]?.properties;

    const pastObs: Array<{ time: string; windSpeed: number; windDirection: number; relativeLabel: string; isDaytime: boolean }> = [];
    if (latestObs) {
      const latestTime = new Date(latestObs.timestamp).getTime();

      const getClosestObs = (targetTimeMs: number) => {
        let closest = null;
        let minDiff = Infinity;
        for (let i = 1; i < features.length; i++) {
          const obs = features[i].properties;
          const time = new Date(obs.timestamp).getTime();
          const diff = Math.abs(time - targetTimeMs);
          if (diff < minDiff) {
            minDiff = diff;
            closest = obs;
          }
        }
        return closest;
      };

      const obsMinus1 = getClosestObs(latestTime - 3600 * 1000);
      const obsMinus2 = getClosestObs(latestTime - 2 * 3600 * 1000);

      // Add -2H observation if valid and distinct from -1H
      if (obsMinus2 && obsMinus2.timestamp !== obsMinus1?.timestamp && obsMinus2.timestamp !== latestObs.timestamp) {
        pastObs.push({
          time: obsMinus2.timestamp,
          windSpeed: mphToKnots((obsMinus2.windSpeed?.value || 0) * 0.621371),
          windDirection: obsMinus2.windDirection?.value || 0,
          relativeLabel: '-2H',
          isDaytime: !!obsMinus2.icon?.includes('/day/'), // Heuristic for observations
        });
      }

      // Add -1H observation
      if (obsMinus1 && obsMinus1.timestamp !== latestObs.timestamp) {
        pastObs.push({
          time: obsMinus1.timestamp,
          windSpeed: mphToKnots((obsMinus1.windSpeed?.value || 0) * 0.621371),
          windDirection: obsMinus1.windDirection?.value || 0,
          relativeLabel: '-1H',
          isDaytime: !!obsMinus1.icon?.includes('/day/'),
        });
      }
    }

    // 2. Get forecast hourly endpoint URL
    const pointsRes = await fetch('https://api.weather.gov/points/38.852,-77.037', options);
    if (!pointsRes.ok) throw new Error('Failed to fetch NWS gridpoints');
    const pointsData = await pointsRes.json();
    const forecastHourlyUrl = pointsData.properties.forecastHourly;

    // 3. Fetch hourly forecast
    const forecastRes = await fetch(forecastHourlyUrl, options);
    if (!forecastRes.ok) throw new Error('Failed to fetch NWS hourly forecast');
    const forecastData = await forecastRes.json();
    const forecastPeriods = forecastData.properties.periods;

    // Filter and process forecast periods
    // We want to find periods starting from 1 hour before now
    const nowMs = new Date().getTime();

    const processedForecast: ForecastPeriod[] = forecastPeriods.map((period: any) => {
      const windSpeedMph = parseFloat(period.windSpeed.split(' ')[0]);
      const windGustMph = period.windGust ? parseFloat(period.windGust.split(' ')[0]) : 0; // windGust might be missing
      const tempF = period.temperature;
      const tempC = (tempF - 32) * 5/9; // Convert forecast temp from F to C
      const apparentTempF = period.temperature;
      const apparentTempC = (apparentTempF - 32) * 5/9;

      return {
        startTime: period.startTime,
        endTime: period.endTime,
        windSpeed: mphToKnots(windSpeedMph),
        windGust: mphToKnots(windGustMph),
        temperature: tempC,
        temperatureUnit: 'C',
        apparentTemperature: apparentTempC,
        probabilityOfPrecipitation: period.probabilityOfPrecipitation?.value ?? 0,
        isDaytime: period.isDaytime,
      };
    });

    // We'll return the full list and let the component decide which ones to show (-1H, Now, etc.)
    const maxForecastWind = Math.max(...processedForecast.slice(0, 10).map(p => Math.max(p.windSpeed, p.windGust)));

    return {
      retrievedAt: new Date().toISOString(),
      observationTime: latestObs?.timestamp || '',
      forecastGeneratedAt: forecastData.properties.generatedAt || forecastData.properties.updated || '',

      currentWindSpeed: latestObs ? mphToKnots(latestObs.windSpeed.value * 0.621371) : null,
      currentWindDirection: latestObs?.windDirection.value ?? null,
      currentTemperatureC: latestObs?.temperature.value ?? null,
      currentTemperatureF: latestObs?.temperature.value ? cToF(latestObs.temperature.value) : null,
      currentApparentTemperatureC: latestObs?.apparentTemperature?.value ?? latestObs?.temperature.value ?? null,
      currentApparentTemperatureF: latestObs?.apparentTemperature?.value ? cToF(latestObs.apparentTemperature.value) : (latestObs?.temperature.value ? cToF(latestObs.temperature.value) : null),

      pastObservations: pastObs,
      forecast: processedForecast,
      maxForecastWind: maxForecastWind,
    };
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return null;
  }
}
