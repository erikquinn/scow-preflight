import { getWeatherData, WeatherData, ForecastPeriod } from "@/lib/weather";
import { getTideData, TideData, TidePrediction } from "@/lib/tides";

const KNOTS_TO_MPH = 1.15078;
const PFD_MESSAGE = "(All aboard must wear PFDs)";
const REEF_MESSAGE = "(Daysailers MUST reef, remain in lagoon)";
const SOCIAL_SAIL_MESSAGE = "(Social Sail: max 5 people, incl. 2nd skipper/exp crew)";

// Helper to convert knots to MPH
const knotsToMph = (knots: number) => Math.round(knots * KNOTS_TO_MPH);

// Helper to format date/time
const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
const formatDate = (isoString: string) => new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });

// Determine wind severity for styling
const getWindSeverityClass = (windKnots: number) => {
  if (windKnots < 5) return 'border-blue-300 bg-blue-50 text-blue-800'; // Pale Blue: Weak wind
  if (windKnots >= 5 && windKnots <= 14) return 'border-green-300 bg-green-50 text-green-800'; // Green: Normal
  if (windKnots >= 15 && windKnots <= 19) return 'border-yellow-300 bg-yellow-50 text-yellow-800'; // Yellow: Restricted
  if (windKnots >= 20 && windKnots <= 24) return 'border-red-300 bg-red-50 text-red-800';     // Red: No Daysailers
  return 'border-black-300 bg-gray-200 text-gray-900'; // Black: All Restricted (>= 25 knots)
};

// Determine wind restriction for policy box
const getPolicyRestriction = (maxWindKnots: number) => {
  if (maxWindKnots < 5) {
    return { color: 'bg-blue-600', text: 'Weak Wind Conditions' };
  }
  if (maxWindKnots >= 5 && maxWindKnots <= 14) {
    return { color: 'bg-green-600', text: 'Normal Sailing Conditions' };
  }
  if (maxWindKnots >= 15 && maxWindKnots <= 19) {
    return { color: 'bg-yellow-600', text: 'Restricted Daysailer Conditions' };
  }
  if (maxWindKnots >= 20 && maxWindKnots <= 24) {
    return { color: 'bg-red-600', text: 'Daysailers Restricted' };
  }
  return { color: 'bg-gray-800', text: 'All Boats Restricted' };
};

export default async function Conditions() {
  const weatherData = await getWeatherData();
  const tideData = await getTideData();

  const lastObservedTime = weatherData?.observationTime ? new Date(weatherData.observationTime) : null;
  const forecastGeneratedTime = weatherData?.forecastGeneratedAt ? new Date(weatherData.forecastGeneratedAt) : null;

  const currentWindKnots = weatherData?.currentWindSpeed ?? null;
  const currentWindDirection = weatherData?.currentWindDirection ?? null;

  const formatWind = (speedKnots: number | null, directionDeg: number | null) => {
    if (speedKnots === null || directionDeg === null) return "N/A";
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const dirIndex = Math.round((directionDeg % 360) / 22.5);
    const compassDir = directions[dirIndex % 16];
    return `${speedKnots} kts ${compassDir}`;
  };

  const renderWindCell = (label: string, windSpeed: number, windGust: number, time: string, isCurrent: boolean = false) => {
    const maxWind = Math.max(windSpeed, windGust);
    const severityClass = getWindSeverityClass(maxWind);
    return (
      <div key={label} className={`flex-shrink-0 w-24 p-3 border-l first:border-l-0 border-slate-200 text-center ${severityClass}`}>
        <div className="text-xs font-semibold uppercase text-slate-500 mb-1 truncate" title={time}>{label}</div>
        <div className="font-bold text-lg">{windSpeed} {windGust > 0 ? `(${windGust})` : ''}</div>
        <div className="text-xs text-slate-600">kts</div>
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
    <section className="bg-blue-900 text-white p-6 rounded-xl shadow-lg mb-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center border-b border-blue-700 pb-2">
        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
        Current & Forecast Conditions (KDCA)
      </h2>

      {weatherData && renderSCOWPolicyDetails()}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-800/50 p-4 rounded-lg">
          <h3 className="text-blue-200 text-sm font-semibold uppercase tracking-wider mb-1">Current Wind</h3>
          <p className={`text-2xl font-semibold ${getWindSeverityClass(currentWindKnots ?? 0)} p-2 rounded`}>
            {currentWindKnots !== null ? formatWind(currentWindKnots, currentWindDirection) : "Loading..."}
          </p>
          <p className="text-xs text-blue-300 mt-1">
            {lastObservedTime ? `Observed: ${formatTime(lastObservedTime.toISOString())}` : ""}
          </p>
        </div>
        
        <div className="bg-blue-800/50 p-4 rounded-lg">
          <h3 className="text-blue-200 text-sm font-semibold uppercase tracking-wider mb-1">Feels Like Temp</h3>
          <p className="text-2xl font-semibold">
            {weatherData && weatherData.currentApparentTemperatureC !== null ? 
              `${Math.round(weatherData.currentApparentTemperatureC)}°C / ${Math.round(weatherData.currentApparentTemperatureF ?? 0)}°F` : "Loading..."}
          </p>
        </div>

        <div className="bg-blue-800/50 p-4 rounded-lg">
          <h3 className="text-blue-200 text-sm font-semibold uppercase tracking-wider mb-1">Precipitation (8hr)</h3>
          <p className="text-2xl font-semibold">
            {weatherData && weatherData.forecast[0] ? 
              `${weatherData.forecast.reduce((max, p) => Math.max(max, p.probabilityOfPrecipitation), 0)}%` : "Loading..."}
          </p>
        </div>

        <div className="bg-blue-800/50 p-4 rounded-lg">
          <h3 className="text-blue-200 text-sm font-semibold uppercase tracking-wider mb-1">Tide Cycle</h3>
          <p className="text-2xl font-semibold">
            {tideData?.currentTideCycle ?? "Loading..."}
          </p>
          <div className="text-xs text-blue-300 mt-1">
            {tideData?.tideSchedule.map((tide, index) => {
              if (tide.value === -999) return null; // Skip current interpolated time
              const type = tide.type === 'H' ? 'High' : 'Low';
              const prefix = 
                index === 0 ? 'Last' : 
                (tideData.tideSchedule.findIndex(p => p.value === -999) === index - 1 ? 'Next' : '');
              return <div key={index}>{prefix} {type} ({formatTime(tide.time)})</div>;
            })}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4 border-b border-blue-700 pb-2 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          Wind Timeline (KTS)
        </h3>
        <div className="flex overflow-x-auto py-2 -mx-6 px-6 scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-blue-900">
          {/* Past Observations */}
          {weatherData?.pastObservations.map((obs, index) => renderWindCell(
            `- ${(weatherData.pastObservations.length - index) * 1}h`,
            obs.windSpeed, 0, obs.time
          ))}

          {/* Current Observation */}
          {weatherData?.currentWindSpeed !== null && (
            renderWindCell('Current', currentWindKnots ?? 0, 0, weatherData?.observationTime ?? '', true)
          )}

          {/* Forecast */}
          {weatherData?.forecast.map((period, index) => renderWindCell(
            `+${index + 1}h`,
            period.windSpeed,
            period.windGust,
            period.startTime
          ))}
        </div>
        <p className="text-xs text-blue-300 mt-4">
          Last Observation: {lastObservedTime ? ` ${formatTime(lastObservedTime.toISOString())}` : 'N/A'}. 
          Forecast Generated: {forecastGeneratedTime ? `${formatTime(forecastGeneratedTime.toISOString())} on ${formatDate(forecastGeneratedTime.toISOString())}` : 'N/A'}.
        </p>
        <div className="mt-4 p-4 bg-blue-800/50 rounded-lg text-sm">
          <h4 className="font-bold text-blue-200 mb-2">SCOW Wind Limits (SSRBUP)</h4>
          <ul className="list-disc list-inside space-y-1">
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
