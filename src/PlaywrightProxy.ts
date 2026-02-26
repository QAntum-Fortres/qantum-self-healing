// ─────────────────────────────────────────────────────────────────────────────
// @qantum/self-healing — Playwright Proxy
// Wraps a Playwright Page object so all interactions auto-heal on failure
// ─────────────────────────────────────────────────────────────────────────────

import { SelfHealingEngine } from './SelfHealingEngine';
import type { FailureContext, ElementContext } from './types';

type PlaywrightPage = {
  click(selector: string, options?: any): Promise<void>;
  fill(selector: string, value: string, options?: any): Promise<void>;
  waitForSelector(selector: string, options?: any): Promise<any>;
  locator(selector: string): any;
  evaluate(fn: any, ...args: any[]): Promise<any>;
  [key: string]: any;
};

/**
 * Wrap a Playwright page so that selector-based failures trigger auto-healing.
 *
 * @example
 * const healingPage = createHealingProxy(page);
 * await healingPage.click('#submit-btn'); // auto-heals if selector breaks
 */
export function createHealingProxy(page: PlaywrightPage): PlaywrightPage {
  const engine = SelfHealingEngine.getInstance();

  const healAndRetry = async (method: string, selector: string, args: any[]): Promise<any> => {
    try {
      return await (page as any)[method](selector, ...args);
    } catch (originalError: any) {
      console.log(`[HealingProxy] ${method}('${selector}') failed — attempting healing...`);

      // Try to get element context from DOM for better healing
      let element: ElementContext | undefined;
      try {
        element = await extractElementContext(page, selector);
      } catch {
        // Ignore — we'll heal without element context
      }

      // Initialize from options if provided
      const userOptions = args.length > 0 ? args[args.length - 1] : {};
      if (!element && userOptions && (userOptions.qantumTargetText || userOptions.qantumRole)) {
        element = {
          tag: userOptions.qantumRole || 'any',
          text: userOptions.qantumTargetText,
          classes: [],
          attributes: {},
          path: ''
        };
      }

      const failure: FailureContext = {
        testId: `proxy-${Date.now()}`,
        testName: `${method}(${selector})`,
        error: originalError.message ?? String(originalError),
        errorType: originalError.constructor?.name ?? 'UnknownError',
        selector,
        element,
        timestamp: Date.now(),
        attempt: 1,
      };

      const result = await engine.heal(failure);

      if (result.healed && result.newSelector) {
        console.log(`[HealingProxy] ✓ Healed selector: ${selector} → ${result.newSelector}`);
        try {
          return await (page as any)[method](result.newSelector, ...args);
        } catch (retryError: any) {
          throw new Error(
            `[HealingProxy] Healed selector also failed for ${method}('${result.newSelector}'): ${retryError.message}`
          );
        }
      }

      // Could not heal — re-throw original
      throw originalError;
    }
  };

  return new Proxy(page, {
    get(target, prop: string) {
      if (prop === 'click') {
        return (selector: string, options?: any) =>
          healAndRetry('click', selector, options ? [options] : []);
      }
      if (prop === 'fill') {
        return (selector: string, value: string, options?: any) =>
          healAndRetry('fill', selector, options ? [value, options] : [value]);
      }
      if (prop === 'waitForSelector') {
        return (selector: string, options?: any) =>
          healAndRetry('waitForSelector', selector, options ? [options] : []);
      }
      if (prop === 'locator') {
        return (selector: string) => {
          // Wraped locator with healing on action calls
          const loc = target.locator(selector);
          return new Proxy(loc, {
            get(locTarget, locProp: string) {
              if (['click', 'fill', 'type', 'check', 'uncheck', 'selectOption'].includes(locProp)) {
                return (...locArgs: any[]) =>
                  healAndRetry(locProp, selector, locArgs);
              }
              const val = locTarget[locProp];
              return typeof val === 'function' ? val.bind(locTarget) : val;
            },
          });
        };
      }
      const val = (target as any)[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    },
  });
}

/**
 * Attempt to extract element context from the DOM for a broken selector.
 * Used to give the healing engine more information.
 */
async function extractElementContext(
  page: PlaywrightPage,
  selector: string
): Promise<ElementContext | undefined> {
  try {
    // Try to find element — it might exist under a different selector
    const element = await page.evaluate((sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return null;

      const attrs: Record<string, string> = {};
      for (const attr of Array.from(el.attributes) as any[]) {
        attrs[attr.name] = attr.value;
      }

      let path = '';
      let current: Element | null = el;
      const parts: string[] = [];
      while (current && current !== document.body) {
        let part = current.tagName.toLowerCase();
        const idx = Array.from(current.parentElement?.children ?? []).indexOf(current);
        if (idx >= 0) part += `[${idx + 1}]`;
        parts.unshift(part);
        current = current.parentElement;
      }
      path = '//' + parts.join('/');

      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || undefined,
        classes: Array.from(el.classList),
        text: el.textContent?.trim().slice(0, 100),
        attributes: attrs,
        path,
      };
    }, selector);

    return element ?? undefined;
  } catch {
    return undefined;
  }
}
