import { useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import { useIsPro } from './useIsPro';
import { startCheckout } from './startCheckout';

const DISMISS_KEY = 'rapidread-upgrade-banner-dismissed';

function isDismissedThisSession(): boolean {
  try { return sessionStorage.getItem(DISMISS_KEY) === '1'; }
  catch { return false; }
}

function markDismissed() {
  try { sessionStorage.setItem(DISMISS_KEY, '1'); }
  catch { /* ignore */ }
}

/**
 * Upsell shown on the Library page for signed-in Free users. Dismissible
 * per-session via sessionStorage so a user who closes it doesn't see it
 * again on the next page view, but will see it again next browser session
 * (they probably meant "not now", not "never").
 */
export default function UpgradeBanner() {
  const { session } = useAuth();
  const isPro = useIsPro();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(() => isDismissedThisSession());

  // Hide for: signed-out users (they see CTAs on landing) and Pro users.
  if (!session || isPro || dismissed) return null;

  async function onUpgrade() {
    setError(null);
    setBusy(true);
    const { error, url } = await startCheckout('monthly');
    if (url) { window.location.assign(url); return; }
    setError(error);
    setBusy(false);
  }

  function onDismiss() {
    markDismissed();
    setDismissed(true);
  }

  return (
    <div
      className="mb-4 rounded-xl p-4 flex items-start gap-3"
      style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,42,26,0.08))',
        border: '1px solid var(--accent)',
        color: 'var(--text-primary)',
      }}
    >
      <div
        className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center"
        style={{ background: 'var(--accent)', color: 'white' }}
        aria-hidden
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c2.5-2.7 3.8-6.2 4-9-0.2-2.8-1.5-6.3-4-9m0 18c-2.5-2.7-3.8-6.2-4-9 0.2-2.8 1.5-6.3 4-9" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">
          Sync your library across every device
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          RapidRead Pro keeps your books, progress, and bookmarks in sync on your phone, tablet, and laptop. $5/month or $45/year. Cancel anytime.
        </p>
        {error && (
          <p className="text-xs mt-2" style={{ color: '#fca5a5' }}>{error}</p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onUpgrade}
            disabled={busy}
            className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {busy ? 'Redirecting…' : 'Upgrade to Pro'}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md px-3 py-2 text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Not now
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 p-1 rounded hover:opacity-80"
        style={{ color: 'var(--text-secondary)' }}
        aria-label="Dismiss"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
