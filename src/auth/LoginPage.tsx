import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './useAuth';

type Mode = 'signin' | 'signup';

export default function LoginPage({ initialMode = 'signin' }: { initialMode?: Mode }) {
  const { signIn, signUp, configured } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const next = params.get('next') ?? '/app';

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
