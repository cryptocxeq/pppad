import type { Page } from "playwright";

import { isPlaceholderOnlyVisibleText } from "../lib/placeholderText.js";
import { PEBBLEPAD_WORKBOOK_DEFAULT_LINK_SCOPE } from "../lib/url.js";
import { sleep } from "../lib/sleep.js";

const WORKBOOK_SCOPE = PEBBLEPAD_WORKBOOK_DEFAULT_LINK_SCOPE.split(",")[1]!.trim();

export async function readWorkbookVisibleText(
  page: Page,
  scopeSelector = WORKBOOK_SCOPE,
): Promise<string> {
  const expression = `(() => {
    const sel = ${JSON.stringify(scopeSelector)};
    const roots = document.querySelectorAll(sel);
    const parts = [];
    const use = roots.length > 0 ? Array.from(roots) : [document.querySelector("main") || document.body];
    for (const root of use) {
      const t = (root.innerText || "").replace(/\\s+\\n/g, "\\n").trim();
      if (t) parts.push(t);
    }
    return parts.join("\\n\\n");
  })()`;
  return page.evaluate(expression);
}

/**
 * After spinners clear, PebblePad workbook pages often mount brief text / blocks late.
 * Poll until workbook innerText is not placeholder-only or timeout.
 */
export async function waitForPebblePadWorkbookContent(
  page: Page,
  opts: { contentWaitMs: number; scopeSelector?: string; pollMs?: number },
): Promise<"ready" | "timeout" | "skipped"> {
  if (opts.contentWaitMs <= 0) return "skipped";

  const scope = opts.scopeSelector ?? WORKBOOK_SCOPE;
  const pollMs = opts.pollMs ?? 750;
  const deadline = Date.now() + opts.contentWaitMs;

  while (Date.now() < deadline) {
    const text = await readWorkbookVisibleText(page, scope);
    if (!isPlaceholderOnlyVisibleText(text)) return "ready";
    await sleep(pollMs);
  }

  return "timeout";
}
