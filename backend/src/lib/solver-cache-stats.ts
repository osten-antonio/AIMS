interface TimingEntry {
  question: string;
  durationMs: number;
  timestamp: number;
}

interface CacheStats {
  hitCount: number;
  missCount: number;
  hitTimesMs: number[];
  missTimesMs: number[];
  hitTimings: TimingEntry[];
  missTimings: TimingEntry[];
}

const stats: CacheStats = {
  hitCount: 0,
  missCount: 0,
  hitTimesMs: [],
  missTimesMs: [],
  hitTimings: [],
  missTimings: [],
};

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function p50(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? (sorted[mid] ?? 0)
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

function p95(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[idx] ?? 0;
}

function p99(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.max(0, Math.ceil(sorted.length * 0.99) - 1);
  return sorted[idx] ?? 0;
}

export function recordCacheHit(question: string, durationMs: number) {
  stats.hitCount++;
  stats.hitTimesMs.push(durationMs);
  stats.hitTimings.push({ question, durationMs, timestamp: Date.now() });
}

export function recordCacheMiss(question: string, durationMs: number) {
  stats.missCount++;
  stats.missTimesMs.push(durationMs);
  stats.missTimings.push({ question, durationMs, timestamp: Date.now() });
}

export function getCacheStats() {
  const total = stats.hitCount + stats.missCount;
  return {
    hitCount: stats.hitCount,
    missCount: stats.missCount,
    totalRequests: total,
    hitRate: total > 0 ? ((stats.hitCount / total) * 100).toFixed(2) + "%" : "0%",
    avgHitTimeMs: Math.round(avg(stats.hitTimesMs) * 100) / 100,
    avgMissTimeMs: Math.round(avg(stats.missTimesMs) * 100) / 100,
    p50HitTimeMs: p50(stats.hitTimesMs),
    p95HitTimeMs: p95(stats.hitTimesMs),
    p99HitTimeMs: p99(stats.hitTimesMs),
    p50MissTimeMs: p50(stats.missTimesMs),
    p95MissTimeMs: p95(stats.missTimesMs),
    p99MissTimeMs: p99(stats.missTimesMs),
    speedupFactor: avg(stats.missTimesMs) > 0
      ? Math.round((avg(stats.missTimesMs) / avg(stats.hitTimesMs)) * 100) / 100
      : 0,
    recentHits: stats.hitTimings.slice(-50),
    recentMisses: stats.missTimings.slice(-50),
  };
}

export function resetCacheStats() {
  stats.hitCount = 0;
  stats.missCount = 0;
  stats.hitTimesMs = [];
  stats.missTimesMs = [];
  stats.hitTimings = [];
  stats.missTimings = [];
}

export default { recordCacheHit, recordCacheMiss, getCacheStats, resetCacheStats };
