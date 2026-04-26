import type { WordToken } from '@/types/rsvp';

export interface DialogueBlock {
  /** Inclusive start index into the tokens array. */
  startIndex: number;
  /** Inclusive end index into the tokens array. */
  endIndex: number;
}

/**
 * Minimum block size worth karaoke'ing. Single-word dialogue (e.g. `"Yes."`) is
 * better rendered as normal RSVP.
 */
const MIN_BLOCK_SIZE = 2;

/**
 * Hard cap on block length. Long monologue passages overflow the karaoke
 * area on small screens, so we split at sentence/clause boundaries before
 * exceeding this. ~30 words ≈ 3-4 lines on mobile.
 */
const MAX_BLOCK_SIZE = 30;

/**
 * Once a sub-block has grown to at least this many words, prefer to close
 * it on the next sentence/clause boundary rather than running to MAX.
 */
const SOFT_BLOCK_TARGET = 18;

/**
 * Walk the token array once and collect contiguous runs where
 * `token.context.isDialogue === true`. Long runs are split into multiple
 * blocks at the best available boundary (sentence-end → trailing
 * punctuation → hard cut) so they fit on screen.
 */
export function computeDialogueBlocks(tokens: WordToken[]): DialogueBlock[] {
  const blocks: DialogueBlock[] = [];
  let runStart: number | null = null;

  const closeRun = (start: number, endExclusive: number) => {
    if (endExclusive - start < MIN_BLOCK_SIZE) return;
    splitRun(tokens, start, endExclusive - 1, blocks);
  };

  for (let i = 0; i < tokens.length; i++) {
    const inDialogue = tokens[i].context.isDialogue;
    if (inDialogue && runStart === null) {
      runStart = i;
    } else if (!inDialogue && runStart !== null) {
      closeRun(runStart, i);
      runStart = null;
    }
  }

  if (runStart !== null) {
    closeRun(runStart, tokens.length);
  }

  return blocks;
}

/**
 * Block-split the ENTIRE token array using the same sentence/clause-aware
 * algorithm dialogue uses. Used by full-karaoke mode where every word
 * renders as part of a moving-highlight chunk instead of one-at-a-time.
 *
 * Paragraph starts force a break — reading is more natural when paragraph
 * boundaries align with karaoke chunk boundaries.
 */
export function computeAllKaraokeBlocks(tokens: WordToken[]): DialogueBlock[] {
  const blocks: DialogueBlock[] = [];
  if (tokens.length === 0) return blocks;

  // Split at paragraph boundaries first, then sub-split each paragraph
  // via the standard splitRun algorithm so long paragraphs still fit.
  let segStart = 0;
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i].context.isParagraphStart) {
      splitRun(tokens, segStart, i - 1, blocks);
      segStart = i;
    }
  }
  splitRun(tokens, segStart, tokens.length - 1, blocks);

  return blocks;
}

/**
 * Break a contiguous dialogue run [start..end] into sub-blocks that respect
 * MAX_BLOCK_SIZE. Prefer sentence-end boundaries once the current sub-block
 * is at least SOFT_BLOCK_TARGET words; fall back to clause-level punctuation
 * (commas/semicolons); hard-cut at MAX_BLOCK_SIZE if neither is available.
 */
function splitRun(
  tokens: WordToken[],
  start: number,
  end: number,
  out: DialogueBlock[],
) {
  const length = end - start + 1;
  if (length <= MAX_BLOCK_SIZE) {
    out.push({ startIndex: start, endIndex: end });
    return;
  }

  let segStart = start;
  let lastClauseBreak = -1;

  for (let i = start; i <= end; i++) {
    const len = i - segStart + 1;
    const ctx = tokens[i].context;

    if (ctx.hasTrailingPunctuation && !ctx.isSentenceEnd) {
      lastClauseBreak = i;
    }

    const atSoftTarget = len >= SOFT_BLOCK_TARGET;
    const atHardLimit = len >= MAX_BLOCK_SIZE;

    let cut = -1;
    if (atSoftTarget && ctx.isSentenceEnd) {
      cut = i;
    } else if (atHardLimit) {
      // Prefer the latest clause break if we have one, else hard cut here.
      cut = lastClauseBreak >= segStart ? lastClauseBreak : i;
    }

    if (cut >= 0) {
      out.push({ startIndex: segStart, endIndex: cut });
      segStart = cut + 1;
      lastClauseBreak = -1;
    }
  }

  if (segStart <= end) {
    // Tail: only emit if it meets the minimum, otherwise extend the previous
    // sub-block so we don't lose words.
    const tailLen = end - segStart + 1;
    if (tailLen >= MIN_BLOCK_SIZE) {
      out.push({ startIndex: segStart, endIndex: end });
    } else if (out.length > 0 && out[out.length - 1].endIndex === segStart - 1) {
      out[out.length - 1] = { startIndex: out[out.length - 1].startIndex, endIndex: end };
    }
  }
}

/**
 * Build an O(1) lookup: given a token index, return the block it belongs to
 * (or undefined if it's not inside any block).
 */
export function buildDialogueBlockIndex(
  blocks: DialogueBlock[],
): Map<number, DialogueBlock> {
  const map = new Map<number, DialogueBlock>();
  for (const block of blocks) {
    for (let i = block.startIndex; i <= block.endIndex; i++) {
      map.set(i, block);
    }
  }
  return map;
}
