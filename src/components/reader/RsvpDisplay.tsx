import { useSettingsStore } from '@/store/settingsStore';
import type { WordToken } from '@/types/rsvp';

interface Props {
  token: WordToken | null;
}

export default function RsvpDisplay({ token }: Props) {
  const { fontSize, showORP, orpColor, fontFamily } = useSettingsStore(s => s.settings);

  if (!token) {
    return (
      <div className="flex items-center justify-center flex-1">
        <span
          className="opacity-30"
          style={{ fontSize: `${fontSize}rem`, fontFamily }}
        >
          Press play to start
        </span>
      </div>
    );
  }

  const { word, orpIndex, context } = token;
  const before = word.slice(0, orpIndex);
  const orp = word[orpIndex] || '';
  const after = word.slice(orpIndex + 1);

  return (
    <div className="flex items-center justify-center flex-1 select-none">
      <div className="relative">
        {/* Context indicator */}
        {context.isDialogue && (
          <div
            className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            dialogue
          </div>
        )}
        {context.isUnfamiliar && (
          <div
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'rgba(251, 191, 36, 0.2)',
              color: '#fbbf24',
            }}
          >
            unfamiliar
          </div>
        )}

        {/* ORP guide line */}
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: '50%',
            backgroundColor: 'var(--bg-tertiary)',
          }}
        />

        {/* Word display */}
        <div
          className="flex items-center"
          style={{ fontSize: `${fontSize}rem`, fontFamily }}
        >
          <span
            className="text-right"
            style={{
              minWidth: '45%',
              color: 'var(--text-primary)',
            }}
          >
            {before}
          </span>
          <span
            style={{
              color: showORP ? orpColor : 'var(--text-primary)',
              fontWeight: showORP ? 700 : 400,
            }}
          >
            {orp}
          </span>
          <span
            className="text-left"
            style={{
              minWidth: '45%',
              color: 'var(--text-primary)',
            }}
          >
            {after}
          </span>
        </div>
      </div>
    </div>
  );
}
