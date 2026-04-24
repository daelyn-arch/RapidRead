import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '@/store/settingsStore';
import SpeedProfileEditor from '@/components/settings/SpeedProfileEditor';
import KnownWordManager from '@/components/settings/KnownWordManager';
import ManageLibrary from '@/components/settings/ManageLibrary';
import ProLock from '@/billing/ProLock';
import type { ReadingFont, Theme } from '@/types/settings';

const THEMES: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'sepia', label: 'Sepia' },
  { value: 'parchment', label: 'Parchment' },
];

const READING_FONTS: { value: ReadingFont; label: string; family: string }[] = [
  { value: 'system', label: 'System default', family: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' },
  { value: 'georgia', label: 'Georgia', family: 'Georgia, "Times New Roman", serif' },
  { value: 'merriweather', label: 'Merriweather', family: '"Merriweather Variable", Merriweather, Georgia, serif' },
  { value: 'literata', label: 'Literata', family: '"Literata Variable", Literata, Georgia, serif' },
  { value: 'inter', label: 'Inter', family: '"Inter Variable", Inter, system-ui, sans-serif' },
  { value: 'atkinson', label: 'Atkinson Hyperlegible', family: '"Atkinson Hyperlegible", system-ui, sans-serif' },
];

const COLOR_PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
];

interface ColorGridProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

function ColorGrid({ label, value, onChange, disabled }: ColorGridProps) {
  return (
    <div
      className="py-3 px-4 rounded-lg"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <div className="text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
        {label}
      </div>
      <div className="grid grid-cols-8 gap-2">
        {COLOR_PALETTE.map(color => {
          const selected = color.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={color}
              onClick={() => onChange(color)}
              aria-label={`Set color to ${color}`}
              className="aspect-square rounded-md transition-transform hover:scale-110"
              style={{
                backgroundColor: color,
                outline: selected ? `2px solid var(--text-primary)` : 'none',
                outlineOffset: selected ? '2px' : '0',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, fontSize, fontFamily, readingFont, showORP, orpColor, dialogueColor, unfamiliarColor, karaokeDialogue, longWordThreshold } = useSettingsStore(s => s.settings);
  const { setTheme, setFontSize, setReadingFont, setOrpColor, setDialogueColor, setUnfamiliarColor, setKaraokeDialogue, setLongWordThreshold } = useSettingsStore();
  const toggleORP = () => useSettingsStore.setState(s => ({ settings: { ...s.settings, showORP: !s.settings.showORP } }));

  return (
    <div
      className="min-h-screen flex flex-col"
      data-theme={theme}
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <header
        className="safe-top flex items-center gap-3 px-6 py-4 border-b"
        style={{ borderColor: 'var(--bg-tertiary)' }}
      >
        <button
          onClick={() => navigate('/app')}
          className="flex items-center gap-2 hover:opacity-80"
          style={{ color: 'var(--accent)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1
          className="text-xl font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          Settings
        </h1>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-8">
        {/* Theme */}
        <div>
          <h3
            className="text-lg font-semibold mb-3"
            style={{ color: 'var(--text-primary)' }}
          >
            Theme
          </h3>
          <div className="flex gap-2">
            {THEMES.map(t => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: theme === t.value ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: theme === t.value ? '#fff' : 'var(--text-primary)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Display */}
        <div>
          <h3
            className="text-lg font-semibold mb-3"
            style={{ color: 'var(--text-primary)' }}
          >
            Display
          </h3>
          <div className="space-y-3">
            <div
              className="py-3 px-4 rounded-lg"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  Font Size
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFontSize(fontSize - 0.5)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  >
                    -
                  </button>
                  <span className="font-mono w-12 text-center text-sm" style={{ color: 'var(--text-primary)' }}>
                    {fontSize.toFixed(1)}rem
                  </span>
                  <button
                    onClick={() => setFontSize(fontSize + 0.5)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  >
                    +
                  </button>
                </div>
              </div>
              <div
                className="mt-3 rounded-md flex items-center justify-center overflow-hidden"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  minHeight: `${fontSize * 2.4}rem`,
                  padding: '0.75rem',
                }}
              >
                <span
                  className="no-select"
                  style={{
                    fontSize: `${fontSize}rem`,
                    fontFamily,
                    color: 'var(--text-primary)',
                    lineHeight: 1.1,
                  }}
                >
                  Read<span style={{ color: showORP ? orpColor : 'var(--text-primary)', fontWeight: showORP ? 700 : 400 }}>i</span>ng
                </span>
              </div>
            </div>

            <div
              className="flex items-center justify-between py-3 px-4 rounded-lg"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                Show ORP Highlight
              </span>
              <button
                onClick={toggleORP}
                className="w-10 h-6 rounded-full relative transition-colors"
                style={{
                  backgroundColor: showORP ? 'var(--accent)' : 'var(--bg-tertiary)',
                }}
              >
                <div
                  className="w-4 h-4 rounded-full bg-white absolute top-1 transition-transform"
                  style={{
                    transform: showORP ? 'translateX(20px)' : 'translateX(4px)',
                  }}
                />
              </button>
            </div>

            <ColorGrid
              label="ORP Highlight Color"
              value={orpColor}
              onChange={setOrpColor}
              disabled={!showORP}
            />
            <ColorGrid
              label="Dialogue Color"
              value={dialogueColor}
              onChange={setDialogueColor}
            />
            <ColorGrid
              label="Unfamiliar Words Color"
              value={unfamiliarColor}
              onChange={setUnfamiliarColor}
            />
          </div>
        </div>

        {/* Reading */}
        <div>
          <h3
            className="text-lg font-semibold mb-3"
            style={{ color: 'var(--text-primary)' }}
          >
            Reading
          </h3>
          <div className="space-y-3">
            <ProLock
              paywallTitle="Karaoke dialogue is a Pro feature"
              paywallDescription="Upgrade to see quoted lines as a running highlight instead of one word at a time. $0.99/month or $7.99/year."
            >
              <div
                className="flex items-center justify-between py-2 px-4 rounded-lg"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="min-w-0 pr-4">
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    Karaoke dialogue mode
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Show full dialogue blocks with a moving word highlight. Keeps the pacing but lets you see tone and sarcasm in context.
                  </p>
                </div>
                <button
                  onClick={() => setKaraokeDialogue(!karaokeDialogue)}
                  className="w-10 h-6 rounded-full relative transition-colors shrink-0"
                  style={{
                    backgroundColor: karaokeDialogue ? 'var(--accent)' : 'var(--bg-tertiary)',
                  }}
                  aria-pressed={karaokeDialogue}
                >
                  <div
                    className="w-4 h-4 rounded-full bg-white absolute top-1 transition-transform"
                    style={{
                      transform: karaokeDialogue ? 'translateX(20px)' : 'translateX(4px)',
                    }}
                  />
                </button>
              </div>
            </ProLock>

            {/* Long word threshold */}
            <ProLock
              paywallTitle="Long-word threshold is a Pro feature"
              paywallDescription="Upgrade to customize which words count as 'long' and get slowed down. $0.99/month or $7.99/year."
            >
              <div
                className="flex items-center justify-between py-3 px-4 rounded-lg"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="min-w-0 pr-4">
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    Long word threshold
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Minimum character count for a word to be treated as "long" and slowed down.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setLongWordThreshold(longWordThreshold - 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  >
                    -
                  </button>
                  <span className="font-mono text-sm w-10 text-center" style={{ color: 'var(--text-primary)' }}>
                    {longWordThreshold}+
                  </span>
                  <button
                    onClick={() => setLongWordThreshold(longWordThreshold + 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  >
                    +
                  </button>
                </div>
              </div>
            </ProLock>

            {/* Reading font picker */}
            <div
              className="py-3 px-4 rounded-lg"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <div className="text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
                Reading font
              </div>
              <div className="grid grid-cols-2 gap-2">
                {READING_FONTS.map(f => {
                  const isActive = readingFont === f.value;
                  return (
                    <button
                      key={f.value}
                      onClick={() => setReadingFont(f.value)}
                      className="rounded-lg px-3 py-2 text-left transition-colors"
                      style={{
                        backgroundColor: isActive ? 'var(--accent)' : 'var(--bg-primary)',
                        color: isActive ? '#fff' : 'var(--text-primary)',
                        border: `1px solid ${isActive ? 'var(--accent)' : 'var(--bg-tertiary)'}`,
                      }}
                    >
                      <div className="text-[11px] uppercase tracking-wide opacity-70 mb-0.5">
                        {f.label}
                      </div>
                      <div
                        className="text-sm truncate"
                        style={{ fontFamily: f.family }}
                      >
                        Read twice as fast.
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Speed Profile */}
        <SpeedProfileEditor />

        {/* Known Words */}
        <KnownWordManager />

        {/* Manage library — book deletion lives here, not in the grid */}
        <ManageLibrary />

        {/* Keyboard shortcuts reference */}
        <div>
          <h3
            className="text-lg font-semibold mb-3"
            style={{ color: 'var(--text-primary)' }}
          >
            Keyboard Shortcuts
          </h3>
          <div
            className="rounded-lg p-4 space-y-2 text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            {[
              ['Space', 'Play / Pause'],
              ['\u2190 / \u2192', 'Skip word (Shift+arrow = 10 words)'],
              ['\u2191 / \u2193', 'Increase / Decrease speed (25 WPM)'],
              ['[ / ]', 'Previous / Next chapter'],
              ['Esc', 'Back to library'],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center gap-3">
                <kbd
                  className="px-2 py-0.5 rounded text-xs font-mono"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  {key}
                </kbd>
                <span style={{ color: 'var(--text-secondary)' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
