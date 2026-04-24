import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import UpgradeButton from '@/billing/UpgradeButton';
import { startCheckout } from '@/billing/startCheckout';
import { useIsPro } from '@/billing/useIsPro';
import { useAuth } from '@/auth/useAuth';

const FREE_FEATURES = [
  'Import unlimited EPUB / TXT files',
  'One-word RSVP reader at your chosen base speed',
  'Customize ORP, dialogue, and unfamiliar word colors',
  'Dark and light themes',
  'Works offline (PWA)',
];

const PRO_FEATURES = [
  'Everything in Free',
  'Context-aware speed: dialogue, unfamiliar words, sentence ends, paragraph starts, commas, long words',
  'Adjustable transition rate (smooth ramp back to base speed)',
  'Customize the long-word threshold',
  'Karaoke dialogue mode',
  'Sepia and Parchment themes',
  'Reading fonts: Georgia, Merriweather, Literata, Inter, Atkinson Hyperlegible',
  'Word actions: tap any word for definitions, notes, bookmarks',
  'Bookmarks panel with cross-chapter jump',
  'Custom known-words list',
  'Multiple speed profiles',
  'Cloud sync of library, progress, and bookmarks across every device',
];

export default function PricingPage() {
  const [params, setParams] = useSearchParams();
  const initialPlan = params.get('plan') === 'yearly' ? 'yearly' : 'monthly';
  const [plan, setPlan] = useState<'monthly' | 'yearly'>(initialPlan);
  const [autoError, setAutoError] = useState<string | null>(null);
  const isPro = useIsPro();
  const { session, loading } = useAuth();
  const autoRanFor = useRef<string | null>(null);

  // If a freshly-signed-in user was sent here with ?upgrade=1, immediately
  // kick off the Stripe checkout instead of making them click twice.
  useEffect(() => {
    if (loading) return;
    if (!session || isPro) return;
    if (params.get('upgrade') !== '1') return;
    const marker = session.user.id;
    if (autoRanFor.current === marker) return;
    autoRanFor.current = marker;

    const resumePlan = (params.get('plan') === 'yearly' ? 'yearly' : 'monthly') as 'monthly' | 'yearly';

    (async () => {
      const { error, url } = await startCheckout(resumePlan);
      if (url) {
        window.location.assign(url);
        return;
      }
      setAutoError(error);
      const next = new URLSearchParams(params);
      next.delete('upgrade');
      setParams(next, { replace: true });
    })();
  }, [loading, session, isPro, params, setParams]);

  return (
    <div className="min-h-[100dvh] safe-top" style={{ color: 'var(--text-primary)' }}>
      <header className="flex items-center justify-between max-w-5xl mx-auto px-6 py-5">
        <Link to="/" className="font-semibold tracking-tight">RapidRead</Link>
        <nav className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <Link to="/app" className="hover:underline">App</Link>
          {session
            ? <Link to="/app/account" className="hover:underline">Account</Link>
            : <Link to="/login" className="hover:underline">Sign in</Link>}
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-24">
        {params.get('upgrade') === '1' && !autoError && session && !isPro && (
          <div
            className="rounded-lg p-3 text-sm text-center mt-2"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          >
            Resuming your upgrade…
          </div>
        )}
        {autoError && (
          <div
            className="rounded-lg p-3 text-sm text-center mt-2"
            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}
          >
            Could not resume checkout: {autoError}. Please click Upgrade below to try again.
          </div>
        )}
        <div className="text-center mt-6">
          <h1 className="text-3xl md:text-4xl font-semibold">Pricing</h1>
          <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>
            Free forever on one device. Pro for anywhere, anytime reading.
          </p>

          <div
            role="tablist"
            className="mt-6 inline-flex rounded-full p-1"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {(['monthly', 'yearly'] as const).map((opt) => (
              <button
                key={opt}
                role="tab"
                aria-selected={plan === opt}
                onClick={() => setPlan(opt)}
                className="text-sm rounded-full px-4 py-1.5 font-medium"
                style={{
                  background: plan === opt ? 'var(--accent)' : 'transparent',
                  color: plan === opt ? 'white' : 'var(--text-secondary)',
                }}
              >
                {opt === 'monthly' ? 'Monthly' : 'Yearly · save 33%'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-8">
          <div className="rounded-2xl p-6" style={{ background: 'var(--bg-secondary)' }}>
            <h2 className="text-xl font-semibold">Free</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Everything you need to start reading faster.
            </p>
            <div className="mt-4 text-3xl font-semibold">$0<span className="text-base font-normal" style={{ color: 'var(--text-secondary)' }}>/forever</span></div>
            <ul className="mt-5 space-y-2 text-sm">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span style={{ color: 'var(--accent)' }}>✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/app"
              className="mt-6 inline-block w-full text-center rounded-md px-4 py-2 font-medium border"
              style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)' }}
            >
              Start reading
            </Link>
          </div>

          <div
            className="rounded-2xl p-6 relative border-2"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--accent)' }}
          >
            <span
              className="absolute -top-3 right-4 rounded-full px-3 py-0.5 text-xs font-semibold uppercase"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              Pro
            </span>
            <h2 className="text-xl font-semibold">Pro</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Your library, synced everywhere.
            </p>
            <div className="mt-4 text-3xl font-semibold">
              {plan === 'monthly' ? '$0.99' : '$7.99'}
              <span className="text-base font-normal" style={{ color: 'var(--text-secondary)' }}>
                /{plan === 'monthly' ? 'month' : 'year'}
              </span>
            </div>
            {plan === 'yearly' && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Works out to about $0.67/month.
              </p>
            )}
            <ul className="mt-5 space-y-2 text-sm">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span style={{ color: 'var(--accent)' }}>✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {isPro
                ? (
                  <Link
                    to="/app/account"
                    className="block w-full text-center rounded-md px-4 py-2 font-medium"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  >
                    You’re on Pro — Manage →
                  </Link>
                )
                : (
                  <UpgradeButton
                    plan={plan}
                    className="w-full rounded-md px-4 py-2 font-medium border"
                    style={{ background: 'var(--accent)', borderColor: 'var(--accent)', color: 'white' }}
                  />
                )}
            </div>
          </div>
        </div>

        <p className="text-center text-xs mt-8" style={{ color: 'var(--text-secondary)' }}>
          Secure payments by Stripe. Cancel anytime. 7-day refunds — email{' '}
          <a className="underline" href="mailto:support@rapidread.app">support@rapidread.app</a>.
        </p>
      </main>
    </div>
  );
}
