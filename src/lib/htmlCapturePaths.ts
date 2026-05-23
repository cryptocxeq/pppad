import path from "node:path";

/** Stable short slug for HTML filenames from a captured URL. */
export function urlCaptureSlug(url: string, preserveHash: boolean): string {
  try {
    const u = new URL(url);
    if (preserveHash) {
      const pageId = u.hash.match(/pageId=([^&]+)/i)?.[1];
      if (pageId) return pageId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 36);
    }
    const pathPart = u.pathname
      .replace(/^\/+|\/+$/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .slice(0, 60);
    if (pathPart) return pathPart;
    return u.hostname.replace(/\./g, "-").slice(0, 40);
  } catch {
    return "page";
  }
}

export function sessionDomDir(outDir: string, sessionStamp: string): string {
  return path.join(outDir, `pebblepad-dom-${sessionStamp}`);
}

export function pageHtmlBasename(index: number, slug: string): string {
  return `p${String(index).padStart(3, "0")}-${slug}`;
}
