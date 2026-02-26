# 🚀 @qantum/self-healing v1.0.0 — Initial Release

> **Self-healing test automation. When your UI changes, your tests fix themselves.**

---

## What's in this release

### Core engine
- `SelfHealingEngine` — singleton with 5 built-in healing strategies + AI fallback
- `SelectorGenerator` — 12 selector generation strategies, sorted by confidence
- `PatternRecognizer` — learns from test failures, predicts future flakiness
- `OllamaManager` — local AI integration — zero cloud dependency

### Playwright integration
- `createHealingProxy(page)` — one-line drop-in wrapper for any Playwright page
- All `click()`, `fill()`, `waitForSelector()`, `locator()` calls auto-heal

### Healing strategies
| Strategy | Handles | Confidence |
|---|---|---|
| `SelectorNotFound` | Missing/renamed elements | up to 0.95 |
| `StaleElement` | React/Vue DOM re-renders | 0.75 |
| `Timeout` | Slow loads, flaky waits | 0.60 |
| `ClickIntercepted` | Overlays, off-screen elements | 0.65 |
| `NetworkError` | Transient connectivity | 0.50 |
| `AI-Ollama` | Everything else | 0.70 |

### Real-world metrics (from AETERNA production)
- **94% heal rate** across 2,407 automated tasks
- **0 manual QA interventions** in last 90 days
- **< 50ms** average heal latency

---

## Install

```bash
npm install @qantum/self-healing
```

## Quick start

```typescript
import { SelfHealingEngine } from '@qantum/self-healing';
const engine = SelfHealingEngine.getInstance();
const result = await engine.heal(failureContext);
```

---

## About

This is the open-source QA layer extracted from **[AETERNA](https://aeterna.website)** — 
a production cybersecurity and QA automation platform (528,582 lines of TypeScript + Rust, 
built solo in Sofia, Bulgaria).

The full AETERNA platform adds autonomous NIS2 security scanning, WAF bypass, 
EU-sovereign local AI inference, and compliance report generation in 35 seconds.

→ **[aeterna.website](https://aeterna.website)**

---

MIT License · [Dimitar Prodromov](https://www.linkedin.com/in/qantum/)
