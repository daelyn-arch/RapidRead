import { useMemo } from 'react';
import type { DialogueBlock } from '@/engine/dialogueBlocks';
import type { WordToken } from '@/types/rsvp';
import { useSettingsStore } from '@/store/settingsStore';

interface Props {
  tokens: WordToken[];
  block: DialogueBlock;
  currentIndex: number;
}

/**
 * Karaoke-style dialogue display. Instead of showing one word at a time,
 * render the full dialogue block as prose with the current word highlighted.
 * The playback controller drives `currentIndex` at the dialogue WPM from
 * the user's speed rules — no new timers needed here.
 */
export default function DialogueKaraoke({ tokens, block, currentIndex }: Props) {
  const { fontSize, dialogueColor, orpColor, showORP } = useSettingsStore(s => s.settings);

  const blockTokens = useMemo(
    () => tokens.slice(block.startIndex, block.endIndex + 1),
    [tokens, block.startIndex, block.endIndex],
  );

  // Scale down slightly from RSVP size so a block fits. Floor at 1.25rem.
  const fs = Math.max(1.25, fontSize * 0.58);

  return (
    <div
      data-testid="dialogue-karaoke"
      className="flex items-center justify-center flex-1 no-select w-full"
      aria-live="polite"
    >
      <div
        className="max-w-3xl px-6 text-center leading-relaxed"
        style={{
          fontSize: `${fs}rem`,
          fontFamily: 'var(--reading-font-family, inherit)',
          color: 'var(--text-primary)',
        }}
      >
        {blockTokens.map((t, i) => {
          const absoluteIndex = block.startIndex + i;
          const isCurrent = absoluteIndex === currentIndex;
          const isRead = absoluteIndex < currentIndex;
          // Determine per-word color: dialogue gets the dialogue color,
          // the active word pops to the ORP/accent red.
          let color: string;
          if (isCurrent) color = showORP ? orpColor : dialogueColor;
          else color = dialogueColor;

          const opacity = isCurrent ? 1 : isRead ? 0.55 : 0.85;
          const weight = isCurrent ? 700 : 400;
          const scale = isCurrent ? 1.08 : 1;
          const spacing = i === 0 ? '' : ' ';

          return (
            <span
              key={absoluteIndex}
              style={{
                color,
                opacity,
                fontWeight: weight,
                display: 'inline-block',
                transform: `scale(${scale})`,
                transition: 'color 80ms ease-out, opacity 80ms ease-out, transform 80ms ease-out, font-weight 80ms ease-out',
                margin: '0 1px',
              }}
            >
              {spacing}{t.word}
            </span>
          );
        })}
      </div>
    </div>
  );
}
