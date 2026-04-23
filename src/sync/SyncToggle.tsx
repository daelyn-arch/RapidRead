import { useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import { useIsPro } from '@/billing/useIsPro';
import PaywallModal from '@/billing/PaywallModal';
import { useSyncPreference } from './useCloudSync';

/**
 * Drop-in toggle for SettingsPage.
 * - Free users: clicking opens the paywall modal.
 * - Signed-out users: prompts sign-in.
 * - Pro users: flips the preference; useCloudSync() picks it up.
 */
export default function SyncToggle() {
  const { user } = useAuth();
  const isPro = useIsPro();
  const [enabled, setEnabled] = useSyncPreference();
  const [paywallOpen, setPaywallOpen] = useState(false);

  const active = !!user && isPro && enabled;

  function onClick() {
    if (!user) {
      window.location.assign('/login?next=/app/settings');
      return;
    }
    if (!isPro) {
      setPaywallOpen(true);
      return;
    }
    setEnabled(!enabled);
  }

  return (
    <div
      className="rounded-xl p-4 flex items-center justify-between gap-4"
      style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">Cloud sync</span>
          {!isPro && (
            <span
              className="text-[10px] font-semibold uppercase rounded-full px-2 py-0.5"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              Pro
            </span>
          )}
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          {active
            ? 'Library, progress, and bookmarks are syncing across your devices.'
            : isPro
              ? 'Turn on to sync your library across every device.'
              : 'Upgrade to Pro to sync across devices.'}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={active}
        onClick={onClick}
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition"
        style={{ background: active ? 'var(--accent)' : 'var(--bg-tertiary)' }}
      >
        <span
          className="inline-block h-5 w-5 transform rounded-full bg-white transition"
          style={{ transform: active ? 'translateX(22px)' : 'translateX(2px)' }}
        />
      </button>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
}
