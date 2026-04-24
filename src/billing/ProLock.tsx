import { useState, type ReactNode } from 'react';
import { useIsPro } from './useIsPro';
import PaywallModal from './PaywallModal';

interface Props {
  children: ReactNode;
  /** Optional override text shown in the paywall modal. */
  paywallTitle?: string;
  paywallDescription?: string;
  /** Hide the "PRO" badge chip (e.g. when the parent already shows one). */
  hideBadge?: boolean;
}

/**
 * Visual Pro gate for Settings controls. Pro users see children unchanged.
 * Free users see children rendered but pointer-disabled + dimmed, with an
 * overlay that opens the paywall modal on click and a small PRO badge.
 *
 * The runtime behavior is ALREADY gated via useEffectiveProfile — this
 * wrapper only exists to make the Pro boundary obvious in the UI.
 */
export default function ProLock({ children, paywallTitle, paywallDescription, hideBadge }: Props) {
  const isPro = useIsPro();
  const [paywallOpen, setPaywallOpen] = useState(false);

  if (isPro) return <>{children}</>;

  return (
    <>
      <div className="relative">
        {/* Rendered content but non-interactive */}
        <div style={{ opacity: 0.55, pointerEvents: 'none' }}>
          {children}
        </div>
        {/* Transparent clickable overlay covering the whole block */}
        <button
          type="button"
          onClick={() => setPaywallOpen(true)}
          aria-label="Upgrade to Pro to unlock this setting"
          className="absolute inset-0 w-full h-full rounded-lg"
          style={{ background: 'transparent', cursor: 'pointer' }}
        />
        {!hideBadge && (
          <span
            className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full pointer-events-none"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            PRO
          </span>
        )}
      </div>
      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        title={paywallTitle}
        description={paywallDescription}
      />
    </>
  );
}
