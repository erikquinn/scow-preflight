export interface TideData {
  waterLevel: string; // level in feet
  time: string;
}

export async function getTides(): Promise<TideData | null> {
  try {
    // Station 8594900 is Washington Channel
    const res = await fetch('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=8594900&product=water_level&datum=MLLW&time_zone=lst_ldt&units=english&format=json', {
      next: { revalidate: 300 }
    });
    if (!res.ok) throw new Error('Failed to fetch tides');
    const data = await res.json();
    
    if (data && data.data && data.data.length > 0) {
      return {
        waterLevel: data.data[0].v,
        time: data.data[0].t
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching tides:", error);
    return null;
  }
}
