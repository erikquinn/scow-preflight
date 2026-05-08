export interface TidePrediction {
  time: string;
  value: number; // water level in feet
  type: 'H' | 'L' | 'R' | 'F'; // H: High, L: Low, R: Rising, F: Falling (for current time)
}

export interface TideData {
  retrievedAt: string; // When this data was retrieved from NOAA
  currentTideCycle: string; // e.g., "30% Rising"
  tideSchedule: TidePrediction[]; // last, current, next, one more after that
}

export async function getTideData(): Promise<TideData | null> {
  try {
    const stationId = '8594900'; // Washington Channel
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 1); // Yesterday
    endDate.setDate(endDate.getDate() + 1);   // Tomorrow

    const formatDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${year}${month}${day} ${hours}:${minutes}`;
    };

    const apiUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${formatDateTime(startDate)}&end_date=${formatDateTime(endDate)}&station=${stationId}&product=predictions&datum=MLLW&time_zone=gmt&units=english&format=json&interval=hilo`;
    
    const res = await fetch(apiUrl, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error('Failed to fetch NOAA tide predictions');
    const data = await res.json();

    if (!data || !data.predictions || data.predictions.length === 0) {
      return null;
    }

    const predictions: TidePrediction[] = data.predictions.map((p: any) => ({
      // Append 'Z' since we requested GMT time_zone from NOAA
      time: new Date(p.t.replace(' ', 'T') + 'Z').toISOString(),
      value: parseFloat(p.v),
      type: p.type,
    }));

    const now = new Date();
    let lastTide: TidePrediction | undefined;
    let nextTide: TidePrediction | undefined;

    // Find the last and next tide relative to now
    for (let i = predictions.length - 1; i >= 0; i--) {
      if (new Date(predictions[i].time) < now) {
        lastTide = predictions[i];
        break;
      }
    }
    for (let i = 0; i < predictions.length; i++) {
      if (new Date(predictions[i].time) > now) {
        nextTide = predictions[i];
        break;
      }
    }

    let currentTideCycle = "Data unavailable";
    const tideSchedule: TidePrediction[] = [];

    if (lastTide && nextTide) {
      const lastTideTime = new Date(lastTide.time).getTime();
      const nextTideTime = new Date(nextTide.time).getTime();
      const currentTime = now.getTime();

      const timeElapsed = currentTime - lastTideTime;
      const totalCycleTime = nextTideTime - lastTideTime;

      if (totalCycleTime > 0) {
        const percentage = Math.round((timeElapsed / totalCycleTime) * 100);
        const cycleType = (lastTide.type === 'L' && nextTide.type === 'H') ? 'Rising' : 'Falling';
        currentTideCycle = `${percentage}% ${cycleType}`;
      } else {
        currentTideCycle = `At ${lastTide.type === 'H' ? 'High' : 'Low'} Tide`;
      }

      // Populate tide schedule: last, current, next, and one more after next
      tideSchedule.push(lastTide);
      tideSchedule.push({
        time: now.toISOString(),
        value: -999, // Sentinel value for current time
        type: lastTide.type === 'L' && nextTide.type === 'H' ? 'R' : 'F', // R for rising, F for falling
      });
      tideSchedule.push(nextTide);
      
      const nextTideIndex = predictions.findIndex(p => p.time === nextTide?.time);
      if (nextTideIndex !== -1 && predictions[nextTideIndex + 1]) {
        tideSchedule.push(predictions[nextTideIndex + 1]);
      }

    } else if (lastTide) {
        currentTideCycle = `At ${lastTide.type === 'H' ? 'High' : 'Low'} Tide`;
        tideSchedule.push(lastTide);
    } else if (nextTide) {
        currentTideCycle = `Approaching ${nextTide.type === 'H' ? 'High' : 'Low'} Tide`;
        tideSchedule.push(nextTide);
    }

    return {
      retrievedAt: new Date().toISOString(),
      currentTideCycle,
      tideSchedule,
    };
  } catch (error) {
    console.error("Error fetching tide data:", error);
    return null;
  }
}
