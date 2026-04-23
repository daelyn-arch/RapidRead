import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabaseClient';

type Mode = 'signin' | 'signup';

function translateOAuthError(raw: string | null): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider') || lower.includes('provider_not_enabled')) {
    return 'Google sign-in is not enabled yet. Please use email sign-in for now.';
  }
  if (lower.includes('access_denied') || lower.includes('user cancelled') || lower.includes('user_cancelled')) {
    return 'Google sign-in was cancelled.';
  }
  return raw;
}

export default function LoginPage({ initialMode = 'signin' }: { initialMode?: Mode }) {
  const { signIn, signUp, configured } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const next = params.get('next') ?? '/app';

  // Surface OAuth errors redirected here from the provider (e.g. /login?oauth_error=...)
  useEffect(() => {
    const oauthErr = params.get('oauth_error');
    if (oauthErr) setError(translateOAuthError(decodeURIComponent(oauthErr)));
  }, [params]);

  async function onGoogle() {
    setError(null);
    setGoogleBusy(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      setError(translateOAuthError(error.message));
      setGoogleBusy(false);
      return;
    }
    // Supabase JS redirects the tab itself; nothing to do here on success.
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error } = await fn(email, password);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    navigate(next, { replace: true });
  }

  if (!configured) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <div className="max-w-md text-center" style={{ color: 'var(--text-primary)' }}>
          <h1 className="text-2xl font-semibold mb-2">Auth not configured</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> and restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <div
        className="w-full max-w-sm rounded-xl p-6 shadow-lg"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
      >
        <h1 className="text-2xl font-semibold mb-1">
          {mode === 'signin' ? 'Sign in' : 'Create your account'}
        </h1>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          {mode === 'signin'
            ? 'Welcome back to RapidRead.'
            : 'Sync your library across every device.'}
        </p>

        <button
          type="button"
          onClick={onGoogle}
          disabled={googleBusy || busy}
          className="w-full rounded-md py-2 font-medium border flex items-center justify-center gap-2 disabled:opacity-60 mb-4"
          style={{
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            borderColor: 'var(--bg-tertiary)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62Z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18Z"/>
            <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.94H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.06l3.01-2.34Z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z"/>
          </svg>
          {googleBusy ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-2 mb-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex-1 h-px" style={{ background: 'var(--bg-tertiary)' }} />
          <span>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--bg-tertiary)' }} />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md px-3 py-2 outline-none border"
              style={{
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                borderColor: 'var(--bg-tertiary)',
              }}
            />
          </label>

          <label className="block">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md px-3 py-2 outline-none border"
              style={{
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                borderColor: 'var(--bg-tertiary)',
              }}
            />
          </label>

          {error && (
            <div
              className="text-sm rounded-md px-3 py-2"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#fecaca' }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md py-2 font-medium disabled:opacity-60"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {busy ? '...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-5 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
          {mode === 'signin' ? (
            <>
              New here?{' '}
              <button
                onClick={() => setMode('signup')}
                className="underline"
                style={{ color: 'var(--accent)' }}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setMode('signin')}
                className="underline"
                style={{ color: 'var(--accent)' }}
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <div className="mt-4 text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
          <Link to="/app" className="underline">Continue without an account →</Link>
        </div>
      </div>
    </div>
  );
}
