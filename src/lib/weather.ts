export interface WeatherData {
  windSpeed: number | null; // in km/h
  windDirection: number | null; // in degrees
  temperature: number | null; // in Celsius
}

export async function getWeather(): Promise<WeatherData | null> {
  try {
    const res = await fetch('https://api.weather.gov/stations/KDCA/observations/latest', {
      headers: {
        'User-Agent': 'scow-preflight (app@example.com)' // NWS requires a User-Agent
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });
    if (!res.ok) throw new Error('Failed to fetch weather');
    const data = await res.json();
    const props = data.properties;
    
    // NWS typically returns wind speed in km/h and temp in C
    return {
      windSpeed: props.windSpeed.value, 
      windDirection: props.windDirection.value,
      temperature: props.temperature.value, 
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
}
