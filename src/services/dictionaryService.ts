let wordSet: Set<string> | null = null;
let loading: Promise<void> | null = null;

export async function loadDictionary(): Promise<void> {
  if (wordSet) return;
  if (loading) return loading;

  loading = fetch('/dictionaries/en-275k.json')
    .then(res => res.json())
    .then((words: string[]) => {
      wordSet = new Set(words);
    });

  return loading;
}

export function getDictionary(): Set<string> | null {
  return wordSet;
}

export function isKnownWord(
  word: string,
  customKnownWords: string[],
): boolean {
  const normalized = normalizeToDictionaryForm(word);
  if (normalized.length < 3) return true;

  // Check custom known words
  for (const known of customKnownWords) {
    if (known.toLowerCase() === normalized) return true;
  }

  // Check dictionary
  if (wordSet) {
    return wordSet.has(normalized);
  }

  // Dictionary not loaded yet — assume known
  return true;
}

function normalizeToDictionaryForm(word: string): string {
  // Strip leading/trailing punctuation
  let w = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  // Handle possessives
  w = w.replace(/'s$/i, '');
  return w.toLowerCase();
}
