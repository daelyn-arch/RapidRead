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
  modifier: number;
  enabled: boolean;
}

export interface SpeedProfile {
  id: string;
  name: string;
  baseWpm: number;
  rules: SpeedRule[];
}

export const DEFAULT_RULES: SpeedRule[] = [
  { id: 'dialogue', name: 'Dialogue', condition: 'isDialogue', modifier: 0.75, enabled: true },
  { id: 'unfamiliar', name: 'Unfamiliar Words', condition: 'isUnfamiliar', modifier: 0.5, enabled: true },
  { id: 'sentence-end', name: 'Sentence End', condition: 'isSentenceEnd', modifier: 0.4, enabled: true },
  { id: 'paragraph', name: 'Paragraph Start', condition: 'isParagraphStart', modifier: 0.3, enabled: true },
  { id: 'punctuation', name: 'Comma/Semicolon', condition: 'hasTrailingPunctuation', modifier: 0.7, enabled: true },
  { id: 'long-word', name: 'Long Word (9+)', condition: 'isLongWord', modifier: 0.8, enabled: true },
];

export const DEFAULT_PROFILE: SpeedProfile = {
  id: 'default',
  name: 'Default',
  baseWpm: 300,
  rules: DEFAULT_RULES,
};
