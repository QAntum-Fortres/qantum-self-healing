# Changelog

All notable changes to `@qantum/self-healing` will be documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) · Versioning: [SemVer](https://semver.org/).

---

## [1.0.0] — 2026-02-26

### Added
- `SelfHealingEngine` — singleton healing engine with 5 built-in strategies
- `SelectorGenerator` — 12 selector generation strategies sorted by confidence
- `PatternRecognizer` — pattern learning and failure prediction
- `OllamaManager` — local AI model integration (zero cloud dependency)
- `createHealingProxy()` — Playwright page proxy for drop-in integration
- Cache layer — instant re-heal for previously fixed selectors
- AI fallback via Ollama when all 6 strategies fail
- Full TypeScript types and exports
- Demo scripts: `demo/basic.ts`, `demo/with-ollama.ts`, `demo/playwright-example.ts`

### Healing strategies (v1.0.0)
1. `SelectorNotFound` — generates 12 selector alternatives from element context
2. `StaleElement` — handles React/Vue re-render DOM detachment
3. `Timeout` — suggests explicit wait patterns
4. `ClickIntercepted` — handles overlays and scroll issues
5. `NetworkError` — transient network failure retry guidance
6. `AI-Ollama` — AI-generated selector as final fallback

### Selector generation strategies (SelectorGenerator)
1. `#id` — confidence 0.95
2. `[data-testid="..."]` — confidence 0.90
3. `[data-cy="..."]` — confidence 0.90
4. `[data-qa/e2e/automation]` — confidence 0.88
5. `[aria-label="..."]` — confidence 0.85
6. `[role="..."][aria-label="..."]` — confidence 0.82
7. `tag[name="..."]` — confidence 0.78
8. XPath text match — confidence 0.65–0.72
9. Stable class combination — confidence 0.60
10. Relative to parent ID — confidence 0.64–0.68
11. Structural XPath path — confidence 0.45

---

## Roadmap

- [ ] v1.1.0 — Cypress plugin integration
- [ ] v1.1.0 — WebdriverIO integration helper
- [ ] v1.2.0 — Visual similarity healing via screenshot comparison
- [ ] v1.2.0 — OCR text recognition as healing strategy
- [ ] v1.3.0 — Healing report dashboard (HTML export)
- [ ] v2.0.0 — Distributed healing history sync across CI workers
