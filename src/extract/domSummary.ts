import type { Page } from "playwright";

export type CaptureQuality = "rich" | "placeholder-only" | "viewer-shell" | "minimal";

export type DomSummary = {
  capturedAtIso: string;
  title: string;
  url: string;
  viewport: { width: number; height: number };
  tagCounts: Record<string, number>;
  ids: string[];
  classNames: string[];
  dataAttributeNames: string[];
  formFields: Array<{ tag: string; type?: string; name?: string; id?: string; required?: boolean }>;
  landmarkRoles: Array<{ role: string; tag: string; id?: string; label?: string }>;
  linkCount: number;
  videoCount: number;
  trackCount: number;
  captureQuality?: CaptureQuality;
  contentWait?: "ready" | "timeout" | "skipped";
  workbookVisibleCharCount?: number;
  linkedDocumentCount?: number;
  linkedDocumentsWithText?: number;
};

type DomStructuralSummary = Omit<
  DomSummary,
  | "capturedAtIso"
  | "title"
  | "url"
  | "viewport"
  | "captureQuality"
  | "contentWait"
  | "workbookVisibleCharCount"
  | "linkedDocumentCount"
  | "linkedDocumentsWithText"
>;

export async function evaluateDomStructuralSummary(page: Page): Promise<DomStructuralSummary> {
  const expression = `(() => {
    const tagCounts = {};
    const idSet = new Set();
    const classSet = new Set();
    const dataNameSet = new Set();
    function walk(el) {
      const tag = el.tagName.toLowerCase();
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      const id = el.getAttribute("id");
      if (id) idSet.add(id);
      const cls = el.getAttribute("class");
      if (cls) {
        for (const c of cls.split(/\\s+/g)) {
          if (c) classSet.add(c);
        }
      }
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith("data-")) {
          dataNameSet.add(attr.name);
        }
      }
      for (const child of el.children) {
        walk(child);
      }
    }
    walk(document.documentElement);
    const formFields = [];
    for (const el of document.querySelectorAll("input, textarea, select, button")) {
      if (!(el instanceof HTMLElement)) continue;
      const tag = el.tagName.toLowerCase();
      const type = el instanceof HTMLInputElement ? el.type : undefined;
      const name = el.getAttribute("name") || undefined;
      const id = el.getAttribute("id") || undefined;
      const required = el.hasAttribute("required") || el.getAttribute("aria-required") === "true";
      formFields.push({ tag, type, name, id, required });
      if (formFields.length >= 400) break;
    }
    const landmarkRoles = [];
    for (const el of document.querySelectorAll('[role="main"], [role="navigation"], main, nav, article')) {
      if (!(el instanceof HTMLElement)) continue;
      const explicit = el.getAttribute("role");
      const implicit =
        el.tagName.toLowerCase() === "main"
          ? "main"
          : el.tagName.toLowerCase() === "nav"
            ? "navigation"
            : el.tagName.toLowerCase() === "article"
              ? "article"
              : undefined;
      const role = explicit || implicit;
      if (!role) continue;
      landmarkRoles.push({
        role,
        tag: el.tagName.toLowerCase(),
        id: el.getAttribute("id") || undefined,
        label: el.getAttribute("aria-label") || undefined,
      });
      if (landmarkRoles.length >= 50) break;
    }
    const linkCount = document.querySelectorAll("a[href]").length;
    const videoCount = document.querySelectorAll("video").length;
    const trackCount = document.querySelectorAll("video track, track").length;
    function take(s, n) {
      return Array.from(s).sort((a, b) => a.localeCompare(b)).slice(0, n);
    }
    return {
      tagCounts,
      ids: take(idSet, 400),
      classNames: take(classSet, 500),
      dataAttributeNames: take(dataNameSet, 200),
      formFields,
      landmarkRoles,
      linkCount,
      videoCount,
      trackCount,
    };
  })()`;
  return page.evaluate(expression);
}
