import { ExternalLink, FileText, LayoutTemplate, Link2, ListTree } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PageReconstruction } from "@/components/PageReconstruction";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { staticScrapeUrl } from "@/lib/scrapeUrls";
import type { UnifiedScrapeIndex, UnifiedScrapePage } from "@/types";

export function ScrapeExplorer({
  page,
  scrapeMeta,
  pebblePageLabel,
}: {
  page: UnifiedScrapePage | null;
  scrapeMeta: UnifiedScrapeIndex | null;
  pebblePageLabel?: string;
}) {
  const [contentText, setContentText] = useState<string | null>(null);
  const [linkedDocs, setLinkedDocs] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const dom = page?.dom ?? null;
  const walk = page?.walk ?? null;
  const session = scrapeMeta?.dom;

  useEffect(() => {
    setContentText(null);
    setLinkedDocs({});
    setLoadError(null);
    if (!dom || !session) return;

    const contentUrl = staticScrapeUrl(session.staticAssetsBase, dom.assetDir, "content.txt");
    fetch(contentUrl)
      .then((r) => {
        if (!r.ok) throw new Error("content.txt not found");
        return r.text();
      })
      .then(setContentText)
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load content"));

    for (const doc of dom.linkedDocuments) {
      const fileName = doc.relPath.split("/").pop() ?? "";
      const url = staticScrapeUrl(session.staticAssetsBase, dom.assetDir, `linked-docs/${fileName}`);
      fetch(url)
        .then((r) => (r.ok ? r.text() : ""))
        .then((text) => {
          if (text) setLinkedDocs((prev) => ({ ...prev, [doc.relPath]: text }));
        })
        .catch(() => {});
    }
  }, [dom, session]);

  if (!scrapeMeta?.dom) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">
        No DOM scrape indexed. From repo root run{" "}
        <code className="rounded bg-[var(--color-muted)] px-1">npm run build:scrape</code> after{" "}
        <code className="rounded bg-[var(--color-muted)] px-1">npm run scrape:html</code>.
      </p>
    );
  }

  if (!page || !dom) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">
        {pebblePageLabel ? (
          <>
            No DOM capture matched <strong>{pebblePageLabel}</strong>. Try the Scrape library view
            or re-run capture-dom.
          </>
        ) : (
          "Select a task linked to a PebblePad page."
        )}
      </p>
    );
  }

  const qualityVariant =
    dom.captureQuality === "rich"
      ? "success"
      : dom.captureQuality === "placeholder-only"
        ? "destructive"
        : "secondary";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={qualityVariant}>{dom.captureQuality}</Badge>
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {dom.contentLength.toLocaleString()} chars readable · {dom.linkedDocuments.length} linked
          file(s)
        </span>
      </div>

      <a
        href={dom.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-xs text-[#a8b0ff] hover:underline"
      >
        PebblePad URL <ExternalLink className="h-3 w-3" />
      </a>

      <Tabs defaultValue="page" className="mt-2">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="readable" className="gap-1 text-xs">
            <FileText className="h-3 w-3" />
            Readable
          </TabsTrigger>
          <TabsTrigger value="page" className="gap-1 text-xs">
            <LayoutTemplate className="h-3 w-3" />
            Page
          </TabsTrigger>
          <TabsTrigger value="linked" className="gap-1 text-xs">
            <Link2 className="h-3 w-3" />
            Linked docs
          </TabsTrigger>
          <TabsTrigger value="walk" className="gap-1 text-xs">
            <ListTree className="h-3 w-3" />
            Walk
          </TabsTrigger>
        </TabsList>

        <TabsContent value="readable">
          {loadError && (
            <p className="mb-2 text-xs text-[#ff9b9e]">{loadError}</p>
          )}
          {contentText ? (
            <pre className="max-h-[min(70vh,520px)] overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-3 text-[12px] leading-relaxed text-[var(--color-foreground)]">
              {contentText}
            </pre>
          ) : (
            <p className="text-xs text-[var(--color-muted-foreground)]">Loading content.txt…</p>
          )}
          <p className="mt-2 text-[11px] text-[var(--color-muted-foreground)]">
            Primary source for requirements — includes workbook text plus extracted linked
            PDF/DOCX/PPTX.
          </p>
        </TabsContent>

        <TabsContent value="page">
          <PageReconstruction
            pageTitle={pebblePageLabel ?? dom.title ?? "Workbook page"}
            dom={dom}
            contentText={contentText}
            linkedDocsByPath={linkedDocs}
          />
          <p className="mt-2 text-[11px] text-[var(--color-muted-foreground)]">
            Reconstructed from scraped text — styled like the tracker, not the original PebblePad
            chrome.
          </p>
        </TabsContent>

        <TabsContent value="linked">
          {dom.linkedDocuments.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No linked documents extracted for this page.
            </p>
          ) : (
            <ul className="space-y-3">
              {dom.linkedDocuments.map((doc) => {
                const fileName = doc.relPath.split("/").pop() ?? doc.relPath;
                const text = linkedDocs[doc.relPath];
                return (
                  <li
                    key={doc.relPath}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
                  >
                    <div className="border-b border-[var(--color-border)] px-3 py-2">
                      <p className="text-xs font-medium">{fileName}</p>
                      <p className="mt-0.5 truncate text-[10px] text-[var(--color-muted-foreground)]">
                        {doc.url}
                      </p>
                    </div>
                    {text ? (
                      <pre className="max-h-64 overflow-auto whitespace-pre-wrap p-3 text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">
                        {text}
                      </pre>
                    ) : (
                      <p className="p-3 text-xs text-[var(--color-muted-foreground)]">Loading…</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="walk">
          {walk ? (
            <div className="space-y-3">
              <Section title="Walk excerpt">
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-3 text-[11px] text-[var(--color-muted-foreground)]">
                  {walk.excerpt}
                </pre>
              </Section>
              {walk.detectedRequirements.length > 0 && (
                <BulletSection title="Detected" items={walk.detectedRequirements} />
              )}
              {walk.requiredWork.length > 0 && (
                <BulletSection title="Required work (heuristic)" items={walk.requiredWork} />
              )}
              {walk.unclear.length > 0 && (
                <BulletSection title="Unclear" items={walk.unclear} />
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No matching page in the older walk scrape for this name.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium">{title}</p>
      {children}
    </div>
  );
}

function BulletSection({ title, items }: { title: string; items: string[] }) {
  return (
    <Section title={title}>
      <ul className="list-disc space-y-1 pl-4 text-xs text-[var(--color-muted-foreground)]">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </Section>
  );
}

