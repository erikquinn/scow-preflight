import { getWeatherData, WeatherData } from "./weather";
import { getTideData, TideData } from "./tides";

export interface ConditionsSnapshot {
  // Bumped each time anything changes; used by SSE clients to dedupe.
  version: number;
  fetchedAt: string; // when the server fetched upstream
  weather: WeatherData | null;
  tide: TideData | null;
}

type Listener = (snap: ConditionsSnapshot) => void;

// Refetch upstream at most this often per cache hit. NWS observations come
// hourly, gridded forecast every 1–6h; 60s is plenty fresh while keeping
// the server quiet.
const CACHE_TTL_MS = 60 * 1000;

// Background poll cadence while at least one SSE subscriber is connected.
const POLL_INTERVAL_MS = 60 * 1000;

// Hard upper bound on a single upstream fetch round-trip. Prevents a hung
// NWS call from blocking the cache forever.
const FETCH_TIMEOUT_MS = 15 * 1000;

interface CacheState {
  snapshot: ConditionsSnapshot | null;
  fetchedAtMs: number;
  inflight: Promise<ConditionsSnapshot> | null;
  listeners: Set<Listener>;
  pollTimer: ReturnType<typeof setInterval> | null;
  version: number;
}

// Stash the cache on `globalThis` so Next's dev hot-reload of this module
// does not produce parallel caches. Module identity is otherwise stable in
// production.
const GLOBAL_KEY = Symbol.for("scow-preflight.weather-cache");
type Global = typeof globalThis & { [GLOBAL_KEY]?: CacheState };
const g = globalThis as Global;

const state: CacheState = g[GLOBAL_KEY] ?? {
  snapshot: null,
  fetchedAtMs: 0,
  inflight: null,
  listeners: new Set(),
  pollTimer: null,
  version: 0,
};
g[GLOBAL_KEY] = state;

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("upstream fetch timed out")), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });

// Detect whether two snapshots represent the same underlying NWS/NOAA data.
// We key off the upstream-provided timestamps so a re-fetch that returns
// identical data doesn't spam SSE clients.
const isSameData = (a: ConditionsSnapshot | null, b: ConditionsSnapshot | null): boolean => {
  if (!a || !b) return a === b;
  return (
    a.weather?.observationTime === b.weather?.observationTime &&
    a.weather?.forecastGeneratedAt === b.weather?.forecastGeneratedAt &&
    a.tide?.retrievedAt === b.tide?.retrievedAt &&
    // Tide doesn't expose an upstream "generated at"; compare schedule shape.
    (a.tide?.tideSchedule.length ?? 0) === (b.tide?.tideSchedule.length ?? 0) &&
    a.tide?.currentTideCycle === b.tide?.currentTideCycle
  );
};

const broadcast = (snap: ConditionsSnapshot) => {
  for (const l of state.listeners) {
    try { l(snap); } catch (err) { console.error("weather-cache listener error", err); }
  }
};

const doRefresh = async (): Promise<ConditionsSnapshot> => {
  const [weather, tide] = await Promise.all([
    withTimeout(getWeatherData(), FETCH_TIMEOUT_MS).catch((e) => {
      console.error("weather-cache: weather fetch failed", e);
      return null;
    }),
    withTimeout(getTideData(), FETCH_TIMEOUT_MS).catch((e) => {
      console.error("weather-cache: tide fetch failed", e);
      return null;
    }),
  ]);

  const next: ConditionsSnapshot = {
    version: state.version + 1,
    fetchedAt: new Date().toISOString(),
    weather,
    tide,
  };

  const changed = !isSameData(state.snapshot, next);
  if (changed) {
    state.version = next.version;
    state.snapshot = next;
  } else if (state.snapshot) {
    // Same upstream data; just update fetchedAt without changing version
    // (so we don't wake every SSE client for a no-op refresh) but still
    // refresh the cache freshness window.
    state.snapshot = { ...state.snapshot, fetchedAt: next.fetchedAt };
  } else {
    state.snapshot = next;
    state.version = next.version;
  }
  state.fetchedAtMs = Date.now();

  if (changed) broadcast(state.snapshot);
  return state.snapshot;
};

const refresh = (): Promise<ConditionsSnapshot> => {
  if (state.inflight) return state.inflight;
  state.inflight = doRefresh().finally(() => { state.inflight = null; });
  return state.inflight;
};

/**
 * Return a snapshot, refreshing upstream only if the cache is older than
 * `maxAgeMs` (or empty). Concurrent callers share a single in-flight fetch.
 */
export const getSnapshot = async (maxAgeMs = CACHE_TTL_MS): Promise<ConditionsSnapshot> => {
  const age = Date.now() - state.fetchedAtMs;
  if (state.snapshot && age < maxAgeMs) return state.snapshot;
  return refresh();
};

/**
 * Force an upstream fetch regardless of cache age. Still deduped against
 * any in-flight refresh.
 */
export const forceRefresh = (): Promise<ConditionsSnapshot> => refresh();

const startPolling = () => {
  if (state.pollTimer) return;
  state.pollTimer = setInterval(() => {
    // Fire-and-forget; errors are already logged inside doRefresh.
    refresh().catch(() => {});
  }, POLL_INTERVAL_MS);
  // Don't block Node from exiting just because of our timer.
  if (typeof state.pollTimer === "object" && "unref" in state.pollTimer) {
    (state.pollTimer as NodeJS.Timeout).unref();
  }
};

const stopPolling = () => {
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
};

/**
 * Register a listener that is invoked whenever the snapshot meaningfully
 * changes. Returns an unsubscribe function. Polling runs only while at
 * least one subscriber is active.
 */
export const subscribe = (listener: Listener): (() => void) => {
  state.listeners.add(listener);
  if (state.listeners.size === 1) startPolling();
  return () => {
    state.listeners.delete(listener);
    if (state.listeners.size === 0) stopPolling();
  };
};
