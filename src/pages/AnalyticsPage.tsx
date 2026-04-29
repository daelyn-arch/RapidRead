import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { useSettingsStore } from '@/store/settingsStore';
import { fetchDailyStats, localDayKey, type DailyStat } from '@/sync/statsSync';

type Period = 'day' | 'week' | 'month' | 'year' | 'all';

interface Bucket {
  label: string;
  start: string; // YYYY-MM-DD inclusive
  wordsRead: number;
  totalSeconds: number;
}

interface Rank {
  name: string;
  range: string;
  color: string;
}

/** Rank thresholds based on average adult silent reading speeds.
 *  Source: most reading-speed research (Carver, Rayner) puts the
 *  population mean at 200-250 wpm, college students at 250-300, and
 *  the long tail of trained speed-readers at 600+. We bias slightly
 *  generous since RSVP eliminates regression and saccades, which is
 *  why even base 300 feels effortless once you're used to it. */
const RANKS: { min: number; rank: Rank }[] = [
  { min: 0,   rank: { name: 'Reader',         range: 'under 200 wpm',  color: '#94a3b8' } },
  { min: 200, rank: { name: 'Average Reader', range: '200-249 wpm',    color: '#60a5fa' } },
  { min: 250, rank: { name: 'Above Average',  range: '250-349 wpm',    color: '#34d399' } },
  { min: 350, rank: { name: 'Fast Reader',    range: '350-499 wpm',    color: '#fbbf24' } },
  { min: 500, rank: { name: 'Speed Reader',   range: '500-799 wpm',    color: '#fb923c' } },
  { min: 800, rank: { name: 'Elite Reader',   range: '800+ wpm',       color: '#ec4899' } },
];

function rankFor(wpm: number): Rank {
  let winner = RANKS[0].rank;
  for (const { min, rank } of RANKS) {
    if (wpm >= min) winner = rank;
  }
  return winner;
}

function formatHours(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  const mins = totalSeconds / 60;
  if (mins < 60) return `${Math.round(mins)}m`;
  const hours = Math.floor(mins / 60);
  const m = Math.round(mins - hours * 60);
  return m > 0 ? `${hours}h ${m}m` : `${hours}h`;
}

function dayString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Bucket the daily stats for the chosen period. The chart shows each
 *  bucket as a bar; labels match the period (hour-of-day, day-of-week,
 *  day-of-month, month-of-year, year). */
function bucketize(period: Period, daily: DailyStat[]): Bucket[] {
  const today = new Date();
  const lookup = new Map(daily.map((s) => [s.day, s] as const));

  switch (period) {
    case 'day': {
      // The "day" period collapses to a single day's total. Use a one-bar
      // chart so the page layout stays consistent with the others.
      const k = dayString(today);
      const s = lookup.get(k);
      return [{
        label: 'Today',
        start: k,
        wordsRead: s?.wordsRead ?? 0,
        totalSeconds: s?.totalSeconds ?? 0,
      }];
    }
    case 'week': {
      // Last 7 days, oldest → today.
      const out: Bucket[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const k = dayString(d);
        const s = lookup.get(k);
        out.push({
          label: d.toLocaleDateString(undefined, { weekday: 'short' }),
          start: k,
          wordsRead: s?.wordsRead ?? 0,
          totalSeconds: s?.totalSeconds ?? 0,
        });
      }
      return out;
    }
    case 'month': {
      // Last 30 days bucketed by day, label every 5th to avoid crowding.
      const out: Bucket[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const k = dayString(d);
        const s = lookup.get(k);
        const showLabel = i % 5 === 0 || i === 0;
        out.push({
          label: showLabel ? String(d.getDate()) : '',
          start: k,
          wordsRead: s?.wordsRead ?? 0,
          totalSeconds: s?.totalSeconds ?? 0,
        });
      }
      return out;
    }
    case 'year': {
      // Last 12 calendar months, sum days within each month.
      const out: Bucket[] = [];
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
        let words = 0, secs = 0;
        for (const s of daily) {
          if (s.day >= dayString(monthStart) && s.day <= dayString(monthEnd)) {
            words += s.wordsRead;
            secs += s.totalSeconds;
          }
        }
        out.push({
          label: monthStart.toLocaleDateString(undefined, { month: 'short' }),
          start: dayString(monthStart),
          wordsRead: words,
          totalSeconds: secs,
        });
      }
      return out;
    }
    case 'all': {
      // Group by year. Pad with current year if no data so the chart isn't empty.
      const byYear = new Map<string, { words: number; secs: number }>();
      for (const s of daily) {
        const y = s.day.slice(0, 4);
        const cur = byYear.get(y) ?? { words: 0, secs: 0 };
        byYear.set(y, { words: cur.words + s.wordsRead, secs: cur.secs + s.totalSeconds });
      }
      const years = [...byYear.keys()].sort();
      if (years.length === 0) {
        const y = String(today.getFullYear());
        return [{ label: y, start: `${y}-01-01`, wordsRead: 0, totalSeconds: 0 }];
      }
      return years.map((y) => ({
        label: y,
        start: `${y}-01-01`,
        wordsRead: byYear.get(y)!.words,
        totalSeconds: byYear.get(y)!.secs,
      }));
    }
  }
}

function BarChart({ buckets }: { buckets: Bucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.wordsRead));
  return (
    <div className="flex items-end gap-1 h-40 px-2 pb-2">
      {buckets.map((b, i) => {
        const heightPct = (b.wordsRead / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center min-w-0 gap-1">
            <div className="text-[10px] tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {b.wordsRead > 0 ? b.wordsRead.toLocaleString() : ''}
            </div>
            <div
              className="w-full rounded-t-sm transition-all"
              title={`${b.label}: ${b.wordsRead.toLocaleString()} words · ${formatHours(b.totalSeconds)}`}
              style={{
                height: `${Math.max(2, heightPct)}%`,
                background: b.wordsRead > 0 ? 'var(--accent)' : 'var(--bg-tertiary)',
                opacity: b.wordsRead > 0 ? 1 : 0.4,
              }}
            />
            <div className="text-[10px] truncate w-full text-center" style={{ color: 'var(--text-secondary)' }}>
              {b.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
      <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1 tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{sub}</div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const theme = useSettingsStore((s) => s.settings.theme);
  const baseWpm = useSettingsStore((s) => s.getActiveProfile().baseWpm);
  const [period, setPeriod] = useState<Period>('week');
  const [daily, setDaily] = useState<DailyStat[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/login?next=/app/analytics', { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchDailyStats(user.id)
      .then(setDaily)
      .catch((e) => setError(e.message ?? String(e)));
  }, [user]);

  const buckets = useMemo(() => (daily ? bucketize(period, daily) : []), [daily, period]);
  const totals = useMemo(() => {
    if (!daily) return { words: 0, secs: 0 };
    return daily.reduce(
      (acc, s) => ({ words: acc.words + s.wordsRead, secs: acc.secs + s.totalSeconds }),
      { words: 0, secs: 0 },
    );
  }, [daily]);
  const periodTotals = useMemo(
    () => buckets.reduce(
      (acc, b) => ({ words: acc.words + b.wordsRead, secs: acc.secs + b.totalSeconds }),
      { words: 0, secs: 0 },
    ),
    [buckets],
  );
  // Lifetime average WPM from cumulative cloud data, falling back to
  // the user's current base WPM when they haven't read enough yet to
  // estimate (avoids ranking new users at 0 wpm).
  const measuredWpm = totals.secs > 30
    ? Math.round((totals.words / totals.secs) * 60)
    : baseWpm;
  const rank = rankFor(measuredWpm);

  if (loading || !user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        data-theme={theme}
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      data-theme={theme}
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <header
        className="safe-top flex items-center gap-3 px-6 py-4 border-b"
        style={{ borderColor: 'var(--bg-tertiary)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 hover:opacity-80"
          style={{ color: 'var(--accent)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Reading analytics
        </h1>
      </header>

      <main className="flex-1 p-6 max-w-3xl mx-auto w-full space-y-6">
        {error && (
          <div className="rounded-lg p-3 text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>
            Couldn't load stats: {error}
          </div>
        )}

        {/* Stat summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Words"
            value={totals.words.toLocaleString()}
            sub="all time"
          />
          <StatCard
            label="Time"
            value={formatHours(totals.secs)}
            sub="all time"
          />
          <StatCard
            label="Avg speed"
            value={`${measuredWpm} wpm`}
            sub={totals.secs > 30 ? 'measured' : 'estimated'}
          />
          <StatCard
            label="Rank"
            value={rank.name}
            sub={rank.range}
          />
        </div>

        {/* Rank explainer */}
        <section
          className="rounded-xl p-4"
          style={{ background: 'var(--bg-secondary)' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ background: rank.color }}
            />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {rank.name}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {rank.range}
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Adult silent-reading averages typically fall around 200-250 wpm. RapidRead users tend to settle 30-50% faster than that within their first few books.
          </p>
        </section>

        {/* Period toggle */}
        <div
          className="flex rounded-lg overflow-hidden border"
          style={{ borderColor: 'var(--bg-tertiary)' }}
        >
          {(['day', 'week', 'month', 'year', 'all'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="flex-1 py-2 text-xs font-medium capitalize transition-colors"
              style={{
                background: period === p ? 'var(--accent)' : 'transparent',
                color: period === p ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {p === 'all' ? 'All time' : p}
            </button>
          ))}
        </div>

        {/* Period totals */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label={period === 'day' ? 'Today' : period === 'all' ? 'All time' : `Last ${period}`}
            value={periodTotals.words.toLocaleString()}
            sub="words"
          />
          <StatCard
            label="Reading time"
            value={formatHours(periodTotals.secs)}
            sub={period === 'day' ? 'today' : period === 'all' ? 'all time' : `this ${period}`}
          />
        </div>

        {/* Chart */}
        <section
          className="rounded-xl p-4"
          style={{ background: 'var(--bg-secondary)' }}
        >
          {daily === null ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              Loading…
            </p>
          ) : daily.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              No reading recorded yet. Start a book and check back tomorrow.
            </p>
          ) : (
            <BarChart buckets={buckets} />
          )}
        </section>

        {/* Today's reading hint */}
        {daily && (() => {
          const todaysData = daily.find((d) => d.day === localDayKey());
          if (!todaysData || todaysData.wordsRead === 0) {
            return (
              <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                You haven't read anything today.
              </p>
            );
          }
          return (
            <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
              Today: {todaysData.wordsRead.toLocaleString()} words · {formatHours(todaysData.totalSeconds)}
            </p>
          );
        })()}
      </main>
    </div>
  );
}
