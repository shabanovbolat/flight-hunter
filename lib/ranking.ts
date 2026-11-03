export interface Rankable {
  score: number;
  total_time_ms: number;
}

/** Score desc, then time asc. Ties on both share a rank (1, 1, 3). */
export function rankRows<T extends Rankable>(rows: T[]): (T & { rank: number })[] {
  const sorted = [...rows].sort((a, b) => b.score - a.score || a.total_time_ms - b.total_time_ms);
  let rank = 0;
  return sorted.map((r, i) => {
    const prev = sorted[i - 1];
    if (!prev || prev.score !== r.score || prev.total_time_ms !== r.total_time_ms) rank = i + 1;
    return { ...r, rank };
  });
}
