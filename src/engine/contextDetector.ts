const OPENING_QUOTES = new Set(['"', '\u201C', '\u2018']);
const CLOSING_QUOTES = new Set(['"', '\u201D', '\u2019']);
const SENTENCE_ENDERS = new Set(['.', '!', '?']);
const TRAILING_PUNCT = new Set([',', ';', ':', '\u2014']);

export function stripPunctuation(word: string): string {
  return word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

export function startsWithOpenQuote(word: string): boolean {
  return word.length > 0 && OPENING_QUOTES.has(word[0]);
}

export function endsWithCloseQuote(word: string): boolean {
  return word.length > 0 && CLOSING_QUOTES.has(word[word.length - 1]);
}

export function isSentenceEnd(word: string): boolean {
  const lastChar = word[word.length - 1];
  // Handle case like `word."` — check second-to-last too
  if (CLOSING_QUOTES.has(lastChar) && word.length > 1) {
    return SENTENCE_ENDERS.has(word[word.length - 2]);
  }
  return SENTENCE_ENDERS.has(lastChar);
}

export function hasTrailingPunctuation(word: string): boolean {
  const lastChar = word[word.length - 1];
  return TRAILING_PUNCT.has(lastChar);
}

export function isLongWord(word: string, threshold = 9): boolean {
  return stripPunctuation(word).length >= threshold;
}
