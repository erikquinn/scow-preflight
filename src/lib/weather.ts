export interface ForecastPeriod {
  startTime: string;
  endTime: string;
  windSpeed: number;
  windGust: number;
  temperature: number;
  temperatureUnit: string;
  apparentTemperature: number;
  probabilityOfPrecipitation: number;
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
    const obsRes = await fetch('https://api.weather.gov/stations/KDCA/observations?limit=3', options); // limit 3 for current + past 2hrs
    if (!obsRes.ok) throw new Error('Failed to fetch NWS observations');
    const obsData = await obsRes.json();
    const latestObs = obsData.features[0]?.properties;
    const pastObs = obsData.features.slice(1).map((f: any) => ({ // Skipping the latest
      time: f.properties.timestamp,
      windSpeed: mphToKnots(f.properties.windSpeed.value * 0.621371), // NWS uses km/h, convert to mph, then to knots
      windDirection: f.properties.windDirection.value,
    })).reverse(); // Reverse to get chronological order

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

    const processedForecast: ForecastPeriod[] = forecastPeriods.slice(0, 8).map((period: any) => {
      const windSpeedMph = parseFloat(period.windSpeed.split(' ')[0]);
      const windGustMph = period.windGust ? parseFloat(period.windGust.split(' ')[0]) : 0; // windGust might be missing
      const tempF = period.temperature;
      const tempC = (tempF - 32) * 5/9; // Convert forecast temp from F to C

      // NWS hourly forecast has 'temperature', but not explicitly 'apparentTemperature' or 'feelsLike'.
      // Using temperature as apparent temperature for now.
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
      };
    });
    
    const maxForecastWind = Math.max(...processedForecast.map(p => Math.max(p.windSpeed, p.windGust)));

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
