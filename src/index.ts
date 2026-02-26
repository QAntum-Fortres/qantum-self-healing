// ─────────────────────────────────────────────────────────────────────────────
// @qantum/self-healing — Main Export
// Part of the AETERNA platform — https://aeterna.website
// MIT License © Dimitar Prodromov
// ─────────────────────────────────────────────────────────────────────────────

export { SelfHealingEngine } from './SelfHealingEngine';
export { SelectorGenerator } from './SelectorGenerator';
export { PatternRecognizer, FeatureExtractor } from './PatternRecognizer';
export { OllamaManager } from './OllamaManager';
export { createHealingProxy } from './PlaywrightProxy';

export type {
  HealingStrategy,
  HealingResult,
  HealingHistory,
  FailureContext,
  ElementContext,
  SelectorAlternative,
  SelectorType,
} from './types';

export type {
  Pattern,
  PatternType,
  PatternMatch,
  RecognitionResult,
} from './PatternRecognizer';
