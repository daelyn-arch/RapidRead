import { useState } from 'react';

interface Sample {
  file: string;
  title: string;
  author: string;
  note: string; // short+medium+long cue
}

const SAMPLES: Sample[] = [
  { file: 'alice.epub',             title: "Alice's Adventures in Wonderland", author: 'Lewis Carroll',     note: '~28k words · 1.5h at 300 wpm' },
  { file: 'metamorphosis.epub',     title: 'The Metamorphosis',                author: 'Franz Kafka',       note: '~22k words · 1h at 300 wpm' },
  { file: 'pride-and-prejudice.epub', title: 'Pride and Prejudice',             author: 'Jane Austen',       note: '~120k words · 7h at 300 wpm' },
];

interface Props {
  onImportFile: (file: File) => void;
  importing: boolean;
}

/**
 * Pre-loaded public-domain EPUBs from Project Gutenberg that users can tap
 * to try the reader without having to bring their own book.
 */
export default function SampleBooks({ onImportFile, importing }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSample(s: Sample) {
    setError(null);
    setLoading(s.file);
    try {
      const res = await fetch(`/samples/${s.file}`);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const file = new File([blob], s.file, { type: 'application/epub+zip' });
      onImportFile(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          Try a free sample
        </h2>
        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          Public domain · Project Gutenberg
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {SAMPLES.map(s => {
          const isLoading = loading === s.file;
          return (
            <button
              key={s.file}
              type="button"
              onClick={() => loadSample(s)}
              disabled={importing || !!loading}
              className="text-left rounded-lg p-3 hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {s.title}
              </div>
              <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                {s.author}
              </div>
              <div className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                {isLoading ? 'Loading…' : s.note}
              </div>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="mt-2 text-xs" style={{ color: '#fca5a5' }}>
          Couldn’t load sample: {error}
        </p>
      )}
    </div>
  );
}
