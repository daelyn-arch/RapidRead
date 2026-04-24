import { useState } from 'react';

interface Sample {
  file: string;
  title: string;
  author: string;
  note: string; // short+medium+long cue
}

// All public domain via Project Gutenberg. Sorted by approximate length
// (shortest first) so first-time visitors see quick wins above the fold.
const SAMPLES: Sample[] = [
  { file: 'shunned-house.epub',           title: 'The Shunned House',              author: 'H. P. Lovecraft',    note: '~12k words · 40m at 300 wpm' },
  { file: 'metamorphosis.epub',           title: 'The Metamorphosis',              author: 'Franz Kafka',        note: '~22k words · 1h at 300 wpm' },
  { file: 'alice.epub',                   title: "Alice's Adventures in Wonderland", author: 'Lewis Carroll',    note: '~28k words · 1.5h at 300 wpm' },
  { file: 'time-machine.epub',            title: 'The Time Machine',               author: 'H. G. Wells',        note: '~32k words · 1.7h at 300 wpm' },
  { file: 'war-of-the-worlds.epub',       title: 'The War of the Worlds',          author: 'H. G. Wells',        note: '~60k words · 3.3h at 300 wpm' },
  { file: 'hound-of-baskervilles.epub',   title: 'The Hound of the Baskervilles',  author: 'Arthur Conan Doyle', note: '~60k words · 3.3h at 300 wpm' },
  { file: 'around-the-world-80-days.epub', title: 'Around the World in Eighty Days', author: 'Jules Verne',      note: '~64k words · 3.5h at 300 wpm' },
  { file: 'treasure-island.epub',         title: 'Treasure Island',                author: 'Robert Louis Stevenson', note: '~67k words · 3.7h at 300 wpm' },
  { file: 'frankenstein.epub',            title: 'Frankenstein',                   author: 'Mary Shelley',       note: '~75k words · 4.2h at 300 wpm' },
  { file: 'huckleberry-finn.epub',        title: 'Adventures of Huckleberry Finn', author: 'Mark Twain',         note: '~110k words · 6h at 300 wpm' },
  { file: 'wuthering-heights.epub',       title: 'Wuthering Heights',              author: 'Emily Brontë',       note: '~115k words · 6.4h at 300 wpm' },
  { file: 'sherlock-holmes.epub',         title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', note: '~120k words · 6.7h at 300 wpm' },
  { file: 'pride-and-prejudice.epub',     title: 'Pride and Prejudice',            author: 'Jane Austen',        note: '~120k words · 6.7h at 300 wpm' },
  { file: 'dracula.epub',                 title: 'Dracula',                        author: 'Bram Stoker',        note: '~160k words · 8.9h at 300 wpm' },
  { file: 'moby-dick.epub',               title: 'Moby Dick',                      author: 'Herman Melville',    note: '~210k words · 11.7h at 300 wpm' },
  { file: 'count-of-monte-cristo.epub',   title: 'The Count of Monte Cristo',      author: 'Alexandre Dumas',    note: '~470k words · 26h at 300 wpm' },
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
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
