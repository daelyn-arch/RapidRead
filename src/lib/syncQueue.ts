type Job = () => Promise<void>;

interface QueueItem {
  key: string;
  job: Job;
  attempts: number;
  scheduledAt: number;
}

/**
 * Small debounced sync queue.
 * - De-dupes by key (latest job wins for the same key)
 * - Exponential backoff on failure
 * - Flushes on online / focus
 *
 * This is intentionally simple. It does NOT persist pending jobs across reloads —
 * the caller should re-enqueue from the latest store snapshot on mount.
 */
class SyncQueue {
  private items = new Map<string, QueueItem>();
  private timer: number | null = null;
  private running = false;
  private online = typeof navigator === 'undefined' ? true : navigator.onLine;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => { this.online = true; this.schedule(0); });
      window.addEventListener('offline', () => { this.online = false; });
      window.addEventListener('focus', () => this.schedule(0));
    }
  }

  enqueue(key: string, job: Job, debounceMs = 0) {
    this.items.set(key, {
      key,
      job,
      attempts: 0,
      scheduledAt: Date.now() + debounceMs,
    });
    this.schedule(debounceMs);
  }

  private schedule(delayMs: number) {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.flush(), Math.max(0, delayMs));
  }

  private async flush() {
    this.timer = null;
    if (this.running) return;
    if (!this.online) return;
    this.running = true;
    try {
      const now = Date.now();
      // Take a snapshot so enqueues during flushing don't mutate iteration.
      const due = [...this.items.values()].filter((it) => it.scheduledAt <= now);
      for (const item of due) {
        // Only drop from the map if still the same reference; if a newer job
        // replaced it, leave the newer one for the next round.
        try {
          await item.job();
          if (this.items.get(item.key) === item) this.items.delete(item.key);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[syncQueue] job failed, will retry', item.key, err);
          item.attempts += 1;
          // exponential backoff, capped at 60s
          const delay = Math.min(60_000, 500 * 2 ** item.attempts);
          item.scheduledAt = Date.now() + delay;
          this.schedule(delay);
        }
      }
      // If there are future-scheduled items left, schedule for the nearest.
      const pending = [...this.items.values()];
      if (pending.length > 0) {
        const nearest = Math.max(0, Math.min(...pending.map((p) => p.scheduledAt)) - Date.now());
        this.schedule(nearest);
      }
    } finally {
      this.running = false;
    }
  }
}

export const syncQueue = new SyncQueue();
