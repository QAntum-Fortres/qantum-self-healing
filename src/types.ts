// ─────────────────────────────────────────────────────────────────────────────
// @qantum/self-healing — Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface HealingStrategy {
  name: string;
  priority: number;
  canHeal: (failure: FailureContext) => boolean;
  heal: (failure: FailureContext) => Promise<HealingResult>;
}

export interface FailureContext {
  testId: string;
  testName: string;
  error: string;
  errorType: string;
  selector?: string;
  element?: ElementContext;
  screenshot?: string;
  dom?: string;
  timestamp: number;
  attempt: number;
}

export interface ElementContext {
  tag: string;
  id?: string;
  classes: string[];
  text?: string;
  attributes: Record<string, string>;
  path: string;
  siblings?: ElementContext[];
  parent?: ElementContext;
}

export interface HealingResult {
  healed: boolean;
  strategy: string;
  originalSelector?: string;
  newSelector?: string;
  confidence: number;
  explanation: string;
  shouldSave: boolean;
  duration?: number;
}

export interface HealingHistory {
  testId: string;
  timestamp: number;
  original: string;
  healed: string;
  strategy: string;
  successful: boolean;
}

export interface SelectorAlternative {
  selector: string;
  type: SelectorType;
  confidence: number;
  reason: string;
}

export type SelectorType =
  | 'id'
  | 'class'
  | 'xpath'
  | 'css'
  | 'text'
  | 'data-attribute'
  | 'aria'
  | 'relative';
