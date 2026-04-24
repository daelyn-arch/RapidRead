export interface WordContext {
  isDialogue: boolean;
  isUnfamiliar: boolean;
  isParagraphStart: boolean;
  isSentenceEnd: boolean;
  isLongWord: boolean;
  hasTrailingPunctuation: boolean;
}

export interface WordToken {
  word: string;
  index: number;
  globalIndex: number;
  orpIndex: number;
  context: WordContext;
}

export type SpeedCondition = keyof WordContext;

export interface SpeedRule {
  id: string;
  name: string;
  condition: SpeedCondition;
  wpm: number;
  enabled: boolean;
}

export interface SpeedProfile {
  id: string;
  name: string;
  baseWpm: number;
  /** Legacy — seconds to ramp back to base. Replaced by transitionStep. */
  transitionDuration: number;
  /** WPM to add to the effective speed for each word after a context zone,
   *  until reaching base WPM. 0 disables the ramp (instant snap). */
  transitionStep: number;
  rules: SpeedRule[];
}

export const DEFAULT_RULES: SpeedRule[] = [
  { id: 'dialogue', name: 'Dialogue', condition: 'isDialogue', wpm: 225, enabled: true },
  { id: 'unfamiliar', name: 'Unfamiliar Words', condition: 'isUnfamiliar', wpm: 150, enabled: true },
  { id: 'sentence-end', name: 'Sentence End', condition: 'isSentenceEnd', wpm: 120, enabled: true },
  { id: 'paragraph', name: 'Paragraph Start', condition: 'isParagraphStart', wpm: 100, enabled: true },
  { id: 'punctuation', name: 'Comma/Semicolon', condition: 'hasTrailingPunctuation', wpm: 200, enabled: true },
  { id: 'long-word', name: 'Long Word (9+)', condition: 'isLongWord', wpm: 250, enabled: true },
];

export const DEFAULT_PROFILE: SpeedProfile = {
  id: 'default',
  name: 'Default',
  baseWpm: 300,
  transitionDuration: 0,
  transitionStep: 25,
  rules: DEFAULT_RULES,
};
