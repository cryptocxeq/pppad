import type { Page } from "playwright";

import { isPlaywrightTargetClosedError } from "../lib/playwrightClosed.js";
import { sleep } from "../lib/sleep.js";

export type CrawlNavigateWaitUntil = "domcontentloaded" | "load" | "networkidle";

/** Human-readable label for PebblePad loading checks (logged on timeout). */
const PEBBLEPAD_LOADING_UI_LABEL =
  "#app-container.loading, loading-spinner[data-hook=\"asset-loading-spinner\"], .app-spinner-wrapper";

/**
 * Wait until PebblePad v3 loading UI has settled: `#app-container` loses `loading`, the asset
 * loading custom element is hidden/absent, and `.app-spinner-wrapper` is not visible.
 * Resolves immediately when signals are absent (non-PebblePad pages).
 * Uses a string predicate for `waitForFunction` so ts/esbuild does not inject `__name` in the browser VM.
 */
export async function waitForPebblePadAppSpinnerHidden(
  page: Page,
  timeoutMs: number,
): Promise<"ok" | "timeout" | "skipped"> {
  if (timeoutMs <= 0) return "skipped";
  const expression = `(() => {
    function hiddenOrAbsent(el) {
      if (!el) return true;
      if (!(el instanceof HTMLElement)) return true;
      const s = window.getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return true;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return true;
      if (el.getAttribute("aria-hidden") === "true") return true;
      return false;
    }
    const app = document.querySelector("#app-container");
    if (app instanceof HTMLElement && app.classList.contains("loading")) return false;
    const wrap = document.querySelector(".app-spinner-wrapper");
    if (wrap && !hiddenOrAbsent(wrap)) return false;
    const asset = document.querySelector(${JSON.stringify("loading-spinner[data-hook=\"asset-loading-spinner\"]")});
    if (asset instanceof HTMLElement && !hiddenOrAbsent(asset)) return false;
    return true;
  })()`;
  try {
    await page.waitForFunction(expression, { timeout: timeoutMs });
    return "ok";
  } catch (err: unknown) {
    if (isPlaywrightTargetClosedError(err)) throw err;
    return "timeout";
  }
}

export type AfterNavigationPauseResult = { spinnerTimedOutPhases: number };

/**
 * After a navigation (or when reusing the current URL), wait for PebblePad's loading UI,
 * run optional scroll-prep, wait for loading UI again (scroll can re-trigger fetches), then settle.
 */
export async function pauseForCrawlCapture(
  page: Page,
  opts: {
    spinnerWaitMs: number;
    autoScroll: boolean;
    scrollPauseMs: number;
    settleMs: number;
  },
): Promise<AfterNavigationPauseResult> {
  let spinnerTimedOutPhases = 0;

  if (opts.spinnerWaitMs > 0) {
    if ((await waitForPebblePadAppSpinnerHidden(page, opts.spinnerWaitMs)) === "timeout") {
      spinnerTimedOutPhases += 1;
      console.warn(
        `[pebblepad] Loading UI (${PEBBLEPAD_LOADING_UI_LABEL}) still present after ${opts.spinnerWaitMs}ms; continuing anyway. (If you closed the browser, the walk will stop at the next step.)`,
      );
    }
  }

  await preparePageForCrawl(page, {
    autoScroll: opts.autoScroll,
    scrollPauseMs: opts.scrollPauseMs,
  });

  if (opts.spinnerWaitMs > 0) {
    if ((await waitForPebblePadAppSpinnerHidden(page, opts.spinnerWaitMs)) === "timeout") {
      spinnerTimedOutPhases += 1;
      console.warn(
        `[pebblepad] Loading UI (${PEBBLEPAD_LOADING_UI_LABEL}) reappeared and did not clear within ${opts.spinnerWaitMs}ms; continuing anyway. (If you closed the browser, the walk will stop at the next step.)`,
      );
    }
  }

  if (opts.settleMs > 0) {
    await sleep(opts.settleMs);
  }

  return { spinnerTimedOutPhases };
}

/**
 * Scroll the page to encourage lazy-loaded nav/menus to mount real `<a href>` nodes.
 * Ends near the top again so captures start from a consistent viewport.
 */
export async function preparePageForCrawl(
  page: Page,
  opts: { autoScroll: boolean; scrollPauseMs: number },
): Promise<void> {
  if (!opts.autoScroll) return;

  await page.evaluate(() => {
    const maxRounds = 48;
    const step = Math.max(240, Math.floor(window.innerHeight * 0.85));
    let stable = 0;

    for (let i = 0; i < maxRounds; i += 1) {
      const beforeTop = window.scrollY;
      const beforeH = document.documentElement.scrollHeight;

      window.scrollBy(0, step);

      const afterTop = window.scrollY;
      const afterH = document.documentElement.scrollHeight;

      const moved = afterTop !== beforeTop || afterH !== beforeH;
      if (!moved) stable += 1;
      else stable = 0;

      if (stable >= 3) break;

      if (window.innerHeight + window.scrollY >= afterH - 4) {
        stable += 1;
        if (stable >= 2) break;
      }
    }

    window.scrollTo(0, 0);
  });

  if (opts.scrollPauseMs > 0) {
    await sleep(opts.scrollPauseMs);
  }
}

/**
 * Collect http(s) targets from `<a href>` / `<area href>` including **open** shadow roots.
 * Still deterministic: no clicking, no AI — just more complete DOM harvesting.
 *
 * When `scopeSelector` is provided, only links inside matching element(s) are collected.
 * If the selector matches nodes but none of them contain any links yet, discovery can fall back
 * to the full document unless `opts.fallbackToDocumentWhenEmpty` is `false` (used for strict
 * quick-navigation harvesting on PebblePad workbooks, or the default compound workbook scope).
 */
export async function collectCrawlCandidateHrefs(
  page: Page,
  maxHrefs: number,
  scopeSelector?: string | null,
  opts?: { fallbackToDocumentWhenEmpty?: boolean },
): Promise<string[]> {
  const allowFallback = opts?.fallbackToDocumentWhenEmpty !== false;
  // Expression-only script: (1) tsx/esbuild cannot inject `__name` into serialized
  // function bodies for the browser VM; (2) string `page.evaluate` is not invoked
  // with args in Playwright 1.49 when `isFunction` is false, so embed params via JSON.
  const expression = `(() => {
    const max = ${JSON.stringify(maxHrefs)};
    const scope = ${JSON.stringify(scopeSelector ?? null)};
    const allowFallback = ${JSON.stringify(allowFallback)};
    const seen = new Set();
    const out = [];
    function pushHref(raw) {
      if (!raw) return;
      try {
        const abs = new URL(raw, document.baseURI).href;
        if (seen.has(abs)) return;
        seen.add(abs);
        out.push(abs);
      } catch {}
    }
    function visitRoot(root) {
      root.querySelectorAll("a[href], area[href]").forEach((el) => {
        if (out.length >= max) return;
        const href = el.getAttribute("href");
        if (!href) return;
        pushHref(href);
      });
      if (out.length >= max) return;
      root.querySelectorAll("*").forEach((el) => {
        if (out.length >= max) return;
        const sr = el.shadowRoot;
        if (sr) visitRoot(sr);
      });
    }
    if (scope) {
      const scopeEls = document.querySelectorAll(scope);
      if (scopeEls.length === 0) {
        if (allowFallback) visitRoot(document);
      } else {
        scopeEls.forEach((el) => {
          if (out.length >= max) return;
          visitRoot(el);
        });
        if (out.length === 0 && allowFallback) {
          visitRoot(document);
        }
      }
    } else {
      visitRoot(document);
    }
    return out.slice(0, max);
  })()`;
  return page.evaluate(expression);
}
