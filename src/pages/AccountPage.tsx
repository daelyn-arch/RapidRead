import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { useIsPro } from '@/billing/useIsPro';
import UpgradeButton from '@/billing/UpgradeButton';
import ManageBillingButton from '@/billing/ManageBillingButton';

export default function AccountPage() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const isPro = useIsPro();
  const navigate = useNavigate();
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
      <div className="min-h-[100dvh] flex items-center justify-center">
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] p-6 safe-top">
      <div className="max-w-md mx-auto space-y-6" style={{ color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between">
          <Link to="/app" className="text-sm underline" style={{ color: 'var(--accent)' }}>← Back</Link>
          <button
            onClick={async () => { await signOut(); navigate('/'); }}
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Sign out
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-semibold">Account</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
        </div>

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
              className="rounded-full px-2 py-0.5 text-xs"
              style={{
                background: isPro ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: isPro ? 'white' : 'var(--text-secondary)',
              }}
            >
              {isPro ? 'PRO' : 'FREE'}
            </span>
          </div>

          <div className="mt-4">
            {isPro ? <ManageBillingButton /> : <UpgradeButton plan="monthly" />}
          </div>

          {justUpgraded && !isPro && (
            <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Finalizing your subscription… this usually takes a few seconds.
            </p>
          )}
        </div>

        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Need help or a data export? Email{' '}
          <a className="underline" href="mailto:support@rapidread.app">support@rapidread.app</a>.
        </div>
      </div>
    </div>
  );
}
