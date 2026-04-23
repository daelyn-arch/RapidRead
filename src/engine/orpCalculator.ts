/**
 * Calculate the Optimal Recognition Point (ORP) for a word.
 * The ORP is the character the eye naturally fixates on — positioned
 * at roughly the 35% mark from the left (Spritz-style lookup table).
 */
export function calculateORP(word: string): number {
  const len = word.length;
  if (len <= 1) return 0;
  if (len <= 3) return 1;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}
