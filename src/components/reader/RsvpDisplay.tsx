import { useSettingsStore } from '@/store/settingsStore';
import { useReaderStore } from '@/store/readerStore';
import { useIsPro } from '@/billing/useIsPro';
import type { WordToken } from '@/types/rsvp';
import type { DialogueBlock } from '@/engine/dialogueBlocks';
import DialogueKaraoke from './DialogueKaraoke';

interface Props {
  token: WordToken | null;
  onTapToggle?: () => void;
}

export default function RsvpDisplay({ token, onTapToggle }: Props) {
  const { fontSize, showORP, orpColor, dialogueColor, unfamiliarColor, fontFamily, karaokeDialogue, fullKaraoke } = useSettingsStore(s => s.settings);
  const tokens = useReaderStore(s => s.tokens);
  const currentTokenIndex = useReaderStore(s => s.currentTokenIndex);
  const dialogueBlockIndex = useReaderStore(s => s.dialogueBlockIndex);
  const allKaraokeBlockIndex = useReaderStore(s => s.allKaraokeBlockIndex);
  const isPro = useIsPro();

  const getWordColor = (t: WordToken): string => {
    if (t.context.isDialogue) return dialogueColor;
    if (t.context.isUnfamiliar) return unfamiliarColor;
    return 'var(--text-primary)';
  };

  if (!token) {
    return (
      <button
        type="button"
        onClick={onTapToggle}
        className="flex items-center justify-center flex-1 cursor-pointer no-select w-full bg-transparent border-0"
        aria-label="Play"
      >
        <span
          className="opacity-30"
          style={{ fontSize: `${fontSize}rem`, fontFamily }}
        >
          Press play to start
        </span>
      </button>
    );
  }

  // Karaoke mode resolution:
  //   - fullKaraoke ON  → every token is rendered as part of a chunk
  //   - karaokeDialogue → only tokens inside dialogue blocks render as chunks
  //   - neither         → classic single-word RSVP
  // Both modes are Pro-gated.
  let activeBlock: DialogueBlock | undefined;
  if (isPro) {
    if (fullKaraoke) {
      activeBlock = allKaraokeBlockIndex.get(currentTokenIndex);
    } else if (karaokeDialogue) {
      activeBlock = dialogueBlockIndex.get(currentTokenIndex);
    }
  }
  if (activeBlock) {
    return (
      <button
        type="button"
        onClick={onTapToggle}
        className="flex items-center justify-center flex-1 no-select w-full bg-transparent border-0 cursor-pointer"
        style={{ caretColor: 'transparent' }}
        aria-label="Toggle play/pause"
      >
        <DialogueKaraoke
          tokens={tokens}
          block={activeBlock}
          currentIndex={currentTokenIndex}
        />
      </button>
    );
  }

  const { word, orpIndex, context } = token;
  const before = word.slice(0, orpIndex);
  const orp = word[orpIndex] || '';
  const after = word.slice(orpIndex + 1);
  const wordColor = getWordColor(token);

  return (
    <button
      type="button"
      onClick={onTapToggle}
      className="flex items-center justify-center flex-1 no-select w-full bg-transparent border-0 cursor-pointer"
      style={{ caretColor: 'transparent' }}
      aria-label="Toggle play/pause"
    >
      <div className="relative w-full max-w-2xl px-4">
        {/* Word display — ORP char pinned to screen center via 3-col grid (1fr | auto | 1fr) */}
        <div
          className="grid whitespace-nowrap"
          style={{
            gridTemplateColumns: '1fr auto 1fr',
            fontSize: `${fontSize}rem`,
            fontFamily,
            caretColor: 'transparent',
          }}
        >
          {/* Before ORP: right-aligned against the ORP column */}
          <span
            className="text-right overflow-hidden"
            style={{ color: wordColor }}
          >
            {before}
          </span>
          {/* ORP character: sits in the auto-sized center column */}
          <span
            style={{
              color: showORP ? orpColor : wordColor,
              fontWeight: showORP ? 700 : 400,
            }}
          >
            {orp}
          </span>
          {/* After ORP: left-aligned past the ORP column */}
          <span
            className="text-left overflow-hidden"
            style={{ color: wordColor }}
          >
            {after}
          </span>
        </div>

        {/* Context indicator dot */}
        {(context.isDialogue || context.isUnfamiliar) && (
          <div
            className="absolute left-1/2 -translate-x-1/2 text-[10px] mt-1"
            style={{ color: wordColor, top: '100%' }}
          >
            {context.isDialogue && context.isUnfamiliar
              ? '● ●'
              : '●'}
          </div>
        )}
      </div>
    </button>
  );
}
