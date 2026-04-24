import { useEffect, useState } from 'react';
import {
  fetchDefinition,
  OfflineError,
  RateLimitError,
  type DefinitionResponse,
} from '@/services/definitionsService';

interface Props {
  word: string;
}

type State =
  | { kind: 'loading' }
  | { kind: 'loaded'; data: DefinitionResponse }
  | { kind: 'not-found' }
  | { kind: 'offline' }
  | { kind: 'rate-limit' }
  | { kind: 'error'; message: string };

export default function DefinitionsPanel({ word }: Props) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ kind: 'loading' });
    fetchDefinition(word)
      .then((data) => {
        if (!active) return;
        if (!data) setState({ kind: 'not-found' });
        else setState({ kind: 'loaded', data });
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof OfflineError) setState({ kind: 'offline' });
        else if (err instanceof RateLimitError) setState({ kind: 'rate-limit' });
        else setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
      });
    return () => { active = false; };
  }, [word, attempt]);

  const secondaryStyle = { color: 'var(--text-secondary)' };

  return (
    <div
      className="max-h-[280px] overflow-y-auto text-sm"
      style={{ color: 'var(--text-primary)' }}
    >
      {state.kind === 'loading' && (
        <p style={secondaryStyle}>Looking up…</p>
      )}

      {state.kind === 'not-found' && (
        <p style={secondaryStyle}>No definition found for &ldquo;{word}&rdquo;.</p>
      )}

      {state.kind === 'offline' && (
        <div>
          <p style={secondaryStyle}>
            Can&apos;t load definition — you&apos;re offline. Try again when connected.
          </p>
          <button
            type="button"
            onClick={() => setAttempt(a => a + 1)}
            className="mt-2 rounded-md px-3 py-1 text-xs border"
            style={{ borderColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            Retry
          </button>
        </div>
      )}

      {state.kind === 'rate-limit' && (
        <p style={secondaryStyle}>Too many requests right now. Please wait a moment.</p>
      )}

      {state.kind === 'error' && (
        <div>
          <p style={{ color: '#fca5a5' }}>{state.message}</p>
          <button
            type="button"
            onClick={() => setAttempt(a => a + 1)}
            className="mt-2 rounded-md px-3 py-1 text-xs border"
            style={{ borderColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            Retry
          </button>
        </div>
      )}

      {state.kind === 'loaded' && (
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <h4 className="font-semibold text-base">{state.data.word}</h4>
            {state.data.phonetic && (
              <span className="text-xs" style={secondaryStyle}>{state.data.phonetic}</span>
            )}
          </div>
          <div className="space-y-3">
            {state.data.meanings.map((m, mi) => (
              <div key={mi}>
                {m.partOfSpeech && (
                  <div className="text-xs uppercase tracking-wide mb-1" style={secondaryStyle}>
                    {m.partOfSpeech}
                  </div>
                )}
                <ol className="list-decimal list-inside space-y-1">
                  {m.definitions.map((d, di) => (
                    <li key={di}>
                      <span>{d.definition}</span>
                      {d.example && (
                        <div className="text-xs italic mt-0.5 pl-4" style={secondaryStyle}>
                          &ldquo;{d.example}&rdquo;
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
