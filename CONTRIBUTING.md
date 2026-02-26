# Contributing to @qantum/self-healing

Thank you for your interest in contributing!

This library is the open-source QA layer of [AETERNA](https://aeterna.website) — a production cybersecurity and QA automation platform.

---

## Getting Started

```bash
git clone https://github.com/QAntum-Fortres/qantum-self-healing
cd qantum-self-healing
npm install
npm run build
npm test
```

## What to Contribute

**High value contributions:**

- New healing strategies (e.g., visual similarity, OCR text matching)
- Integrations: Cypress, WebdriverIO, Vitest, Jest
- Improved confidence scores for `SelectorGenerator`
- Better pattern recognition for `PatternRecognizer`
- Performance improvements

**Please open an issue first for:**
- New features (to discuss approach before coding)
- Breaking changes to public API

## Pull Request Requirements

- TypeScript strict mode — no `any` without comment
- Tests for new strategies: add to `tests/`
- Update `CHANGELOG.md`
- One concern per PR

## Code Style

- Standard TypeScript — no extra linter required
- Comments on non-obvious logic
- `PascalCase` for classes, `camelCase` for functions/variables

## Issues

Use GitHub Issues for bugs and feature requests.
For security issues — email papica777@gmail.com directly.

---

Built in Sofia, Bulgaria · [AETERNA Technologies](https://aeterna.website)
