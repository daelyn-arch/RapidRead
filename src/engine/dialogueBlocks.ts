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
 * Walk the token array once and collect contiguous runs where
 * `token.context.isDialogue === true`.
 */
export function computeDialogueBlocks(tokens: WordToken[]): DialogueBlock[] {
  const blocks: DialogueBlock[] = [];
  let runStart: number | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const inDialogue = tokens[i].context.isDialogue;
    if (inDialogue && runStart === null) {
      runStart = i;
    } else if (!inDialogue && runStart !== null) {
      const length = i - runStart;
      if (length >= MIN_BLOCK_SIZE) {
        blocks.push({ startIndex: runStart, endIndex: i - 1 });
      }
      runStart = null;
    }
  }

  if (runStart !== null) {
    const length = tokens.length - runStart;
    if (length >= MIN_BLOCK_SIZE) {
      blocks.push({ startIndex: runStart, endIndex: tokens.length - 1 });
    }
  }

  return blocks;
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
