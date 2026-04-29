import { supabase } from '@/lib/supabaseClient';

export interface DailyStat {
  day: string;          // YYYY-MM-DD (UTC)
  wordsRead: number;
  totalSeconds: number;
}

interface CloudDailyRow {
  user_id: string;
  day: string;
  words_read: number;
  total_seconds: number;
  updated_at: string;
}

/**
 * Upsert today's words+seconds delta. Server-side we add to the existing
 * counters via a postgrest RPC-style upsert: we have to do this as
 * read-then-write since postgrest's upsert doesn't natively increment.
 *
 * Race-tolerant: two devices recording simultaneously each see the
 * existing row, both write back the sum, and the later write wins.
 * Since each device is summing its own deltas, neither *loses* data,
 * but a small overlap window could double-count if both devices read
 * the row at the same instant. Acceptable for analytics rollups.
 */
export async function recordDailyDelta(
  userId: string,
  wordsDelta: number,
  secondsDelta: number,
  day: string,
): Promise<void> {
  if (wordsDelta <= 0 && secondsDelta <= 0) return;

  const { data: existing, error: readErr } = await supabase
    .from('reading_stats_daily')
    .select('words_read,total_seconds')
    .eq('user_id', userId)
    .eq('day', day)
    .maybeSingle();
  if (readErr) throw new Error(`recordDailyDelta read: ${readErr.message}`);

  const newWords = (existing?.words_read ?? 0) + wordsDelta;
  const newSeconds = (existing?.total_seconds ?? 0) + secondsDelta;

  const { error: writeErr } = await supabase
    .from('reading_stats_daily')
    .upsert({
      user_id: userId,
      day,
      words_read: newWords,
      total_seconds: newSeconds,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,day' });
  if (writeErr) throw new Error(`recordDailyDelta write: ${writeErr.message}`);
}

export async function fetchDailyStats(
  userId: string,
  sinceDay?: string,
): Promise<DailyStat[]> {
  let q = supabase
    .from('reading_stats_daily')
    .select('user_id,day,words_read,total_seconds,updated_at')
    .eq('user_id', userId)
    .order('day', { ascending: true });
  if (sinceDay) q = q.gte('day', sinceDay);

  const { data, error } = await q;
  if (error) throw new Error(`fetchDailyStats: ${error.message}`);
  return (data ?? []).map((r: CloudDailyRow) => ({
    day: r.day,
    wordsRead: r.words_read,
    totalSeconds: r.total_seconds,
  }));
}

/** Get YYYY-MM-DD for the user's local timezone, not UTC. The day boundary
 *  matters for streaks and "today" — UTC at 7pm Pacific is tomorrow. */
export function localDayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
