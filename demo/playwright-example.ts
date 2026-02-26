// ─────────────────────────────────────────────────────────────────────────────
// @qantum/self-healing — Playwright Integration Example
// Shows how to wrap a real Playwright page for auto-healing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * This example shows the createHealingProxy() integration.
 *
 * In your actual Playwright tests, replace:
 *   await page.click('#submit-btn')
 * with:
 *   const healingPage = createHealingProxy(page)
 *   await healingPage.click('#submit-btn')
 *
 * Now if #submit-btn breaks, the proxy tries to heal it automatically.
 */

import { createHealingProxy, SelfHealingEngine } from '../src';

// ──────────────────────────────────────────────────────────────────────────────
// Playwright integration (requires: npm install @playwright/test)
// ──────────────────────────────────────────────────────────────────────────────

export async function runPlaywrightDemo() {
  // Uncomment when Playwright is installed:
  // const { chromium } = require('playwright');
  // const browser = await chromium.launch({ headless: false });
  // const context = await browser.newContext();
  // const page = await context.newPage();

  // const healingPage = createHealingProxy(page);

  // All these calls auto-heal on failure:
  // await healingPage.goto('https://your-app.example.com');
  // await healingPage.click('#submit-btn');          // heals if selector breaks
  // await healingPage.fill('#email', 'test@test.com'); // heals if selector breaks
  // await healingPage.waitForSelector('.success');    // heals on timeout

  // await browser.close();

  console.log('');
  console.log('Playwright Proxy — Usage Pattern:');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('  import { createHealingProxy } from "@qantum/self-healing";');
  console.log('  import { chromium } from "playwright";');
  console.log('');
  console.log('  const browser = await chromium.launch();');
  console.log('  const page = await browser.newPage();');
  console.log('');
  console.log('  // Wrap the page — one line change');
  console.log('  const healingPage = createHealingProxy(page);');
  console.log('');
  console.log('  // All interactions now auto-heal on failure');
  console.log('  await healingPage.click("#submit-btn");');
  console.log('  await healingPage.fill("#email", "test@example.com");');
  console.log('  await healingPage.waitForSelector(".success");');
  console.log('');
  console.log('  // If #submit-btn is gone → engine finds [data-testid="submit-btn"]');
  console.log('  // automatically and retries. Your test passes. 🎉');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}

// ──────────────────────────────────────────────────────────────────────────────
// Playwright Test Integration (playwright.config.ts style)
// ──────────────────────────────────────────────────────────────────────────────

export const PLAYWRIGHT_CONFIG_EXAMPLE = `
// playwright.config.ts — with self-healing
import { defineConfig } from '@playwright/test';
import { SelfHealingEngine } from '@qantum/self-healing';

export default defineConfig({
  // Global setup: initialize healing engine
  globalSetup: async () => {
    const engine = SelfHealingEngine.getInstance();
    console.log('[Config] Self-healing engine ready with', engine.getStats().strategiesRegistered, 'strategies');
  },

  use: {
    // Your normal Playwright config
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  retries: 0, // No retries needed — self-healing handles failures
  timeout: 30_000,
});
`;

export const TEST_EXAMPLE = `
// example.spec.ts — self-healing Playwright test
import { test, expect } from '@playwright/test';
import { createHealingProxy, SelfHealingEngine } from '@qantum/self-healing';

test('user can complete checkout', async ({ page }) => {
  const healPage = createHealingProxy(page);
  
  await healPage.goto('/checkout');
  await healPage.fill('#email', 'customer@example.com');   // auto-heals
  await healPage.fill('#card-number', '4111111111111111'); // auto-heals
  await healPage.click('#submit-payment');                  // auto-heals
  
  await expect(page.locator('.success-message')).toBeVisible();
});

test.afterAll(() => {
  const stats = SelfHealingEngine.getInstance().getStats();
  console.log('Healing stats:', stats);
});
`;

runPlaywrightDemo();
console.log('Playwright config example:');
console.log(PLAYWRIGHT_CONFIG_EXAMPLE);
