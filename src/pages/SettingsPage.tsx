import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '@/store/settingsStore';
import SpeedProfileEditor from '@/components/settings/SpeedProfileEditor';
import KnownWordManager from '@/components/settings/KnownWordManager';
import type { Theme } from '@/types/settings';

const THEMES: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'sepia', label: 'Sepia' },
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
  const { theme, fontSize, fontFamily, showORP, orpColor, dialogueColor, unfamiliarColor } = useSettingsStore(s => s.settings);
  const { setTheme, setFontSize, setOrpColor, setDialogueColor, setUnfamiliarColor } = useSettingsStore();
  const toggleORP = () => useSettingsStore.setState(s => ({ settings: { ...s.settings, showORP: !s.settings.showORP } }));

  return (
    <div
      className="min-h-screen flex flex-col"
      data-theme={theme}
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <header
        className="flex items-center gap-3 px-6 py-4 border-b"
        style={{ borderColor: 'var(--bg-tertiary)' }}
      >
        <button
          onClick={() => navigate('/')}
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

        {/* Speed Profile */}
        <SpeedProfileEditor />

        {/* Known Words */}
        <KnownWordManager />

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
