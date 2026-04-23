import type { WordToken, WordContext } from '@/types/rsvp';
import { calculateORP } from './orpCalculator';
import {
  stripPunctuation,
  startsWithOpenQuote,
  endsWithCloseQuote,
  isSentenceEnd,
  hasTrailingPunctuation,
  isLongWord,
} from './contextDetector';

export function tokenize(
  text: string,
  globalOffset: number,
  dictionary: Set<string> | null,
  customKnownWords: string[],
): WordToken[] {
  const knownSet = new Set(customKnownWords.map(w => w.toLowerCase()));
  const paragraphs = text.split(/\n\s*\n/);
  const tokens: WordToken[] = [];
  let index = 0;
  let dialogueOpen = false;

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(w => w.length > 0);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // Track dialogue state
      if (startsWithOpenQuote(word)) {
        dialogueOpen = true;
      }

      const bare = stripPunctuation(word).toLowerCase();
      const isUnfamiliar =
        dictionary !== null &&
        bare.length >= 3 &&
        /^[\p{L}]+$/u.test(bare) &&
        !dictionary.has(bare) &&
        !knownSet.has(bare);

      const context: WordContext = {
        isDialogue: dialogueOpen,
        isUnfamiliar,
        isParagraphStart: i === 0 && tokens.length > 0,
        isSentenceEnd: isSentenceEnd(word),
        isLongWord: isLongWord(word),
        hasTrailingPunctuation: hasTrailingPunctuation(word),
      };

      tokens.push({
        word,
        index,
        globalIndex: globalOffset + index,
        orpIndex: calculateORP(word),
        context,
      });

      // Close dialogue after the word is processed (closing quote word IS dialogue)
      if (endsWithCloseQuote(word)) {
        dialogueOpen = false;
      }

      index++;
    }
  }

  return tokens;
}
