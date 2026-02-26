// ─────────────────────────────────────────────────────────────────────────────
// @qantum/self-healing — AI-Powered Healing Demo (Ollama)
// Run: npx ts-node demo/with-ollama.ts
// Requires: Ollama installed and running (https://ollama.ai)
// ─────────────────────────────────────────────────────────────────────────────

import { SelfHealingEngine, OllamaManager } from '../src';

async function runOllamaDemo() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     @qantum/self-healing — AI Demo (Ollama)          ║');
  console.log('║     Requires: ollama serve + ollama pull llama3      ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  // 1. Check Ollama
  const ollama = OllamaManager.getInstance();
  const isRunning = await ollama.checkStatus();

  if (!isRunning) {
    console.log('❌ Ollama is not running.');
    console.log('');
    console.log('To enable AI-powered healing:');
    console.log('  1. Install Ollama: https://ollama.ai/download');
    console.log('  2. Run: ollama serve');
    console.log('  3. Pull a model: ollama pull llama3');
    console.log('  4. Re-run this demo');
    console.log('');
    console.log('Falling back to strategy-based healing...');
    console.log('');
  } else {
    // 2. Pick best model
    const model = await ollama.adaptModel();
    console.log(`✅ Ollama running | Model: ${model}`);
    console.log('');

    // 3. Enable AI on the engine
    const engine = SelfHealingEngine.getInstance();
    engine.enableAI(ollama);

    // 4. Scenario: complex broken selector that no strategy can fix
    console.log('SCENARIO: Complex dynamic selector — all 6 strategies exhausted');
    console.log('  The element has no ID, no data-testid, no aria-label, and a generated class name.');
    console.log('─────────────────────────────────────────────────────────');

    const result = await engine.heal({
      testId: 'ai-heal-001',
      testName: 'Dashboard widget title',
      error: 'Element not found: ._ab3k9._x7z2 > span',
      errorType: 'ElementNotFoundError',
      selector: '._ab3k9._x7z2 > span',
      element: {
        tag: 'span',
        text: 'Revenue Last 30 Days',
        classes: ['_ab3k9x', '_x7z2q'], // auto-generated, changed
        attributes: { 'class': '_ab3k9x _x7z2q' },
        path: '//div[@class="dashboard"]/section[2]/div[1]/span',
        parent: {
          tag: 'div',
          classes: ['widget', 'widget-revenue'],
          attributes: { 'class': 'widget widget-revenue' },
          path: '',
        },
      },
      dom: `<section class="dashboard-section">
  <div class="widget widget-revenue">
    <span class="_ab3k9x _x7z2q">Revenue Last 30 Days</span>
    <div class="widget-value">€24,891</div>
  </div>
</section>`,
      timestamp: Date.now(),
      attempt: 3,
    });

    console.log(`Healed: ${result.healed ? '✅ YES' : '❌ NO'}`);
    console.log(`Strategy: ${result.strategy}`);
    if (result.newSelector) console.log(`New selector: ${result.newSelector}`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    console.log(`Explanation: ${result.explanation}`);
  }

  console.log('');
  console.log('─────────────────────────────────────────────────────────');
  console.log('The full AETERNA platform uses 16 local Ollama models for:');
  console.log('  → AI-powered test healing (this library)');
  console.log('  → Autonomous security vulnerability analysis');
  console.log('  → NIS2 compliance report generation');
  console.log('  → Threat pattern recognition');
  console.log('');
  console.log('All running locally. Zero cloud. 100% EU-sovereign.');
  console.log('→ https://aeterna.website');
  console.log('');
}

runOllamaDemo().catch(console.error);
