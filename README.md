# @qantum/self-healing

> **Self-healing test automation engine. When your UI changes, your tests fix themselves.**

[![npm version](https://img.shields.io/npm/v/@qantum/self-healing.svg?style=flat)](https://www.npmjs.com/package/@qantum/self-healing)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-compatible-brightgreen.svg)](https://playwright.dev)

---

## The Problem

Your CI/CD pipeline breaks **every sprint** because a developer renamed a button.

You spend **30–40% of QA time** fixing broken selectors instead of writing new tests.

`data-testid="submit-btn"` becomes `data-testid="submit-button"` and suddenly **everything is red**.

---

## The Solution

```typescript
import { SelfHealingEngine } from '@qantum/self-healing';

const engine = SelfHealingEngine.getInstance();

// Your test fails with: "Element not found: #submit-btn"
const result = await engine.heal({
  testId: 'checkout-test',
  testName: 'User can complete checkout',
  error: 'Element not found',
  errorType: 'ElementNotFoundError',
  selector: '#submit-btn',
  element: {
    tag: 'button',
    text: 'Complete Order',
    classes: ['btn', 'btn-primary'],
    attributes: { 'data-testid': 'submit-button', 'aria-label': 'Complete Order' },
    id: undefined,
    path: '//form[@id="checkout"]/button',
  },
  timestamp: Date.now(),
  attempt: 1,
});

// result.healed === true
// result.newSelector === '[data-testid="submit-button"]'
// result.confidence === 0.9
// result.explanation === "Healed using data-attribute selector: Test-specific data attribute"
```

**The test passes. Automatically. Zero human intervention.**

---

## How It Works

6 healing strategies, applied in priority order:

```
1. ID selector           → #element-id                    confidence: 0.95
2. data-testid           → [data-testid="value"]          confidence: 0.90
3. ARIA label            → [aria-label="value"]           confidence: 0.85
4. Role + name           → [role="button"][aria-label=""] confidence: 0.80
5. Text content          → //button[contains(text(),"")]  confidence: 0.70
6. Class combination     → button.btn.btn-primary         confidence: 0.60
```

Plus automatic handling of:
- **StaleElementReference** — re-queries element after DOM mutation
- **TimeoutError** — suggests explicit waits
- **ClickIntercepted** — scrolls element into view, dismisses overlays
- **Cached healing** — instant fix if selector was healed before

With **Ollama integration**: AI generates completely new selectors when all 6 strategies fail.

---

## Install

```bash
npm install @qantum/self-healing
# or
yarn add @qantum/self-healing
# or
pnpm add @qantum/self-healing
```

Requires: **Node.js 18+**, **TypeScript 5+**

Optional: [Ollama](https://ollama.ai) running locally for AI-powered healing.

---

## Quick Start

### With Playwright

```typescript
import { chromium } from 'playwright';
import { SelfHealingEngine, createHealingProxy } from '@qantum/self-healing';

const browser = await chromium.launch();
const page = await browser.newPage();

// Wrap your page with healing proxy
const healingPage = createHealingProxy(page);

// Now ALL selectors auto-heal on failure
await healingPage.click('#submit-btn');           // auto-heals if not found
await healingPage.fill('#email-input', 'test@'); // auto-heals if selector changed
await healingPage.waitForSelector('.success');   // auto-heals on timeout

await browser.close();
```

### Standalone (any test framework)

```typescript
import { SelfHealingEngine, FailureContext } from '@qantum/self-healing';

const engine = SelfHealingEngine.getInstance();

// Register custom strategy
engine.registerStrategy({
  name: 'MyCustomStrategy',
  priority: 1,
  canHeal: (failure) => failure.error.includes('my-app-specific-error'),
  heal: async (failure) => ({
    healed: true,
    strategy: 'MyCustomStrategy',
    newSelector: '[data-id="fallback"]',
    confidence: 0.8,
    explanation: 'Custom app-specific healing',
    shouldSave: true,
  }),
});

// Heal any failure
const result = await engine.heal(failureContext);
```

### With AI (Ollama)

```typescript
import { SelfHealingEngine, OllamaManager } from '@qantum/self-healing';

// Ensure Ollama is running: `ollama serve`
const ollama = OllamaManager.getInstance();
await ollama.ensureRunning();
const model = await ollama.adaptModel(); // picks best available model

const engine = SelfHealingEngine.getInstance();
engine.enableAI(ollama); // AI kicks in when 6 strategies fail

const result = await engine.heal(failure);
// If strategies fail → Ollama generates selector from DOM snapshot
```

---

## API Reference

### `SelfHealingEngine`

```typescript
// Singleton
const engine = SelfHealingEngine.getInstance();

// Core
engine.heal(failure: FailureContext): Promise<HealingResult>
engine.healBatch(failures: FailureContext[]): Promise<HealingResult[]>

// Strategies
engine.registerStrategy(strategy: HealingStrategy): void
engine.unregisterStrategy(name: string): boolean
engine.getStrategies(): HealingStrategy[]

// History & cache
engine.getHistory(testId: string): HealingHistory[]
engine.clearCache(): void
engine.exportHistory(): HealingHistory[]

// AI
engine.enableAI(ollama: OllamaManager): void
engine.disableAI(): void
```

### `SelectorGenerator`

```typescript
// Generate all selector alternatives for an element
SelectorGenerator.generateAlternatives(element: ElementContext): SelectorAlternative[]

// Find best selector (sorted by confidence)
SelectorGenerator.findBestSelector(alternatives: SelectorAlternative[]): SelectorAlternative | null
```

### `PatternRecognizer`

```typescript
const recognizer = PatternRecognizer.getInstance();

// Learn from test execution
recognizer.recordExecution(data: ExecutionData): void

// Find patterns in failures
recognizer.recognize(features: number[]): RecognitionResult

// Predict failure probability
recognizer.predictFailure(testId: string): number  // 0.0–1.0
```

### `OllamaManager`

```typescript
const ollama = OllamaManager.getInstance();

ollama.ensureRunning(): Promise<boolean>       // start if not running
ollama.adaptModel(): Promise<string>           // picks best available model
ollama.getAvailableModels(): Promise<Model[]>
ollama.generate(prompt: string): Promise<string>
ollama.checkStatus(): Promise<boolean>
```

---

## Full Self-Healing Results

This library powers the QA automation layer of **[AETERNA](https://aeterna.website)** — a production cybersecurity and QA platform.

Real-world metrics from AETERNA's test suite:

| Metric | Value |
|--------|-------|
| Test suite size | 2,407 automated tasks |
| Selector healing hit rate | **94%** |
| Manual QA interventions | **0** (last 90 days) |
| Average heal time | **< 50ms** |
| AI-assisted heals | **6%** of total heals |
| Full pipeline run | **35.18 seconds** |

> "Your tests fix themselves while you sleep."

---

## What This Library Does NOT Include

This is the **open-source demo** of the self-healing engine.

The full [AETERNA platform](https://aeterna.website) includes:

| Feature | Open Source | AETERNA Pro |
|---------|-------------|-------------|
| Self-healing engine (6 strategies) | ✅ | ✅ |
| Pattern recognition | ✅ | ✅ |
| Ollama AI integration | ✅ | ✅ |
| Playwright proxy wrapper | ✅ | ✅ |
| **Ghost Protocol security scanner** | ❌ | ✅ |
| **NIS2 automated audit reports** | ❌ | ✅ |
| **WAF bypass + TLS fingerprinting** | ❌ | ✅ |
| **HiveMind threat intelligence** | ❌ | ✅ |
| **Rust NAPI signal processor (<100ns)** | ❌ | ✅ |
| **SaaS dashboard + API** | ❌ | ✅ |

→ **[Start free at aeterna.website](https://aeterna.website)**

---

## Contributing

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

```bash
git clone https://github.com/QAntum-Fortres/qantum-self-healing
cd qantum-self-healing
npm install
npm run build
npm test
```

---

## License

MIT © [Dimitar Prodromov](https://www.linkedin.com/in/qantum/) — [AETERNA Technologies](https://aeterna.website)

---

<p align="center">
  Built in Sofia, Bulgaria · Part of the <a href="https://aeterna.website">AETERNA</a> platform<br>
  <a href="https://aeterna.website">Website</a> · 
  <a href="https://github.com/QAntum-Fortres/QAntum">GitHub</a> · 
  <a href="https://www.linkedin.com/in/qantum/">LinkedIn</a>
</p>
