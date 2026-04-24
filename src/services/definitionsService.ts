export interface Definition {
  partOfSpeech: string;
  definitions: { definition: string; example?: string }[];
}

export interface DefinitionResponse {
  word: string;
  phonetic?: string;
  meanings: Definition[];
}

export class OfflineError extends Error {
  constructor() { super('offline'); this.name = 'OfflineError'; }
}

export class RateLimitError extends Error {
  constructor() { super('rate_limit'); this.name = 'RateLimitError'; }
}

export interface DefinitionProvider {
  fetchDefinition(word: string): Promise<DefinitionResponse | null>;
}

const NORMALIZE_RE = /[^\p{L}'-]/gu;

function normalize(word: string): string {
  return word.toLowerCase().replace(NORMALIZE_RE, '');
}

interface FreeDictEntry {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string }[];
  meanings?: {
    partOfSpeech?: string;
    definitions?: { definition: string; example?: string }[];
  }[];
}

/**
 * Adapter over https://api.dictionaryapi.dev — no key, no account,
 * single English entry endpoint.
 */
class FreeDictionaryProvider implements DefinitionProvider {
  private cache = new Map<string, DefinitionResponse | 'NOT_FOUND'>();

  async fetchDefinition(word: string): Promise<DefinitionResponse | null> {
    const key = normalize(word);
    if (!key) return null;

    const cached = this.cache.get(key);
    if (cached === 'NOT_FOUND') return null;
    if (cached) return cached;

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new OfflineError();
    }

    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`)
      .catch(() => { throw new OfflineError(); });

    if (res.status === 404) {
      this.cache.set(key, 'NOT_FOUND');
      return null;
    }
    if (res.status === 429) {
      throw new RateLimitError();
    }
    if (!res.ok) {
      // Treat other failures as transient — don't cache, let user retry.
      throw new Error(`Definition lookup failed (${res.status})`);
    }

    const entries = await res.json() as FreeDictEntry[];
    const first = entries[0];
    if (!first) {
      this.cache.set(key, 'NOT_FOUND');
      return null;
    }

    const phonetic = first.phonetic
      ?? first.phonetics?.find(p => p.text)?.text;

    const meanings: Definition[] = (first.meanings ?? []).map(m => ({
      partOfSpeech: m.partOfSpeech ?? '',
      definitions: (m.definitions ?? []).slice(0, 3).map(d => ({
        definition: d.definition,
        example: d.example,
      })),
    })).filter(m => m.definitions.length > 0);

    const result: DefinitionResponse = { word: first.word, phonetic, meanings };
    this.cache.set(key, result);
    return result;
  }
}

export const definitionsService: DefinitionProvider = new FreeDictionaryProvider();

/** Convenience wrapper — avoids exporting the class directly. */
export function fetchDefinition(word: string): Promise<DefinitionResponse | null> {
  return definitionsService.fetchDefinition(word);
}
