// ─────────────────────────────────────────────────────────────────────────────
// @qantum/self-healing — Basic Demo
// Run: npx ts-node demo/basic.ts
// ─────────────────────────────────────────────────────────────────────────────

import { SelfHealingEngine, SelectorGenerator } from '../src';

async function runDemo() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     @qantum/self-healing — Basic Demo                ║');
  console.log('║     https://aeterna.website                          ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  const engine = SelfHealingEngine.getInstance();

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario 1: Button renamed — data-testid changed
  // ──────────────────────────────────────────────────────────────────────────
  console.log('SCENARIO 1: Button was renamed from #submit-btn to [data-testid="submit-button"]');
  console.log('─────────────────────────────────────────────────────────');

  const result1 = await engine.heal({
    testId: 'checkout-001',
    testName: 'User can complete checkout',
    error: 'Element not found: #submit-btn',
    errorType: 'ElementNotFoundError',
    selector: '#submit-btn',
    element: {
      tag: 'button',
      text: 'Complete Order',
      classes: ['btn', 'btn-primary', 'btn-lg'],
      attributes: {
        'data-testid': 'submit-button',
        'aria-label': 'Complete Order',
        'type': 'submit',
      },
      path: '//form[@id="checkout-form"]/div[3]/button',
    },
    timestamp: Date.now(),
    attempt: 1,
  });

  console.log(`Healed: ${result1.healed ? '✅ YES' : '❌ NO'}`);
  console.log(`Strategy: ${result1.strategy}`);
  console.log(`New selector: ${result1.newSelector}`);
  console.log(`Confidence: ${(result1.confidence * 100).toFixed(0)}%`);
  console.log(`Explanation: ${result1.explanation}`);
  console.log('');

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario 2: Stale element after React re-render
  // ──────────────────────────────────────────────────────────────────────────
  console.log('SCENARIO 2: Stale element after React state update');
  console.log('─────────────────────────────────────────────────────────');

  const result2 = await engine.heal({
    testId: 'cart-002',
    testName: 'User can remove item from cart',
    error: 'StaleElementReferenceError: Element is no longer attached to the DOM',
    errorType: 'StaleElementReferenceError',
    selector: '.cart-item:nth-child(1) .remove-btn',
    timestamp: Date.now(),
    attempt: 1,
  });

  console.log(`Healed: ${result2.healed ? '✅ YES' : '❌ NO'}`);
  console.log(`Strategy: ${result2.strategy}`);
  console.log(`Explanation: ${result2.explanation}`);
  console.log('');

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario 3: Timeout on slow network
  // ──────────────────────────────────────────────────────────────────────────
  console.log('SCENARIO 3: Timeout waiting for payment confirmation');
  console.log('─────────────────────────────────────────────────────────');

  const result3 = await engine.heal({
    testId: 'payment-003',
    testName: 'Payment confirmation appears within 5 seconds',
    error: 'TimeoutError: Waiting for .payment-success failed: timeout 5000ms exceeded',
    errorType: 'TimeoutError',
    selector: '.payment-success',
    timestamp: Date.now(),
    attempt: 1,
  });

  console.log(`Healed: ${result3.healed ? '✅ YES' : '❌ NO'}`);
  console.log(`Strategy: ${result3.strategy}`);
  console.log(`Explanation: ${result3.explanation}`);
  console.log('');

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario 4: Cache hit — same selector healed again
  // ──────────────────────────────────────────────────────────────────────────
  console.log('SCENARIO 4: Same broken selector — should use cache');
  console.log('─────────────────────────────────────────────────────────');

  const result4 = await engine.heal({
    testId: 'checkout-004',
    testName: 'Another checkout test with same broken selector',
    error: 'Element not found: #submit-btn',
    errorType: 'ElementNotFoundError',
    selector: '#submit-btn',
    element: {
      tag: 'button',
      text: 'Complete Order',
      classes: ['btn', 'btn-primary'],
      attributes: { 'data-testid': 'submit-button' },
      path: '//form/button',
    },
    timestamp: Date.now(),
    attempt: 1,
  });

  console.log(`Healed: ${result4.healed ? '✅ YES' : '❌ NO'}`);
  console.log(`Strategy: ${result4.strategy} (from cache — instant!)`);
  console.log(`New selector: ${result4.newSelector}`);
  console.log(`Duration: ${result4.duration}ms`);
  console.log('');

  // ──────────────────────────────────────────────────────────────────────────
  // Stats
  // ──────────────────────────────────────────────────────────────────────────
  const stats = engine.getStats();
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  SESSION STATS                                       ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Total attempts:  ${stats.totalAttempts.toString().padEnd(33)}║`);
  console.log(`║  Total healed:    ${stats.totalHealed.toString().padEnd(33)}║`);
  console.log(`║  Heal rate:       ${(stats.healRate + '%').padEnd(33)}║`);
  console.log(`║  Cache entries:   ${stats.cacheSize.toString().padEnd(33)}║`);
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Want automatic NIS2 security scanning too?');
  console.log('→ https://aeterna.website');
  console.log('');

  // ──────────────────────────────────────────────────────────────────────────
  // Bonus: Show selector alternatives for an element
  // ──────────────────────────────────────────────────────────────────────────
  console.log('BONUS: All selector alternatives for a form button');
  console.log('─────────────────────────────────────────────────────────');

  const alternatives = SelectorGenerator.generateAlternatives({
    tag: 'button',
    id: undefined,
    text: 'Save Changes',
    classes: ['btn', 'btn-success'],
    attributes: {
      'data-testid': 'save-btn',
      'data-cy': 'save-changes',
      'aria-label': 'Save Changes',
      'type': 'submit',
      'name': 'save',
    },
    path: '//form[@id="settings"]/footer/button[1]',
    parent: { tag: 'footer', classes: ['form-footer'], attributes: {}, path: '' },
  });

  alternatives.forEach((alt, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. [${(alt.type).padEnd(14)}] confidence: ${(alt.confidence * 100).toFixed(0).padStart(3)}%  →  ${alt.selector}`);
  });

  console.log('');
}

runDemo().catch(console.error);
