import { useNavigate } from 'react-router-dom';
import UpgradeButton from './UpgradeButton';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function PaywallModal({
  open,
  onClose,
  title = 'Upgrade to Pro to sync',
  description = 'Cloud sync keeps your library and reading progress matched across every device. $5/month, cancel anytime.',
}: Props) {
  const navigate = useNavigate();
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl p-6 shadow-xl"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
      >
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>

        <div className="mt-5 space-y-2">
          <UpgradeButton
            plan="monthly"
            className="w-full rounded-md py-2 font-medium"
          >
            Upgrade — $5/month
          </UpgradeButton>
          <button
            type="button"
            onClick={() => navigate('/pricing')}
            className="w-full rounded-md py-2 text-sm underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            See full pricing
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md py-2 text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
