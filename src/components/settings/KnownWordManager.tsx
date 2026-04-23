import { useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

export default function KnownWordManager() {
  const [input, setInput] = useState('');
  const { customKnownWords } = useSettingsStore(s => s.settings);
  const { addKnownWord, removeKnownWord } = useSettingsStore();

  const handleAdd = () => {
    const word = input.trim();
    if (word) {
      addKnownWord(word);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div>
      <h3
        className="text-lg font-semibold mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        Known Words
      </h3>
      <p
        className="text-sm mb-4"
        style={{ color: 'var(--text-secondary)' }}
      >
        Words added here won't trigger the "unfamiliar word" slowdown.
        Great for character names and fictional places.
      </p>

      {/* Add word input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a word (e.g., Kaz, Ketterdam)"
          className="flex-1 px-3 py-2 rounded-lg text-sm border-none outline-none"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Add
        </button>
      </div>

      {/* Word list */}
      {customKnownWords.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {customKnownWords.map(word => (
            <span
              key={word}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
              }}
            >
              {word}
              <button
                onClick={() => removeKnownWord(word)}
                className="ml-1 hover:opacity-60"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>
          No custom words added yet
        </p>
      )}
    </div>
  );
}
