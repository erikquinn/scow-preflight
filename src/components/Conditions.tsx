import { getWeatherData, WeatherData, ForecastPeriod } from "@/lib/weather";
import { getTideData, TideData, TidePrediction } from "@/lib/tides";

const KNOTS_TO_MPH = 1.15078;
const PFD_MESSAGE = "(All aboard must wear PFDs)";
const REEF_MESSAGE = "(Daysailers MUST reef, remain in lagoon)";
const SOCIAL_SAIL_MESSAGE = "(Social Sail: max 5 people, incl. 2nd skipper/exp crew)";

// Helper to convert knots to MPH
const knotsToMph = (knots: number) => Math.round(knots * KNOTS_TO_MPH);

// Helper to format date/time in US Eastern Time
const TIMEZONE = 'America/New_York';
const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TIMEZONE });
const formatDate = (isoString: string) => new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', timeZone: TIMEZONE });

const getWindSeverityClass = (windKnots: number) => {
  if (windKnots < 5) return 'border-blue-400 dark:border-blue-800 bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'; // Pale Blue: Weak wind
  if (windKnots >= 5 && windKnots <= 14) return 'border-green-400 dark:border-green-800 bg-green-100 dark:bg-green-950/40 text-green-900 dark:text-green-200'; // Green: Normal
  if (windKnots >= 15 && windKnots <= 19) return 'border-yellow-400 dark:border-yellow-800 bg-yellow-100 dark:bg-yellow-950/40 text-yellow-900 dark:text-yellow-200'; // Yellow: Restricted
  if (windKnots >= 20 && windKnots <= 24) return 'border-red-400 dark:border-red-800 bg-red-100 dark:bg-red-950/40 text-red-900 dark:text-red-200';     // Red: No Daysailers
  return 'border-black dark:border-slate-600 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-gray-100'; // Black: All Restricted (>= 25 knots)
};

// Determine wind restriction for policy box
const getPolicyRestriction = (maxWindKnots: number) => {
  if (maxWindKnots < 5) {
    return { color: 'bg-blue-700 dark:bg-blue-800 shadow-blue-200 dark:shadow-none', text: 'Weak Wind Conditions' };
  }
  if (maxWindKnots >= 5 && maxWindKnots <= 14) {
    return { color: 'bg-green-700 dark:bg-green-800 shadow-green-200 dark:shadow-none', text: 'Normal Sailing Conditions' };
  }
  if (maxWindKnots >= 15 && maxWindKnots <= 19) {
    return { color: 'bg-yellow-600 dark:bg-yellow-800 shadow-yellow-200 dark:shadow-none', text: 'Restricted Daysailer Conditions' };
  }
  if (maxWindKnots >= 20 && maxWindKnots <= 24) {
    return { color: 'bg-red-700 dark:bg-red-800 shadow-red-200 dark:shadow-none', text: 'Daysailers Restricted' };
  }
  return { color: 'bg-slate-800 dark:bg-slate-900 shadow-gray-200 dark:shadow-none', text: 'All Boats Restricted' };
};

export default async function Conditions() {
  const weatherData = await getWeatherData();
  const tideData = await getTideData();

  const lastObservedTime = weatherData?.observationTime ? new Date(weatherData.observationTime) : null;
  const forecastGeneratedTime = weatherData?.forecastGeneratedAt ? new Date(weatherData.forecastGeneratedAt) : null;

  // Add expected update information
  const observationExpectedNext = lastObservedTime ? new Date(lastObservedTime.getTime() + 60 * 60 * 1000 + 10 * 60 * 1000) : null; // Usually hourly + 10min buffer
  const forecastExpectedNext = forecastGeneratedTime ? new Date(forecastGeneratedTime.getTime() + 6 * 60 * 60 * 1000) : null; // NWS grids usually every 6 hours

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

  const renderWindCell = (relativeLabel: string, localLabel: string, windSpeed: number, windGust: number, time: string, isCurrent: boolean = false) => {
    const maxWind = Math.max(windSpeed, windGust);
    const severityClass = getWindSeverityClass(maxWind);
    return (
      <div key={time} className={`flex-shrink-0 w-20 p-2 border-l first:border-l-0 border-slate-300 dark:border-slate-700 text-center ${severityClass} transition-colors duration-300`}>
        <div className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-400 leading-tight">{relativeLabel}</div>
        <div className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-500 mb-1 leading-tight">{localLabel}</div>
        <div className="font-extrabold text-xl leading-none">{windSpeed}{windGust > 0 ? `(${windGust})` : ''}</div>
        <div className="text-[10px] font-bold mt-1 opacity-80">kts</div>
      </div>
    );
  };

  const renderSCOWPolicyDetails = () => {
    const maxWindKnots = weatherData?.maxForecastWind ?? 0;
    const policy = getPolicyRestriction(maxWindKnots);

    return (
      <div className={`p-4 rounded-lg flex items-center justify-between shadow-sm ${policy.color} text-white mb-6`}>
        <div className="flex items-center">
          <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <h3 className="font-bold text-lg">{policy.text}</h3>
        </div>
        <div className="text-right text-sm">
          {maxWindKnots >= 15 && (
            <p className="font-medium">{REEF_MESSAGE} {PFD_MESSAGE}</p>
          )}
          {maxWindKnots >= 15 && maxWindKnots <= 19 && (
            <p className="font-medium">{SOCIAL_SAIL_MESSAGE}</p>
          )}
          {maxWindKnots >= 20 && (
            <p className="font-medium">Daysailers (Flying Scot) CANNOT SAIL</p>
          )}
           {maxWindKnots >= 25 && (
            <p className="font-medium">Cruising Boats CANNOT SAIL</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="bg-white dark:bg-blue-900 text-slate-900 dark:text-white p-6 rounded-xl shadow-lg mb-8 border border-slate-200 dark:border-blue-800 transition-colors duration-300">
      <h2 className="text-2xl font-bold mb-4 flex items-center border-b border-slate-100 dark:border-blue-700 pb-2 text-blue-900 dark:text-white">
        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
        Current & Forecast Conditions (KDCA)
      </h2>

      {weatherData && renderSCOWPolicyDetails()}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-50 dark:bg-blue-800/50 p-4 rounded-lg border border-blue-100 dark:border-blue-700/50">
          <h3 className="text-blue-700 dark:text-blue-200 text-sm font-semibold uppercase tracking-wider mb-1">Current Wind (Now)</h3>
          <p className={`text-2xl font-semibold ${getWindSeverityClass(currentWindKnots ?? 0)} p-2 rounded shadow-sm`}>
            {currentWindKnots !== null ? formatWind(currentWindKnots, currentWindDirection) : "Loading..."}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
            {lastObservedTime && lastObservedValid ? `Observed: ${formatTime(lastObservedTime.toISOString())}` : ""}
          </p>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-800/50 p-4 rounded-lg border border-blue-100 dark:border-blue-700/50">
          <h3 className="text-blue-700 dark:text-blue-200 text-sm font-semibold uppercase tracking-wider mb-1">Feels Like Temp (Now)</h3>
          <p className="text-2xl font-semibold">
            {weatherData && weatherData.currentApparentTemperatureC !== null ? 
              `${Math.round(weatherData.currentApparentTemperatureC)}°C / ${Math.round(weatherData.currentApparentTemperatureF ?? 0)}°F` : "Loading..."}
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-800/50 p-4 rounded-lg border border-blue-100 dark:border-blue-700/50">
          <h3 className="text-blue-700 dark:text-blue-200 text-sm font-semibold uppercase tracking-wider mb-1">Precipitation (8hr)</h3>
          <p className="text-2xl font-semibold">
            {weatherData && weatherData.forecast[0] ? 
              `${weatherData.forecast.reduce((max, p) => Math.max(max, p.probabilityOfPrecipitation), 0)}%` : "Loading..."}
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-800/50 p-4 rounded-lg border border-blue-100 dark:border-blue-700/50">
          <h3 className="text-blue-700 dark:text-blue-200 text-sm font-semibold uppercase tracking-wider mb-1">Tide Cycle</h3>
          <p className="text-2xl font-semibold">
            {tideData?.currentTideCycle ?? "Loading..."}
          </p>
          <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
            {tideData?.tideSchedule.map((tide, index) => {
              if (tide.value === -999) return null; // Skip current interpolated time
              const type = tide.type === 'H' ? 'High' : 'Low';
              
              // Find the index of the current time marker
              const currentIndex = tideData.tideSchedule.findIndex(p => p.value === -999);
              
              let label = "";
              if (index < currentIndex) {
                label = `Last ${type}`;
              } else {
                label = `Next ${type}`;
              }
              
              return <div key={index}>{label} ({formatTime(tide.time)})</div>;
            })}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4 border-b border-slate-100 dark:border-blue-700 pb-2 flex items-center text-blue-900 dark:text-white">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          Wind Timeline (KTS)
        </h3>
        <div className="flex overflow-x-auto py-2 -mx-6 px-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-blue-700 scrollbar-track-transparent">
          {/* Past Observations */}
          {weatherData?.pastObservations.map((obs, index) => renderWindCell(
            `-${weatherData.pastObservations.length - index}H`,
            formatTime(obs.time).toLowerCase().replace(':00', '').replace(' ', ''),
            obs.windSpeed, 0, obs.time
          ))}

          {/* Current Observation */}
          {weatherData?.currentWindSpeed !== null && (
            renderWindCell('Now', formatTime(weatherData?.observationTime ?? '').toLowerCase().replace(':00', '').replace(' ', ''), currentWindKnots ?? 0, 0, weatherData?.observationTime ?? '', true)
          )}

          {/* Forecast */}
          {weatherData?.forecast.map((period, index) => renderWindCell(
            `+${index + 1}H`,
            formatTime(period.startTime).toLowerCase().replace(':00', '').replace(' ', ''),
            period.windSpeed,
            period.windGust,
            period.startTime
          ))}
        </div>
        <div className="mt-4 space-y-1">
          <p className="text-xs text-blue-600 dark:text-blue-300">
            Last Observation: {lastObservedValid && lastObservedTime ? `${formatTime(lastObservedTime.toISOString())}` : 'N/A'} 
            {lastObservedTime && ` (${Math.round((new Date().getTime() - lastObservedTime.getTime()) / 60000)}m ago)`}
            {observationExpectedNext && new Date() > observationExpectedNext && " - [Delayed Update Expected]"}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-300">
            Forecast Generated: {forecastGeneratedValid && forecastGeneratedTime ? `${formatTime(forecastGeneratedTime.toISOString())} on ${formatDate(forecastGeneratedTime.toISOString())}` : 'N/A'}
            {forecastGeneratedTime && ` (${Math.round((new Date().getTime() - forecastGeneratedTime.getTime()) / 3600000)}h ago)`}
          </p>
        </div>
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-800/50 rounded-lg text-sm border border-blue-100 dark:border-blue-700/50">
          <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-2 uppercase tracking-wide">SCOW Wind Limits (SSRBUP)</h4>
          <ul className="list-disc list-inside space-y-1 text-blue-900 dark:text-blue-100 font-medium">
            <li>&lt; 5 kts: Weak Wind (Pale Blue)</li>
            <li>5 - 14 kts: Normal Operations (Green)</li>
            <li>15 - 19 kts (17-23 MPH): Daysailers MUST reef, remain in lagoon, ALL aboard wear PFDs. Social Sail: max 5 people, incl. 2nd skipper/exp crew. (Yellow)</li>
            <li>20 - 24 kts (23-29 MPH): Daysailers (Flying Scot) Restricted (Red)</li>
            <li>&gt;= 25 kts (&gt;= 29 MPH): All Boats Restricted (Black)</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
