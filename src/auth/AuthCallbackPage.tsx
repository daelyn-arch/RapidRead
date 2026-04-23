import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase JS auto-detects the session from the URL when detectSessionInUrl is true.
    // Wait a tick for the session to persist, then route.
    const timer = window.setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      navigate(data.session ? '/app' : '/login', { replace: true });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center">
      <p style={{ color: 'var(--text-secondary)' }}>Signing you in…</p>
    </div>
  );
}
