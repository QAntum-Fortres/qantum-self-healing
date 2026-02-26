// ─────────────────────────────────────────────────────────────────────────────
// @qantum/self-healing — Selector Generator
// Generates alternative selectors for broken elements, sorted by confidence
// ─────────────────────────────────────────────────────────────────────────────

import { ElementContext, SelectorAlternative } from './types';

export class SelectorGenerator {
  /**
   * Generate all possible alternative selectors for an element.
   * Returns sorted by confidence descending.
   */
  static generateAlternatives(element: ElementContext): SelectorAlternative[] {
    const alternatives: SelectorAlternative[] = [];

    // 1. ID — highest confidence
    if (element.id) {
      alternatives.push({
        selector: `#${element.id}`,
        type: 'id',
        confidence: 0.95,
        reason: 'Unique ID selector',
      });
    }

    // 2. data-testid (Jest/Testing Library standard)
    if (element.attributes['data-testid']) {
      alternatives.push({
        selector: `[data-testid="${element.attributes['data-testid']}"]`,
        type: 'data-attribute',
        confidence: 0.9,
        reason: 'Test-specific data attribute',
      });
    }

    // 3. data-cy (Cypress standard)
    if (element.attributes['data-cy']) {
      alternatives.push({
        selector: `[data-cy="${element.attributes['data-cy']}"]`,
        type: 'data-attribute',
        confidence: 0.9,
        reason: 'Cypress data attribute',
      });
    }

    // 4. data-qa / data-e2e / data-automation
    for (const attr of ['data-qa', 'data-e2e', 'data-automation', 'data-id']) {
      if (element.attributes[attr]) {
        alternatives.push({
          selector: `[${attr}="${element.attributes[attr]}"]`,
          type: 'data-attribute',
          confidence: 0.88,
          reason: `E2E data attribute: ${attr}`,
        });
      }
    }

    // 5. aria-label
    if (element.attributes['aria-label']) {
      alternatives.push({
        selector: `[aria-label="${element.attributes['aria-label']}"]`,
        type: 'aria',
        confidence: 0.85,
        reason: 'Accessibility label',
      });
    }

    // 6. role + aria-label
    if (element.attributes['role']) {
      const name = element.attributes['aria-label'] || element.text;
      if (name) {
        alternatives.push({
          selector: `[role="${element.attributes['role']}"][aria-label="${name}"]`,
          type: 'aria',
          confidence: 0.82,
          reason: 'Role with accessible name',
        });
      }
    }

    // 7. name attribute (forms)
    if (element.attributes['name']) {
      alternatives.push({
        selector: `${element.tag}[name="${element.attributes['name']}"]`,
        type: 'css',
        confidence: 0.78,
        reason: 'Form element name attribute',
      });
    }

    // 8. type attribute (inputs/buttons)
    if (element.attributes['type'] && element.tag === 'input') {
      alternatives.push({
        selector: `input[type="${element.attributes['type']}"]`,
        type: 'css',
        confidence: 0.5,
        reason: 'Input type selector (may not be unique)',
      });
    }

    // 9. Text content XPath
    if (element.text && element.text.length > 0 && element.text.length < 50) {
      const cleanText = element.text.trim();
      alternatives.push({
        selector: `//${element.tag}[normalize-space(text())="${cleanText}"]`,
        type: 'xpath',
        confidence: 0.72,
        reason: 'Exact text content match',
      });
      alternatives.push({
        selector: `//${element.tag}[contains(text(),"${cleanText}")]`,
        type: 'xpath',
        confidence: 0.65,
        reason: 'Partial text content match',
      });
    }

    // 10. Stable class combination (filter auto-generated class names)
    if (element.classes.length > 0) {
      const stableClasses = element.classes.filter(
        (c) =>
          !c.match(/^(ng-|_[a-z0-9]{5,}|css-[a-z0-9]+|sc-[a-z0-9]+|[a-z]-[a-z0-9]{8,})/)
      );
      if (stableClasses.length > 0) {
        alternatives.push({
          selector: `${element.tag}.${stableClasses.join('.')}`,
          type: 'class',
          confidence: 0.6,
          reason: `Stable class combination: ${stableClasses.join(', ')}`,
        });
      }
    }

    // 11. Relative to parent with ID
    if (element.parent?.id) {
      alternatives.push({
        selector: `#${element.parent.id} ${element.tag}`,
        type: 'relative',
        confidence: 0.68,
        reason: `Descendant of parent #${element.parent.id}`,
      });
      alternatives.push({
        selector: `#${element.parent.id} > ${element.tag}`,
        type: 'relative',
        confidence: 0.64,
        reason: `Direct child of parent #${element.parent.id}`,
      });
    }

    // 12. Structural XPath (lowest confidence — may break on DOM restructuring)
    if (element.path) {
      alternatives.push({
        selector: element.path,
        type: 'xpath',
        confidence: 0.45,
        reason: 'Structural DOM path (fragile)',
      });
    }

    // Sort by confidence descending
    return alternatives.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Return the highest-confidence selector.
   */
  static findBestSelector(alternatives: SelectorAlternative[]): SelectorAlternative | null {
    return alternatives[0] ?? null;
  }

  /**
   * Return all selectors above a confidence threshold.
   */
  static findByMinConfidence(
    alternatives: SelectorAlternative[],
    threshold: number
  ): SelectorAlternative[] {
    return alternatives.filter((a) => a.confidence >= threshold);
  }
}
