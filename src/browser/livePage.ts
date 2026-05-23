import type { BrowserContext, Page } from "playwright";

/** If the bound tab closed, switch to another open tab in the same context. */
export function resolveLiveWalkPage(context: BrowserContext, page: Page, tag = "walk"): Page | null {
  if (!page.isClosed()) return page;
  const alive = context.pages().filter((p) => !p.isClosed());
  if (alive.length === 0) return null;
  console.warn(
    `[${tag}] The Chromium tab Playwright was bound to is no longer open; switching to another open tab in the same window.`,
  );
  return alive[alive.length - 1]!;
}
