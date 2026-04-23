import { useEffect, useRef } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import type { WordToken } from '@/types/rsvp';

interface Props {
  tokens: WordToken[];
  currentIndex: number;
  onWordClick: (index: number) => void;
}

const CONTEXT_COLORS = {
  dialogue: '#60a5fa',
  unfamiliar: '#fbbf24',
};

export default function PageView({ tokens, currentIndex, onWordClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLSpanElement>(null);
  const { fontFamily } = useSettingsStore(s => s.settings);

  // Auto-scroll to keep the current word visible
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIndex]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-6 py-8 max-w-3xl mx-auto w-full leading-relaxed cursor-default"
      style={{ fontFamily, fontSize: '1.1rem', color: 'var(--text-primary)' }}
    >
      {tokens.map((token, i) => {
        const isCurrent = i === currentIndex;
        const isPast = i < currentIndex;

        let color = 'inherit';
        if (token.context.isDialogue) color = CONTEXT_COLORS.dialogue;
        if (token.context.isUnfamiliar) color = CONTEXT_COLORS.unfamiliar;

        return (
          <span key={i}>
            {token.context.isParagraphStart && i > 0 && (
              <>
                <br />
                <br />
              </>
            )}
            <span
              ref={isCurrent ? activeRef : undefined}
              onClick={() => onWordClick(i)}
              className="cursor-pointer rounded px-0.5 transition-colors"
              style={{
                backgroundColor: isCurrent ? 'var(--accent)' : 'transparent',
                color: isCurrent ? '#fff' : color,
                opacity: isPast ? 0.4 : 1,
              }}
            >
              {token.word}
            </span>{' '}
          </span>
        );
      })}
    </div>
  );
}
