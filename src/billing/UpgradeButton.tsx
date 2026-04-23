import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { supabase } from '@/lib/supabaseClient';

interface Props {
  plan?: 'monthly' | 'yearly';
  className?: string;
  children?: React.ReactNode;
}

export default function UpgradeButton({ plan = 'monthly', className, children }: Props) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!session) {
      navigate(`/signup?next=${encodeURIComponent('/pricing?upgrade=1')}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data: { session: fresh } } = await supabase.auth.getSession();
      const token = fresh?.access_token;
      if (!token) throw new Error('Not signed in.');

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.url) {
        throw new Error(body?.error ?? `Checkout failed (${res.status})`);
      }
      window.location.assign(body.url as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={
          className ??
          'rounded-md px-4 py-2 font-medium disabled:opacity-60'
        }
        style={className ? undefined : { background: 'var(--accent)', color: 'white' }}
      >
        {busy ? 'Redirecting…' : (children ?? 'Upgrade to Pro')}
      </button>
      {error && (
        <p className="mt-2 text-xs" style={{ color: '#fca5a5' }}>{error}</p>
      )}
    </div>
  );
}
