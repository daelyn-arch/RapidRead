import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

/**
 * Supabase redirects OAuth back to this route. In the success path the JS
 * client auto-detects the session (via detectSessionInUrl) and we just route
 * the user to /app or the requested `next`. In the error path the URL has
 * ?error=...&error_description=... (or in the hash fragment) — we bubble that
 * up to the login page so it can render a friendly message.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Signing you in…');

  useEffect(() => {
    function extractError(): { code: string; description: string | null } | null {
      const byHash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const byQuery = new URLSearchParams(window.location.search);
      const pick = (key: string) => byQuery.get(key) ?? byHash.get(key);
      const code = pick('error') ?? pick('error_code');
      if (!code) return null;
      return { code, description: pick('error_description') };
    }

    function readNextParam(): string {
      const byQuery = new URLSearchParams(window.location.search);
      return byQuery.get('next') ?? '/app';
    }

    const err = extractError();
    if (err) {
      const detail = err.description ?? err.code;
      setStatus('Sign-in failed. Redirecting…');
      navigate(`/login?oauth_error=${encodeURIComponent(detail)}`, { replace: true });
      return;
    }

    // Give Supabase's detectSessionInUrl a tick to process the hash.
    const timer = window.setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      const next = readNextParam();
      if (data.session) {
        // Append ?verified=1 when landing on /app so the library can show a
        // one-time "Email confirmed — welcome!" banner.
        const sep = next.includes('?') ? '&' : '?';
        navigate(`${next}${sep}verified=1`, { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }, 100);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center">
      <p style={{ color: 'var(--text-secondary)' }}>{status}</p>
    </div>
  );
}
