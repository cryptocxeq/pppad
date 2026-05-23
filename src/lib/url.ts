import { isPebblePadViewerHref } from "../extract/pdf.js";

/** Workbook quick-navigation dropdown only (strict — no full-document fallback when used alone). */
export const PEBBLEPAD_QUICK_NAV_LINK_SCOPE = "#quick-navigation-dropdown-container";

/**
 * Default workbook crawl: quick navigation **and** the main workbook canvas (`querySelectorAll` roots).
 * Strict mode — no fallback to the full document when both subtrees exist but contain no links yet.
 */
export const PEBBLEPAD_WORKBOOK_DEFAULT_LINK_SCOPE =
  "#quick-navigation-dropdown-container, .workbook-builder-wrapper";

function isPebblePadWorkbookStrictLinkScope(selector: string): boolean {
  return selector === PEBBLEPAD_QUICK_NAV_LINK_SCOPE || selector === PEBBLEPAD_WORKBOOK_DEFAULT_LINK_SCOPE;
}

export function normalizeUrlKey(url: string): string {
  return normalizeCrawlUrlKey(url, false);
}

/**
 * When the user did not pass `--link-scope`, default PebblePad v3 **workbook** hash routes to the
 * quick-navigation panel plus the workbook builder so in-page links are queued like nav links (no clicking).
 */
export function defaultPebblePadWorkbookLinkScope(startUrl: string): string | null {
  try {
    const u = new URL(startUrl);
    if (!/pebblepad\.co\.uk$/i.test(u.hostname)) return null;
    if (u.hash.toLowerCase().includes("#/workbook/")) return PEBBLEPAD_WORKBOOK_DEFAULT_LINK_SCOPE;
    return null;
  } catch {
    return null;
  }
}

export type ResolvedCrawlLinkScope = {
  selector: string | null;
  /** When true, an empty scoped result does not fall back to `document` (see `collectCrawlCandidateHrefs`). */
  strict: boolean;
};

/**
 * Resolve `--link-scope`: explicit selector wins; otherwise PebblePad workbook URLs get the default
 * workbook scope (quick nav + builder canvas).
 */
export function resolveCrawlLinkScope(startUrl: string, cliLinkScope: string | null): ResolvedCrawlLinkScope {
  const trimmed = cliLinkScope?.trim() ? cliLinkScope.trim() : null;
  if (trimmed) {
    return {
      selector: trimmed,
      strict: isPebblePadWorkbookStrictLinkScope(trimmed),
    };
  }
  const def = defaultPebblePadWorkbookLinkScope(startUrl);
  if (def) return { selector: def, strict: true };
  return { selector: null, strict: false };
}

/**
 * Normalize URLs for crawl de-duplication.
 *
 * - By default, strips `#fragment` (many SPAs misuse hashes; keeping them is opt-in).
 * - Always normalizes query parameter ordering for stability.
 */
export function normalizeCrawlUrlKey(url: string, preserveHash: boolean): string {
  try {
    const u = new URL(url);
    if (!preserveHash) u.hash = "";
    u.search = sortQueryString(u.search);
    return u.toString();
  } catch {
    return url;
  }
}

function sortQueryString(search: string): string {
  if (!search || search === "?") return "";
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const keys = [...new Set([...params.keys()])].sort();
  const next = new URLSearchParams();
  for (const k of keys) {
    const values = params.getAll(k).sort();
    for (const v of values) next.append(k, v);
  }
  const s = next.toString();
  return s ? `?${s}` : "";
}

/**
 * Default crawl scope: the **parent directory** of the current path (trailing `/` preserved on the prefix URL).
 *
 * Why: using the full current pathname as the prefix makes *sibling* pages (same folder, different leaf)
 * fail `isAllowedWalkTarget`, which results in an empty queue after the first capture.
 */
export function defaultWalkPrefixForUrl(startUrl: string): string {
  const u = new URL(startUrl);

  let pathname = u.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  const segments = pathname.split("/").filter(Boolean);

  // `/` or `/single-segment` → treat as site-root scope (same as `https://host/`)
  if (segments.length <= 1) {
    return `${u.origin}/`;
  }

  const parentPath = `/${segments.slice(0, -1).join("/")}/`;
  return `${u.origin}${parentPath}`;
}

/**
 * Match hosts that belong to the same “tenant” (e.g. `v3.pebblepad.co.uk` + `atlas.pebblepad.co.uk`
 * both under suffix `pebblepad.co.uk`). Caller must opt in via `sharedHostSuffix`.
 */
export function hostUnderSharedSuffix(hostname: string, suffix: string): boolean {
  const s = suffix.toLowerCase().replace(/^\./, "");
  const h = hostname.toLowerCase();
  return h === s || h.endsWith(`.${s}`);
}

export function isAllowedWalkTarget(
  href: string,
  args: {
    startOrigin: string;
    startHostname: string;
    sameOriginOnly: boolean;
    urlPrefix: string;
    /** e.g. `pebblepad.co.uk` — allow other subdomains of the same registrable suffix */
    sharedHostSuffix: string | null;
  },
): boolean {
  if (shouldSkipLinkForCrawl(href)) return false;

  try {
    const link = new URL(href);
    if (link.protocol !== "http:" && link.protocol !== "https:") return false;

    const startHost = args.startHostname.toLowerCase();
    const federated =
      args.sharedHostSuffix != null &&
      args.sharedHostSuffix.length > 0 &&
      hostUnderSharedSuffix(link.hostname, args.sharedHostSuffix) &&
      hostUnderSharedSuffix(startHost, args.sharedHostSuffix);

    if (args.sameOriginOnly) {
      const sameOrigin = link.origin === args.startOrigin;
      if (!sameOrigin && !federated) return false;
    }

    const prefix = new URL(args.urlPrefix);
    const sameHostAsPrefix = link.origin === prefix.origin;

    if (sameHostAsPrefix) {
      const pp = prefix.pathname.replace(/\/$/, "") || "/";
      const lp = link.pathname;
      if (pp === "/") return true;
      return lp === pp || lp.startsWith(`${pp}/`);
    }

    // Different host than the prefix URL (e.g. atlas vs v3): only with explicit shared suffix.
    if (federated) return true;

    return false;
  } catch {
    return false;
  }
}

export function shouldSkipLinkForCrawl(href: string, opts?: { allowViewerRoutes?: boolean }): boolean {
  if (opts?.allowViewerRoutes !== true && isPebblePadViewerHref(href)) return true;
  try {
    const u = new URL(href);
    if (u.protocol !== "http:" && u.protocol !== "https:") return true;
    const p = u.pathname.toLowerCase();
    return (
      p.endsWith(".png") ||
      p.endsWith(".jpg") ||
      p.endsWith(".jpeg") ||
      p.endsWith(".gif") ||
      p.endsWith(".webp") ||
      p.endsWith(".svg") ||
      p.endsWith(".ico") ||
      p.endsWith(".mp4") ||
      p.endsWith(".webm") ||
      p.endsWith(".mov") ||
      p.endsWith(".mp3") ||
      p.endsWith(".wav") ||
      p.endsWith(".zip") ||
      p.endsWith(".7z")
    );
  } catch {
    return true;
  }
}
