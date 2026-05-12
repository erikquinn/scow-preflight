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
  currentFeelsLikeC: number | null;
  currentFeelsLikeF: number | null;

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
// km/h -> knots (1 kt = 1.852 km/h exactly). Always round UP so any rounding
// error fails toward "windier than reality" -- never display a wind lower
// than the true value (safety: high winds are unsafe for sailing).
const kmhToKnots = (kmh: number) => Math.ceil(kmh / 1.852);
const cToF = (c: number) => (c * 9/5) + 32;

// Parse an ISO 8601 duration like "PT1H", "PT3H", "P1DT6H" into milliseconds.
// Supports day and hour components, which is sufficient for NWS grid validTime.
const parseIsoDurationMs = (dur: string): number => {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(dur);
  if (!match) return 60 * 60 * 1000; // fall back to 1h
  const days = parseInt(match[1] || '0', 10);
  const hours = parseInt(match[2] || '0', 10);
  const minutes = parseInt(match[3] || '0', 10);
  return ((days * 24 + hours) * 60 + minutes) * 60 * 1000;
};

interface GridSeriesPoint { startMs: number; endMs: number; value: number }

// Expand a NWS grid data property (e.g. windSpeed) into a flat list of
// {start,end,value} ranges in ms.
const expandGridSeries = (prop: { values?: Array<{ validTime: string; value: number | null }> } | undefined): GridSeriesPoint[] => {
  if (!prop?.values) return [];
  const out: GridSeriesPoint[] = [];
  for (const v of prop.values) {
    if (v.value === null || v.value === undefined) continue;
    const [iso, dur] = v.validTime.split('/');
    const startMs = new Date(iso).getTime();
    const endMs = startMs + parseIsoDurationMs(dur || 'PT1H');
    out.push({ startMs, endMs, value: v.value });
  }
  return out;
};

// Find the value covering a given instant (start of an hourly bucket).
const sampleSeries = (series: GridSeriesPoint[], atMs: number): number | null => {
  for (const p of series) {
    if (atMs >= p.startMs && atMs < p.endMs) return p.value;
  }
  return null;
};

// Blended feels-like temperature using NWS formulas where valid, Steadman AT elsewhere.
// Inputs: tempC (°C), windSpeedKph (km/h from NWS obs), relHumidity (0-100).
function computeFeelsLike(tempC: number, windSpeedKph: number, relHumidity: number): number {
  const tempF = tempC * 9 / 5 + 32;
  const windMph = windSpeedKph * 0.621371;
  const windMs = windSpeedKph / 3.6;

  // NWS Wind Chill: valid when T ≤ 50°F and wind > 3 mph
  if (tempF <= 50 && windMph > 3) {
    const v016 = Math.pow(windMph, 0.16);
    const wc = 35.74 + 0.6215 * tempF - 35.75 * v016 + 0.4275 * tempF * v016;
    return (wc - 32) * 5 / 9;
  }

  // NWS Heat Index (Rothfusz): valid when T ≥ 80°F and RH ≥ 40%
  if (tempF >= 80 && relHumidity >= 40) {
    const T = tempF;
    const R = relHumidity;
    let hi = -42.379
      + 2.04901523 * T
      + 10.14333127 * R
      - 0.22475541 * T * R
      - 0.00683783 * T * T
      - 0.05481717 * R * R
      + 0.00122874 * T * T * R
      + 0.00085282 * T * R * R
      - 0.00000199 * T * T * R * R;
    // NWS adjustment 1: low RH at high temp
    if (R < 13 && T >= 80 && T <= 112)
      hi -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    // NWS adjustment 2: high RH in lower heat index range
    if (R > 85 && T >= 80 && T <= 87)
      hi += ((R - 85) / 10) * ((87 - T) / 5);
    return (hi - 32) * 5 / 9;
  }

  // Steadman Apparent Temperature for the middle range (50–80°F / 10–27°C).
  // AT = Ta + 0.33e − 0.70ws − 4.00  (e in hPa, ws in m/s)
  const e = (relHumidity / 100) * 6.1078 * Math.exp(17.27 * tempC / (237.3 + tempC));
  return tempC + 0.33 * e - 0.70 * windMs - 4.00;
}

export async function getWeatherData(): Promise<WeatherData | null> {
  try {
    const userAgent = 'scow-preflight (app@example.com)';
    // Freshness is managed by `weatherCache.ts` (TTL + background polling +
    // SSE fanout). Bypass Next's fetch cache so a forced refresh actually
    // hits NWS.
    const options = { headers: { 'User-Agent': userAgent }, cache: 'no-store' as const };

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

    // 2. Get forecast endpoint URLs
    const pointsRes = await fetch('https://api.weather.gov/points/38.852,-77.037', options);
    if (!pointsRes.ok) throw new Error('Failed to fetch NWS gridpoints');
    const pointsData = await pointsRes.json();
    const forecastHourlyUrl = pointsData.properties.forecastHourly;
    const forecastGridDataUrl = pointsData.properties.forecastGridData;

    // 3. Fetch hourly forecast and raw grid data in parallel.
    // - forecastHourly gives nicely-bucketed periods (temp, PoP, isDaytime, etc.)
    // - forecastGridData gives native-unit (km/h) wind & gust matching the
    //   "digital forecast" page; using it avoids the kt->mph->kt round-trip
    //   that biased values upward by ~1 kt.
    const [forecastRes, gridRes] = await Promise.all([
      fetch(forecastHourlyUrl, options),
      fetch(forecastGridDataUrl, options),
    ]);
    if (!forecastRes.ok) throw new Error('Failed to fetch NWS hourly forecast');
    if (!gridRes.ok) throw new Error('Failed to fetch NWS grid data');
    const forecastData = await forecastRes.json();
    const gridData = await gridRes.json();
    const forecastPeriods = forecastData.properties.periods;

    // Build km/h time series for native wind/gust.
    const windSpeedSeries = expandGridSeries(gridData.properties.windSpeed);
    const windGustSeries = expandGridSeries(gridData.properties.windGust);

    // Filter and process forecast periods
    // We want to find periods starting from 1 hour before now
    const nowMs = new Date().getTime();

    const processedForecast: ForecastPeriod[] = forecastPeriods.map((period: any) => {
      const periodStartMs = new Date(period.startTime).getTime();
      // Prefer native km/h grid values for wind/gust; fall back to hourly mph
      // string only if the grid series doesn't cover this hour.
      const windKmh = sampleSeries(windSpeedSeries, periodStartMs);
      const windSpeedKnots = windKmh !== null
        ? kmhToKnots(windKmh)
        : mphToKnots(parseFloat(period.windSpeed.split(' ')[0]));
      // Suppress phantom gusts from rounding noise. The grid windGust series
      // always carries a value, often only marginally above sustained
      // (e.g. 11 km/h sustained vs 12 km/h gust would render as "6G7" purely
      // because of ceiling rounding). Require a meaningful raw delta in km/h
      // before treating it as a real gust. ~5 km/h ≈ 3 kt, well above the
      // 1-kt jitter ceiling can introduce. Real forecast gusts are typically
      // 10+ kt above sustained so this threshold keeps them.
      const GUST_MIN_DELTA_KMH = 6;
      const gustKmh = sampleSeries(windGustSeries, periodStartMs);
      const hasMeaningfulGust = gustKmh !== null && windKmh !== null
        && (gustKmh - windKmh) >= GUST_MIN_DELTA_KMH;
      const windGustKnots = hasMeaningfulGust
        ? kmhToKnots(gustKmh as number)
        : (gustKmh === null && period.windGust
            ? mphToKnots(parseFloat(period.windGust.split(' ')[0]))
            : 0);

      const tempF = period.temperature;
      const tempC = (tempF - 32) * 5/9; // Convert forecast temp from F to C
      const apparentTempF = period.temperature;
      const apparentTempC = (apparentTempF - 32) * 5/9;

      return {
        startTime: period.startTime,
        endTime: period.endTime,
        windSpeed: windSpeedKnots,
        windGust: windGustKnots,
        temperature: tempC,
        temperatureUnit: 'C',
        apparentTemperature: apparentTempC,
        probabilityOfPrecipitation: period.probabilityOfPrecipitation?.value ?? 0,
        isDaytime: period.isDaytime,
      };
    });

    // We'll return the full list and let the component decide which ones to show (-1H, Now, etc.)
    // Policy banner uses the worst (sustained or gust) wind over the next 6 hours.
    const sixHoursMs = 6 * 60 * 60 * 1000;
    const horizonMs = nowMs + sixHoursMs;
    const upcoming = processedForecast.filter(p => {
      const t = new Date(p.startTime).getTime();
      return t >= nowMs - 60 * 60 * 1000 && t <= horizonMs; // include the current hour
    });
    const maxForecastWind = upcoming.length > 0
      ? Math.max(...upcoming.map(p => Math.max(p.windSpeed, p.windGust)))
      : 0;

    return {
      retrievedAt: new Date().toISOString(),
      observationTime: latestObs?.timestamp || '',
      forecastGeneratedAt: forecastData.properties.generatedAt || forecastData.properties.updated || '',

      currentWindSpeed: latestObs ? mphToKnots(latestObs.windSpeed.value * 0.621371) : null,
      currentWindDirection: latestObs?.windDirection.value ?? null,
      currentTemperatureC: latestObs?.temperature.value ?? null,
      currentTemperatureF: latestObs?.temperature.value ? cToF(latestObs.temperature.value) : null,
      currentFeelsLikeC: (() => {
        if (!latestObs || latestObs.temperature.value === null || latestObs.relativeHumidity?.value == null) return null;
        return computeFeelsLike(latestObs.temperature.value, latestObs.windSpeed?.value ?? 0, latestObs.relativeHumidity.value);
      })(),
      currentFeelsLikeF: (() => {
        if (!latestObs || latestObs.temperature.value === null || latestObs.relativeHumidity?.value == null) return null;
        return cToF(computeFeelsLike(latestObs.temperature.value, latestObs.windSpeed?.value ?? 0, latestObs.relativeHumidity.value));
      })(),

      pastObservations: pastObs,
      forecast: processedForecast,
      maxForecastWind: maxForecastWind,
    };
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return null;
  }
}
