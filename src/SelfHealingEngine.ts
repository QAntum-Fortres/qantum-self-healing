// ─────────────────────────────────────────────────────────────────────────────
// @qantum/self-healing — Self-Healing Engine
// Singleton engine that heals broken test selectors automatically
// ─────────────────────────────────────────────────────────────────────────────

import { SelectorGenerator } from './SelectorGenerator';
import type {
  HealingStrategy,
  HealingResult,
  HealingHistory,
  FailureContext,
} from './types';
import type { OllamaManager } from './OllamaManager';

// ──────────────────────────────────────────────────────────────────────────────
// BUILT-IN STRATEGIES
// ──────────────────────────────────────────────────────────────────────────────

const selectorNotFoundStrategy: HealingStrategy = {
  name: 'SelectorNotFound',
  priority: 1,
  canHeal: (f) =>
    f.errorType === 'ElementNotFoundError' ||
    /element not found|no element|selector/i.test(f.error),
  heal: async (f) => {
    if (!f.element) {
      return { healed: false, strategy: 'SelectorNotFound', confidence: 0, explanation: 'No element context', shouldSave: false };
    }
    const alternatives = SelectorGenerator.generateAlternatives(f.element);
    const best = SelectorGenerator.findBestSelector(alternatives);
    if (best && best.selector !== f.selector) {
      return {
        healed: true,
        strategy: 'SelectorNotFound',
        originalSelector: f.selector,
        newSelector: best.selector,
        confidence: best.confidence,
        explanation: `Healed using ${best.type} selector: ${best.reason}`,
        shouldSave: best.confidence > 0.7,
      };
    }
    return { healed: false, strategy: 'SelectorNotFound', confidence: 0, explanation: 'No alternative found', shouldSave: false };
  },
};

const staleElementStrategy: HealingStrategy = {
  name: 'StaleElement',
  priority: 2,
  canHeal: (f) =>
    f.errorType === 'StaleElementReferenceError' ||
    /stale element/i.test(f.error),
  heal: async (_f) => ({
    healed: true,
    strategy: 'StaleElement',
    confidence: 0.75,
    explanation: 'Re-query element after DOM mutation (add page.waitForLoadState() before interaction)',
    shouldSave: false,
  }),
};

const timeoutStrategy: HealingStrategy = {
  name: 'Timeout',
  priority: 3,
  canHeal: (f) =>
    f.errorType === 'TimeoutError' || /timeout/i.test(f.error),
  heal: async (_f) => ({
    healed: true,
    strategy: 'Timeout',
    confidence: 0.6,
    explanation: 'Add explicit waitForSelector() or increase timeout. Consider waitUntil: "networkidle".',
    shouldSave: false,
  }),
};

const clickInterceptedStrategy: HealingStrategy = {
  name: 'ClickIntercepted',
  priority: 4,
  canHeal: (f) =>
    /click intercepted|other element would receive/i.test(f.error),
  heal: async (_f) => ({
    healed: true,
    strategy: 'ClickIntercepted',
    confidence: 0.65,
    explanation: 'Scroll element into view first: element.scrollIntoViewIfNeeded(). Or close overlays.',
    shouldSave: false,
  }),
};

const networkErrorStrategy: HealingStrategy = {
  name: 'NetworkError',
  priority: 5,
  canHeal: (f) =>
    f.errorType === 'NetworkError' || /network|connection refused|ECONNREFUSED/i.test(f.error),
  heal: async (_f) => ({
    healed: true,
    strategy: 'NetworkError',
    confidence: 0.5,
    explanation: 'Transient network failure. Add retry logic: await expect(async () => { ... }).toPass({ timeout: 30000 })',
    shouldSave: false,
  }),
};

// ──────────────────────────────────────────────────────────────────────────────
// ENGINE
// ──────────────────────────────────────────────────────────────────────────────

export class SelfHealingEngine {
  private static instance: SelfHealingEngine;
  private strategies: HealingStrategy[] = [];
  private history: Map<string, HealingHistory[]> = new Map();
  private selectorCache: Map<string, string> = new Map();
  private ollamaManager: OllamaManager | null = null;
  private totalHealed = 0;
  private totalAttempts = 0;

  private constructor() {
    this.registerDefaultStrategies();
  }

  static getInstance(): SelfHealingEngine {
    if (!SelfHealingEngine.instance) {
      SelfHealingEngine.instance = new SelfHealingEngine();
    }
    return SelfHealingEngine.instance;
  }

  // ── Strategy management ────────────────────────────────────────────────────

  registerStrategy(strategy: HealingStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => a.priority - b.priority);
  }

  unregisterStrategy(name: string): boolean {
    const idx = this.strategies.findIndex((s) => s.name === name);
    if (idx >= 0) { this.strategies.splice(idx, 1); return true; }
    return false;
  }

  getStrategies(): HealingStrategy[] {
    return [...this.strategies];
  }

  // ── AI integration ────────────────────────────────────────────────────────

  enableAI(ollama: OllamaManager): void {
    this.ollamaManager = ollama;
    console.log('[SelfHealing] AI healing enabled via Ollama');
  }

  disableAI(): void {
    this.ollamaManager = null;
  }

  // ── Core healing ──────────────────────────────────────────────────────────

  async heal(failure: FailureContext): Promise<HealingResult> {
    const start = Date.now();
    this.totalAttempts++;

    console.log(`[SelfHealing] Healing: ${failure.testName} | Error: ${failure.errorType}`);

    // 1. Check selector cache
    if (failure.selector) {
      const cached = this.selectorCache.get(failure.selector);
      if (cached) {
        this.totalHealed++;
        return {
          healed: true,
          strategy: 'Cache',
          originalSelector: failure.selector,
          newSelector: cached,
          confidence: 0.85,
          explanation: 'Previously healed selector restored from cache',
          shouldSave: false,
          duration: Date.now() - start,
        };
      }
    }

    // 2. Try each registered strategy
    for (const strategy of this.strategies) {
      if (!strategy.canHeal(failure)) continue;
      try {
        const result = await strategy.heal(failure);
        if (result.healed) {
          result.duration = Date.now() - start;
          // Cache successful selector heals
          if (result.shouldSave && failure.selector && result.newSelector) {
            this.selectorCache.set(failure.selector, result.newSelector);
          }
          this.recordHistory(failure, result);
          this.totalHealed++;
          console.log(`[SelfHealing] ✓ Healed with ${strategy.name} | confidence: ${result.confidence}`);
          return result;
        }
      } catch (err) {
        console.warn(`[SelfHealing] Strategy ${strategy.name} threw:`, err);
      }
    }

    // 3. AI fallback via Ollama
    if (this.ollamaManager && failure.element) {
      try {
        const aiResult = await this.healWithAI(failure);
        if (aiResult.healed) {
          aiResult.duration = Date.now() - start;
          this.totalHealed++;
          console.log(`[SelfHealing] ✓ Healed with AI | confidence: ${aiResult.confidence}`);
          return aiResult;
        }
      } catch (err) {
        console.warn('[SelfHealing] AI healing failed:', err);
      }
    }

    console.warn(`[SelfHealing] ✗ Could not heal: ${failure.testName}`);
    return {
      healed: false,
      strategy: 'None',
      confidence: 0,
      explanation: 'All strategies exhausted. Manual intervention required.',
      shouldSave: false,
      duration: Date.now() - start,
    };
  }

  async healBatch(failures: FailureContext[]): Promise<HealingResult[]> {
    return Promise.all(failures.map((f) => this.heal(f)));
  }

  // ── History & metrics ─────────────────────────────────────────────────────

  getHistory(testId: string): HealingHistory[] {
    return this.history.get(testId) ?? [];
  }

  exportHistory(): HealingHistory[] {
    const all: HealingHistory[] = [];
    for (const h of this.history.values()) all.push(...h);
    return all;
  }

  clearCache(): void {
    this.selectorCache.clear();
  }

  getStats() {
    return {
      totalAttempts: this.totalAttempts,
      totalHealed: this.totalHealed,
      healRate: this.totalAttempts > 0
        ? Math.round((this.totalHealed / this.totalAttempts) * 100)
        : 0,
      cacheSize: this.selectorCache.size,
      strategiesRegistered: this.strategies.length,
    };
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private registerDefaultStrategies(): void {
    [
      selectorNotFoundStrategy,
      staleElementStrategy,
      timeoutStrategy,
      clickInterceptedStrategy,
      networkErrorStrategy,
    ].forEach((s) => this.registerStrategy(s));
  }

  private async healWithAI(failure: FailureContext): Promise<HealingResult> {
    if (!this.ollamaManager || !failure.element) {
      return { healed: false, strategy: 'AI', confidence: 0, explanation: 'AI not available', shouldSave: false };
    }

    const elementDesc = JSON.stringify(failure.element, null, 2);
    const prompt = `You are a test automation expert. Generate the best CSS or XPath selector for this DOM element.

Element context:
${elementDesc}

Original broken selector: ${failure.selector ?? 'unknown'}
Error: ${failure.error}

Reply with ONLY the selector string, nothing else. No explanation, no code block.`;

    const response = await (this.ollamaManager as any).generate(prompt);
    const selector = response?.trim();

    if (!selector || selector.length < 3) {
      return { healed: false, strategy: 'AI', confidence: 0, explanation: 'AI returned empty selector', shouldSave: false };
    }

    return {
      healed: true,
      strategy: 'AI-Ollama',
      originalSelector: failure.selector,
      newSelector: selector,
      confidence: 0.7,
      explanation: `AI-generated selector using local Ollama model`,
      shouldSave: true,
    };
  }

  private recordHistory(failure: FailureContext, result: HealingResult): void {
    if (!failure.selector || !result.newSelector) return;
    const entry: HealingHistory = {
      testId: failure.testId,
      timestamp: Date.now(),
      original: failure.selector,
      healed: result.newSelector,
      strategy: result.strategy,
      successful: result.healed,
    };
    const existing = this.history.get(failure.testId) ?? [];
    existing.push(entry);
    this.history.set(failure.testId, existing);
  }
}
