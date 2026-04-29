import { useEffect, useRef } from 'react';
import { useReaderStore } from '@/store/readerStore';
import { useAuth } from '@/auth/useAuth';
import { useIsPro } from '@/billing/useIsPro';
import { isSyncPreferenceEnabled } from '@/sync/useCloudSync';
import { syncQueue } from '@/lib/syncQueue';
import { recordDailyDelta, localDayKey } from '@/sync/statsSync';

/**
 * Counts reading time + words advanced and pushes per-day rollups to
 * `reading_stats_daily`. Active when:
 *  - the user is signed in (any tier — analytics is core, not Pro-gated)
 *  - sync preference is enabled
 *
 * Buffer model:
 *  - increments local accumulators on each token advance / second
 *  - flushes to cloud every 30s while playing, plus on pause/unmount
 *  - flushes on page hide/beforeunload via sendBeacon-like best-effort
 *
 * If a flush fails (network etc.) the buffer is preserved for the next
 * attempt — no data loss for transient outages.
 */
const FLUSH_INTERVAL_MS = 30_000;
const PAUSE_GRACE_MS = 2_000;

export function useReadingTracker() {
  const { user } = useAuth();
  const isPro = useIsPro();

  const isPlaying = useReaderStore((s) => s.isPlaying);
  const currentTokenIndex = useReaderStore((s) => s.currentTokenIndex);

  const wordsBuffer = useRef(0);
  const secondsBuffer = useRef(0);
  const lastIndex = useRef<number | null>(null);
  const lastTickAt = useRef<number | null>(null);
  const flushTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const userId = user?.id ?? null;
  // Free users still get tracked locally, but we only push to cloud for
  // signed-in users. (The cloud row only ever exists per-user — there's
  // no anonymous tracking.) Pro is irrelevant; analytics ships to all.
  void isPro;

  function flush() {
    const w = wordsBuffer.current;
    const s = Math.round(secondsBuffer.current);
    if (!userId || (w <= 0 && s <= 0) || !isSyncPreferenceEnabled()) return;
    const day = localDayKey();
    // Snapshot + clear before queueing so a slow flush can't double-count.
    wordsBuffer.current = 0;
    secondsBuffer.current = 0;
    syncQueue.enqueue('stats:' + day, async () => {
      try {
        await recordDailyDelta(userId, w, s, day);
      } catch (e) {
        // Re-buffer on failure so we don't drop the data.
        wordsBuffer.current += w;
        secondsBuffer.current += s;
        // eslint-disable-next-line no-console
        console.warn('[stats] flush failed, re-buffered', e);
      }
    });
  }

  // Word counter — advance the words buffer when the active token index
  // moves forward.
  useEffect(() => {
    if (lastIndex.current === null) {
      lastIndex.current = currentTokenIndex;
      return;
    }
    if (currentTokenIndex > lastIndex.current) {
      wordsBuffer.current += currentTokenIndex - lastIndex.current;
    }
    lastIndex.current = currentTokenIndex;
  }, [currentTokenIndex]);

  // Time counter — only ticks while playing. Uses real elapsed time
  // between ticks to stay accurate even if the timer drifts.
  useEffect(() => {
    if (!isPlaying) {
      // Pause: schedule a flush after a short grace period (lets short
      // pauses for skipping ahead etc. accumulate into the same flush).
      lastTickAt.current = null;
      const t = setTimeout(flush, PAUSE_GRACE_MS);
      return () => clearTimeout(t);
    }
    lastTickAt.current = performance.now();
    const tick = setInterval(() => {
      const now = performance.now();
      if (lastTickAt.current !== null) {
        secondsBuffer.current += (now - lastTickAt.current) / 1000;
      }
      lastTickAt.current = now;
    }, 1000);
    flushTimer.current = setInterval(flush, FLUSH_INTERVAL_MS);
    return () => {
      clearInterval(tick);
      if (flushTimer.current) clearInterval(flushTimer.current);
      // Final flush on pause / unmount.
      if (lastTickAt.current !== null) {
        secondsBuffer.current += (performance.now() - lastTickAt.current) / 1000;
        lastTickAt.current = null;
      }
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // Best-effort flush on tab hide / page unload so a closed tab doesn't
  // lose the last 30s.
  useEffect(() => {
    const onHide = () => {
      if (lastTickAt.current !== null) {
        secondsBuffer.current += (performance.now() - lastTickAt.current) / 1000;
        lastTickAt.current = performance.now();
      }
      flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
