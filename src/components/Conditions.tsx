import { getWeather } from "@/lib/weather";
import { getTides } from "@/lib/tides";

export default async function Conditions() {
  const weather = await getWeather();
  const tides = await getTides();

  // Helper functions to format data
  const formatWind = (speedKmH: number | null, directionDeg: number | null) => {
    if (speedKmH === null || directionDeg === null) return "Data unavailable";
    const speedKnots = (speedKmH * 0.539957).toFixed(1);
    
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const dirIndex = Math.round((directionDeg % 360) / 22.5);
    const compassDir = directions[dirIndex % 16];

    return `${speedKnots} kts from ${compassDir}`;
  };

  const formatTemp = (tempC: number | null) => {
    if (tempC === null) return "Data unavailable";
    const tempF = (tempC * 9/5) + 32;
    return `${Math.round(tempF)}°F`;
  };

  return (
    <section className="bg-blue-900 text-white p-6 rounded-xl shadow-lg mb-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center border-b border-blue-700 pb-2">
        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
        Current Conditions (KDCA)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-800/50 p-4 rounded-lg">
          <h3 className="text-blue-200 text-sm font-semibold uppercase tracking-wider mb-1">Wind</h3>
          <p className="text-2xl font-semibold">
            {weather ? formatWind(weather.windSpeed, weather.windDirection) : "Loading..."}
          </p>
        </div>
        <div className="bg-blue-800/50 p-4 rounded-lg">
          <h3 className="text-blue-200 text-sm font-semibold uppercase tracking-wider mb-1">Temperature</h3>
          <p className="text-2xl font-semibold">
            {weather ? formatTemp(weather.temperature) : "Loading..."}
          </p>
        </div>
        <div className="bg-blue-800/50 p-4 rounded-lg">
          <h3 className="text-blue-200 text-sm font-semibold uppercase tracking-wider mb-1">Water Level (Tide)</h3>
          <p className="text-2xl font-semibold">
            {tides ? `${parseFloat(tides.waterLevel).toFixed(1)} ft` : "Loading..."}
          </p>
          <p className="text-xs text-blue-300 mt-1">
            {tides ? `As of ${new Date(tides.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
