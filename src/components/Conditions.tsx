"use client";

import { useEffect, useRef, useState } from "react";
import type { WeatherData } from "@/lib/weather";
import type { TideData } from "@/lib/tides";
import type { ConditionsSnapshot } from "@/lib/weatherCache";
import CollapsibleWindLimits from "./CollapsibleWindLimits";

const PFD_MESSAGE = "(All aboard must wear PFDs)";
const REEF_MESSAGE = "(Flying Scots MUST reef, remain in lagoon)";
const SOCIAL_SAIL_MESSAGE = "(Social Sail: max 5 people, incl. 2nd skipper/exp crew)";

// Helper to format date/time in US Eastern Time
const TIMEZONE = 'America/New_York';
const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TIMEZONE });

const getWindSeverityClass = (windKnots: number) => {
  // Dark-mode backgrounds use solid (no alpha) colors so they don't mix with
  // the section's parent background. Shades are kept deep (-900 / -950) so
  // the cells read as muted color hints rather than glowing swatches.
  if (windKnots < 10) return 'border-blue-400 dark:border-blue-800 bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200'; // Pale Blue: Weak wind
  if (windKnots >= 10 && windKnots <= 14) return 'border-green-400 dark:border-green-800 bg-green-100 dark:bg-green-950 text-green-900 dark:text-green-200'; // Green: Optimal
  if (windKnots >= 15 && windKnots <= 19) return 'border-yellow-400 dark:border-yellow-700 bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100'; // Yellow: Restricted
  if (windKnots >= 20 && windKnots <= 24) return 'border-red-400 dark:border-red-800 bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-200';     // Red: No Flying Scots
  return 'border-black dark:border-slate-600 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-gray-200'; // Black: All Prohibited (>= 25 knots)
};

// Severity styling for precipitation probability (max over forecast window).
// Mirrors the wind severity palette and dark-mode treatment.
const getPrecipSeverityClass = (precipPct: number) => {
  if (precipPct > 80) return 'border-black dark:border-slate-600 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-gray-200';
  if (precipPct >= 50) return 'border-red-400 dark:border-red-800 bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-200';
  if (precipPct >= 25) return 'border-yellow-400 dark:border-yellow-700 bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100';
  return ''; // No styling below 25%
};

// Determine wind restriction for policy box
const getPolicyRestriction = (maxWindKnots: number) => {
  if (maxWindKnots < 10) {
    return {
      color: 'bg-blue-700 dark:bg-blue-800 shadow-blue-200 dark:shadow-none',
      text: 'Weak Wind',
      icon: <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
    };
  }
  if (maxWindKnots >= 10 && maxWindKnots <= 14) {
    return {
      color: 'bg-green-700 dark:bg-green-800 shadow-green-200 dark:shadow-none',
      text: 'Optimal Wind',
      icon: <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    };
  }
  if (maxWindKnots >= 15 && maxWindKnots <= 19) {
    return {
      color: 'bg-yellow-600 dark:bg-yellow-800 shadow-yellow-200 dark:shadow-none',
      text: 'Lagoon Only',
      icon: <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
    };
  }
  if (maxWindKnots >= 20 && maxWindKnots <= 24) {
    return {
      color: 'bg-red-700 dark:bg-red-800 shadow-red-200 dark:shadow-none',
      text: 'High Winds',
      icon: <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
    };
  }
  return {
    color: 'bg-slate-800 dark:bg-slate-900 shadow-gray-200 dark:shadow-none',
    text: 'Gale Winds',
    icon: <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
  };
};

interface ConditionsProps {
  initialSnapshot: ConditionsSnapshot;
}

export default function Conditions({ initialSnapshot }: ConditionsProps) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(initialSnapshot.weather);
  const [tideData, setTideData] = useState<TideData | null>(initialSnapshot.tide);
  const snapshotVersionRef = useRef<number>(initialSnapshot.version);

  // `now` is recomputed in state so age labels & "NOW" highlighting update
  // without a page refresh. We tick it every minute.
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Subscribe to server-pushed snapshots. The server maintains a single
    // cache shared across all clients; this just listens for changes.
    const es = new EventSource("/api/conditions");

    const onSnapshot = (e: MessageEvent) => {
      try {
        const snap: ConditionsSnapshot = JSON.parse(e.data);
        // Ignore older snapshots (can happen briefly during reconnect).
        if (snap.version < snapshotVersionRef.current) return;
        snapshotVersionRef.current = snap.version;
        setWeatherData(snap.weather);
        setTideData(snap.tide);
      } catch (err) {
        console.error("conditions SSE parse error", err);
      }
    };
    es.addEventListener("snapshot", onSnapshot as EventListener);

    return () => {
      es.removeEventListener("snapshot", onSnapshot as EventListener);
      es.close();
    };
  }, []);

  // When the tab regains focus or comes back online, nudge the server to
  // refresh and push us an updated snapshot. Cheap (cache-deduped) and makes
  // long-backgrounded tabs catch up instantly.
  useEffect(() => {
    const nudge = () => {
      // Fire-and-forget. The cache TTL ensures this is a no-op when called
      // rapidly; the SSE channel delivers the eventual update.
      fetch("/api/conditions?stream=0", { cache: "no-store" }).catch(() => {});
    };
    const onVisible = () => { if (document.visibilityState === "visible") nudge(); };
    window.addEventListener("focus", nudge);
    window.addEventListener("online", nudge);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", nudge);
      window.removeEventListener("online", nudge);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const lastObservedTime = weatherData?.observationTime ? new Date(weatherData.observationTime) : null;
  const forecastGeneratedTime = weatherData?.forecastGeneratedAt ? new Date(weatherData.forecastGeneratedAt) : null;

  // Ensure dates are valid
  const isValidDate = (d: Date | null) => d instanceof Date && !isNaN(d.getTime());
  const lastObservedValid = isValidDate(lastObservedTime);
  const forecastGeneratedValid = isValidDate(forecastGeneratedTime);

  const currentWindKnots = weatherData?.currentWindSpeed ?? null;
  const currentWindDirection = weatherData?.currentWindDirection ?? null;

  const formatWind = (speedKnots: number | null, directionDeg: number | null) => {
    if (speedKnots === null || directionDeg === null) return "N/A";
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const dirIndex = Math.round((directionDeg % 360) / 22.5);
    const compassDir = directions[dirIndex % 16];
    return `${speedKnots} kts ${compassDir}`;
  };

  const renderWindCell = (relativeLabel: string, localLabel: string, windSpeed: number, windGust: number, time: string, isEmphasis: boolean = false, isDaytime: boolean = true) => {
    const maxWind = Math.max(windSpeed, windGust);
    let severityClass = getWindSeverityClass(maxWind);

    // Deemphasize night blocks
    if (!isDaytime) {
      severityClass = 'bg-slate-200 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-400 dark:text-slate-600 grayscale opacity-60';
    }

    return (
      <div key={time} className={`flex-shrink-0 w-20 p-2 border-l first:border-l-0 border-slate-300 dark:border-slate-700 text-center ${severityClass} transition-colors duration-300 ${isEmphasis ? 'ring-2 ring-blue-500 ring-inset relative z-10' : ''}`}>
        {isEmphasis && (
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-blue-500 text-[8px] font-black text-white px-1 rounded-sm uppercase tracking-tighter">
            NOW
          </div>
        )}
        <div className={`text-[10px] font-black uppercase leading-tight ${isDaytime ? 'text-slate-700 dark:text-slate-400' : 'text-slate-400 dark:text-slate-600'}`}>{relativeLabel}</div>
        <div className={`text-[10px] font-bold uppercase mb-1 leading-tight ${isDaytime ? 'text-slate-600 dark:text-slate-500' : 'text-slate-400 dark:text-slate-700'}`}>{localLabel}</div>
        {/* Sustained wind is always centered in the cell. Gust (when present)
            is positioned absolutely to its right so it does not influence the
            sustained number's alignment. Both inherit the cell's severity
            text color so they always share the same color, derived from
            max(sustained, gust) above. */}
        <div className="flex items-start justify-center leading-none mt-1.5 mb-1.5">
          <span className="relative font-extrabold text-xl">
            {windSpeed}
            {windGust > 0 && windGust > windSpeed && (
              <span className="absolute left-full top-0 ml-0.5 text-[9px] font-bold tracking-tighter opacity-90 whitespace-nowrap">G{windGust}</span>
            )}
          </span>
        </div>
        <div className="text-[10px] font-bold mt-1 opacity-80">kts</div>
      </div>
    );
  };

  const getRelativeHourLabel = (targetTime: string) => {
    const diffMs = new Date(targetTime).getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const sign = diffHours >= 0 ? "+" : "";
    return `${sign}${diffHours.toFixed(1)}H`;
  };

  const renderSCOWPolicyDetails = () => {
    const maxWindKnots = weatherData?.maxForecastWind ?? 0;
    const policy = getPolicyRestriction(maxWindKnots);

    return (
      <div className={`p-4 rounded-lg flex items-center justify-between shadow-sm ${policy.color} text-white mb-6`}>
        <div className="flex items-center">
          {policy.icon}
          <h3 className="font-bold text-lg">Next 6 hrs: {policy.text}</h3>
        </div>
        <div className="text-right text-sm">
          {maxWindKnots >= 15 && (
            <p className="font-medium">{REEF_MESSAGE} {PFD_MESSAGE}</p>
          )}
          {maxWindKnots >= 15 && maxWindKnots <= 19 && (
            <p className="font-medium">{SOCIAL_SAIL_MESSAGE}</p>
          )}
          {maxWindKnots >= 20 && (
            <p className="font-medium">Flying Scots CANNOT SAIL</p>
          )}
           {maxWindKnots >= 25 && (
            <p className="font-medium">Cruising Boats CANNOT SAIL</p>
          )}
        </div>
      </div>
    );
  };

  const getForecastAgeLabel = () => {
    if (!forecastGeneratedTime || !forecastGeneratedValid) return "N/A";
    const diffMs = now.getTime() - forecastGeneratedTime.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    return `NWS Forecast Issued: ${timeStr} ago`;
  };

  return (
    <section className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-xl shadow-lg mb-8 border border-slate-200 dark:border-slate-800 transition-colors duration-300">
      <h2 className="text-2xl font-bold mb-4 flex items-center border-b border-slate-100 dark:border-slate-800 pb-2 text-blue-900 dark:text-slate-100">
        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
        Current & Forecast Weather Conditions (KDCA)
      </h2>

      {weatherData && renderSCOWPolicyDetails()}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-50 dark:bg-slate-800/60 p-4 rounded-lg border border-blue-100 dark:border-slate-700/60 text-center flex flex-col">
          <h3 className="text-blue-700 dark:text-slate-300 text-sm font-semibold uppercase tracking-wider mb-1">Current Wind</h3>
          <div className="flex-1 flex flex-col justify-center">
            <p className={`text-2xl font-semibold inline-block self-center ${getWindSeverityClass(currentWindKnots ?? 0)} px-3 py-2 rounded shadow-sm`}>
              {currentWindKnots !== null ? formatWind(currentWindKnots, currentWindDirection) : "Loading..."}
            </p>
            <p className="text-xs text-blue-600 dark:text-slate-400 mt-1">
              {lastObservedTime && lastObservedValid ?
                `${Math.round((now.getTime() - lastObservedTime.getTime()) / 60000)} min ago (${formatTime(lastObservedTime.toISOString())})` : ""}
            </p>
            <p className="text-xs text-blue-400 dark:text-slate-500 mt-0.5">NWS KDCA observation</p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-slate-800/60 p-4 rounded-lg border border-blue-100 dark:border-slate-700/60 text-center flex flex-col">
          <h3 className="text-blue-700 dark:text-slate-300 text-sm font-semibold uppercase tracking-wider mb-1">Feels Like Temp</h3>
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-2xl font-semibold">
              {weatherData && weatherData.currentFeelsLikeC !== null ?
                `${Math.round(weatherData.currentFeelsLikeC)}°C / ${Math.round(weatherData.currentFeelsLikeF ?? 0)}°F` : "Loading..."}
            </p>
            <p className="text-xs text-blue-600 dark:text-slate-400 mt-1">
              {lastObservedTime && lastObservedValid ?
                `${Math.round((now.getTime() - lastObservedTime.getTime()) / 60000)} min ago (${formatTime(lastObservedTime.toISOString())})` : ""}
            </p>
            <p className="text-xs text-blue-400 dark:text-slate-500 mt-0.5">NWS KDCA observation</p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-slate-800/60 p-4 rounded-lg border border-blue-100 dark:border-slate-700/60 text-center flex flex-col">
          <h3 className="text-blue-700 dark:text-slate-300 text-sm font-semibold uppercase tracking-wider mb-1">Precipitation (8hr)</h3>
          <div className="flex-1 flex flex-col justify-center">
            {(() => {
              const nowMs = Date.now();
              const eightHoursMs = nowMs + 8 * 60 * 60 * 1000;
              const precipPct = weatherData?.forecast[0]
                ? weatherData.forecast
                    .filter(p => {
                      const t = new Date(p.startTime).getTime();
                      return t >= nowMs && t <= eightHoursMs;
                    })
                    .reduce((max, p) => Math.max(max, p.probabilityOfPrecipitation), 0)
                : null;
              const severity = precipPct !== null ? getPrecipSeverityClass(precipPct) : '';
              return (
                <>
                  <p className={`text-2xl font-semibold ${severity ? `inline-block self-center ${severity} px-3 py-2 rounded shadow-sm` : ''}`}>
                    {precipPct !== null ? `${precipPct}%` : "Loading..."}
                  </p>
                  <p className="text-xs text-blue-400 dark:text-slate-500 mt-1">NWS hourly forecast</p>
                </>
              );
            })()}
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-slate-800/60 p-4 rounded-lg border border-blue-100 dark:border-slate-700/60 text-center flex flex-col">
          <h3 className="text-blue-700 dark:text-slate-300 text-sm font-semibold uppercase tracking-wider mb-1">Tide Cycle</h3>
          <div className="flex-1 flex flex-col justify-center">
          <p className="text-2xl font-semibold">
            {tideData?.currentTideCycle ?? "Loading..."}
          </p>
          <p className="text-xs text-blue-400 dark:text-slate-500 mt-0.5 mb-1">NOAA Tides &amp; Currents</p>
          <div className="text-xs text-blue-600 dark:text-slate-400 mt-1">
            {tideData?.tideSchedule.map((tide, index) => {
              if (tide.value === -999) return null; // Skip current interpolated time
              const type = tide.type === 'H' ? 'High' : 'Low';

              // Find the index of the current time marker
              const currentIndex = tideData.tideSchedule.findIndex(p => p.value === -999);

              let label = "";
              const isPast = index < currentIndex;
              if (isPast) {
                label = `Last ${type}`;
              } else {
                label = `Next ${type}`;
              }

              return (
                <div key={index} className={isPast ? "opacity-60 font-normal" : "font-bold"}>
                  {label} ({formatTime(tide.time)})
                </div>
              );
            })}
          </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-end justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
          <h3 className="text-xl font-bold flex items-center text-blue-900 dark:text-slate-100">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2m7.6-7.4A2 2 0 1 1 11 8H2m10.6 11.4A2 2 0 1 0 14 16H2" />
            </svg>
            NWS Wind Forecast (KTS)
          </h3>
          <span className="text-xs text-blue-600 dark:text-slate-400 italic pb-0.5">
            {getForecastAgeLabel()}
          </span>
        </div>
        <div className="flex overflow-x-auto py-2 -mx-6 px-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {/* Originally Forecast Wind (Strictly from forecast array) */}
          {weatherData?.forecast && (() => {
            const startOfCurrentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime();
            const oneHourAgo = startOfCurrentHour - 3600000;

            // Logic for "until midnight"
            // If current hour >= 18 (6pm), go until midnight of NEXT day.
            // Else, go until midnight of CURRENT day.
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            const endOfNextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
            const targetEnd = now.getHours() >= 18 ? endOfNextDay : endOfDay;

            return weatherData.forecast
              .filter(period => {
                const pTime = new Date(period.startTime).getTime();
                return pTime >= oneHourAgo && pTime <= targetEnd.getTime();
              })
              .map((period, index) => renderWindCell(
                getRelativeHourLabel(period.startTime),
                // e.g. "05:00 AM" -> "5 AM"
                formatTime(period.startTime).replace(':00', '').replace(/^0/, ''),
                period.windSpeed,
                period.windGust,
                period.startTime,
                index === 1, // Emphasis on the second cell ("now"ish)
                period.isDaytime
              ));
          })()}
        </div>

        <CollapsibleWindLimits />
      </div>
    </section>
  );
}
