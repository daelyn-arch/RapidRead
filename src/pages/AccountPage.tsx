import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { useSettingsStore } from '@/store/settingsStore';
import { useIsPro } from '@/billing/useIsPro';
import UpgradeButton from '@/billing/UpgradeButton';
import ManageBillingButton from '@/billing/ManageBillingButton';

export default function AccountPage() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const isPro = useIsPro();
  const navigate = useNavigate();
  const theme = useSettingsStore(s => s.settings.theme);
  const [params] = useSearchParams();
  const justUpgraded = params.get('checkout') === 'success';

  useEffect(() => {
    if (!loading && !user) navigate('/login?next=/app/account', { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (justUpgraded) {
      const t = window.setInterval(() => { refreshProfile(); }, 1500);
      const stop = window.setTimeout(() => window.clearInterval(t), 15_000);
      return () => { window.clearInterval(t); window.clearTimeout(stop); };
    }
  }, [justUpgraded, refreshProfile]);

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
      {/* Header — matches Settings + Reader header patterns */}
      <header
        className="flex items-center gap-3 px-6 py-4 border-b safe-top"
        style={{ borderColor: 'var(--bg-tertiary)' }}
      >
        <button
          onClick={() => navigate('/app')}
          className="flex items-center gap-2 hover:opacity-80"
          style={{ color: 'var(--accent)' }}
          aria-label="Back to library"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="font-medium">Library</span>
        </button>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Account
        </h1>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 max-w-md mx-auto w-full space-y-6" style={{ color: 'var(--text-primary)' }}>
        {/* Identity block */}
        <div>
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
            Signed in as
          </p>
          <p className="text-lg font-medium break-all">{user.email}</p>
        </div>

        {/* Plan card */}
        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--bg-secondary)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Current plan
              </p>
              <p className="text-lg font-semibold mt-0.5">
                {isPro ? 'RapidRead Pro' : 'Free'}
              </p>
              {profile?.plan_status && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Status: {profile.plan_status}
                  {profile.current_period_end && (
                    <> · renews {new Date(profile.current_period_end).toLocaleDateString()}</>
                  )}
                </p>
              )}
            </div>
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
              style={{
                background: isPro ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: isPro ? 'white' : 'var(--text-secondary)',
              }}
            >
              {isPro ? 'PRO' : 'FREE'}
            </span>
          </div>

          <div className="mt-4">
            {isPro
              ? <ManageBillingButton className="w-full rounded-md py-2 font-medium border" />
              : <UpgradeButton plan="monthly" className="w-full rounded-md py-2 font-medium" />}
          </div>

          {justUpgraded && !isPro && (
            <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Finalizing your subscription… this usually takes a few seconds.
            </p>
          )}
        </div>

        {/* Sign out — deliberately bottom, full-width, outlined so it
            doesn't compete with the Upgrade CTA but is clearly a button */}
        <button
          type="button"
          onClick={async () => { await signOut(); navigate('/'); }}
          className="w-full rounded-md py-2 font-medium border transition-opacity hover:opacity-80"
          style={{
            borderColor: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            background: 'transparent',
          }}
        >
          Sign out
        </button>

        {/* Support link */}
        <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
          Need help or a data export? Email{' '}
          <a className="underline" href="mailto:support@rapidread.app">
            support@rapidread.app
          </a>.
        </p>
      </main>
    </div>
  );
}
