import { useSettingsStore } from '@/store/settingsStore';
import type { WordToken } from '@/types/rsvp';

interface Props {
  token: WordToken | null;
  onTapToggle?: () => void;
}

// Context-based word colors
const CONTEXT_COLORS = {
  dialogue: '#60a5fa',     // blue for dialogue
  unfamiliar: '#fbbf24',   // amber for unfamiliar/fictional words
  normal: 'var(--text-primary)',
};

function getWordColor(token: WordToken): string {
  if (token.context.isDialogue) return CONTEXT_COLORS.dialogue;
  if (token.context.isUnfamiliar) return CONTEXT_COLORS.unfamiliar;
  return CONTEXT_COLORS.normal;
}

export default function RsvpDisplay({ token, onTapToggle }: Props) {
  const { fontSize, showORP, orpColor, fontFamily } = useSettingsStore(s => s.settings);

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
              ? '\u25CF \u25CF'
              : '\u25CF'}
          </div>
        )}
      </div>
    </button>
  );
}
