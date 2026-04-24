import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { startCheckout } from './startCheckout';

interface Props {
  plan?: 'monthly' | 'yearly';
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export default function UpgradeButton({ plan = 'monthly', className, style, children }: Props) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!session) {
      const next = `/pricing?upgrade=1&plan=${plan}`;
      navigate(`/signup?next=${encodeURIComponent(next)}`);
      return;
    }
    setBusy(true);
    setError(null);
    const { error, url } = await startCheckout(plan);
    if (url) {
      window.location.assign(url);
      return;
    }
    setError(error);
    setBusy(false);
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
        style={style ?? (className ? undefined : { background: 'var(--accent)', color: 'white' })}
      >
        {busy ? 'Redirecting…' : (children ?? 'Upgrade to Pro')}
      </button>
      {error && (
        <p className="mt-2 text-xs" style={{ color: '#fca5a5' }}>{error}</p>
      )}
    </div>
  );
}
