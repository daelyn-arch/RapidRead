import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ManageBillingButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not signed in.');

      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.url) {
        throw new Error(body?.error ?? `Portal failed (${res.status})`);
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
          className ?? 'rounded-md px-4 py-2 font-medium disabled:opacity-60 border'
        }
        style={
          className
            ? undefined
            : {
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                borderColor: 'var(--bg-tertiary)',
              }
        }
      >
        {busy ? 'Opening…' : 'Manage billing'}
      </button>
      {error && <p className="mt-2 text-xs" style={{ color: '#fca5a5' }}>{error}</p>}
    </div>
  );
}
