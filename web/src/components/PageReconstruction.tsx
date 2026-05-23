import { AlertCircle, ChevronDown, ChevronUp, ExternalLink, FileType2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseScrapeContent } from "@/lib/parseScrapeContent";
import { cn } from "@/lib/utils";
import type { CaptureQuality, DomScrapeCapture } from "@/types";

const PREVIEW_CHARS = 4_000;

export function PageReconstruction({
  pageTitle,
  dom,
  contentText,
  linkedDocsByPath,
}: {
  pageTitle: string;
  dom: DomScrapeCapture;
  contentText: string | null;
  linkedDocsByPath?: Record<string, string>;
}) {
  const parsed = useMemo(
    () => (contentText ? parseScrapeContent(contentText) : null),
    [contentText],
  );

  if (!contentText) {
    return (
      <p className="text-xs text-[var(--color-muted-foreground)]">Loading page content…</p>
    );
  }

  if (!parsed || parsed.isEmpty) {
    return (
      <EmptyPageState
        pageTitle={pageTitle}
        quality={dom.captureQuality}
        url={dom.url}
      />
    );
  }

  const displayTitle = parsed.workbookTitle ?? pageTitle;

  return (
    <article className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
      <header className="border-b border-[var(--color-border)] bg-[#0e0e12] px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              PebblePad page
            </p>
            <h3 className="mt-0.5 text-base font-semibold leading-snug text-[var(--color-foreground)]">
              {displayTitle}
            </h3>
          </div>
          <QualityBadge quality={dom.captureQuality} />
        </div>
        <a
          href={dom.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#a8b0ff] hover:underline"
        >
          Open in PebblePad <ExternalLink className="h-3 w-3" />
        </a>
      </header>

      <div className="space-y-4 px-4 py-4">
        {parsed.isPlaceholderForm && (
          <div className="flex gap-2.5 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" />
            <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
              This workbook page is an empty student form in PebblePad. Requirements are
              usually in the linked documents below.
            </p>
          </div>
        )}

        {parsed.workbookBlocks.length > 0 && (
          <section className="space-y-3">
            {parsed.workbookBlocks.map((block, i) => (
              <ContentBlock key={i} block={block} />
            ))}
          </section>
        )}

        {parsed.metaHints.length > 0 && (
          <section className="space-y-1.5 rounded-lg border border-dashed border-[var(--color-border)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Media &amp; UI cues
            </p>
            <ul className="space-y-1 text-[11px] text-[var(--color-muted-foreground)]">
              {parsed.metaHints.map((hint, i) => (
                <li key={i} className="leading-snug">
                  {hint}
                </li>
              ))}
            </ul>
          </section>
        )}

        {(parsed.linkedExcerpts.length > 0 || (dom.linkedDocuments?.length ?? 0) > 0) && (
          <section className="space-y-3 border-t border-[var(--color-border)] pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Linked documents
            </p>
            {parsed.linkedExcerpts.map((doc) => (
              <LinkedDocCard
                key={doc.url}
                format={doc.format}
                url={doc.url}
                body={doc.body}
              />
            ))}
            {dom.linkedDocuments
              ?.filter((d) => !parsed.linkedExcerpts.some((e) => e.url === d.url))
              .map((doc) => {
                const fileName = doc.relPath.split("/").pop() ?? doc.relPath;
                const body = linkedDocsByPath?.[doc.relPath];
                return (
                  <LinkedDocCard
                    key={doc.relPath}
                    format={doc.format?.toUpperCase() ?? "FILE"}
                    url={doc.url}
                    body={body ?? ""}
                    fileName={fileName}
                    loading={!body}
                  />
                );
              })}
          </section>
        )}
      </div>
    </article>
  );
}

function ContentBlock({ block }: { block: ReturnType<typeof parseScrapeContent>["workbookBlocks"][number] }) {
  if (block.type === "heading") {
    return (
      <h4 className="text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
        {block.text}
      </h4>
    );
  }
  if (block.type === "list") {
    return (
      <ul className="list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-[var(--color-muted-foreground)]">
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--color-muted-foreground)]">
      {block.text}
    </p>
  );
}

function LinkedDocCard({
  format,
  url,
  body,
  fileName,
  loading,
}: {
  format: string;
  url: string;
  body: string;
  fileName?: string;
  loading?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncate = body.length > PREVIEW_CHARS;
  const shown = needsTruncate && !expanded ? body.slice(0, PREVIEW_CHARS) + "…" : body;

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[#0a0a0e]">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <FileType2 className="h-3.5 w-3.5 shrink-0 text-[#a8b0ff]" />
        <span className="text-xs font-medium text-[var(--color-foreground)]">
          {fileName ?? `${format} document`}
        </span>
        <Badge variant="secondary" className="ml-auto text-[9px]">
          {format}
        </Badge>
      </div>
      <div className="px-3 py-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mb-2 block truncate text-[10px] text-[#a8b0ff] hover:underline"
        >
          {url}
        </a>
        {loading ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">Loading extract…</p>
        ) : body ? (
          <>
            <div className="max-h-[min(50vh,400px)] overflow-y-auto whitespace-pre-wrap text-[12px] leading-relaxed text-[var(--color-muted-foreground)]">
              {shown}
            </div>
            {needsTruncate && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 gap-1 text-[11px]"
                onClick={() => setExpanded((e) => !e)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> Show full document (
                    {(body.length / 1000).toFixed(0)}k chars)
                  </>
                )}
              </Button>
            )}
          </>
        ) : (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            No text extracted for this file.
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyPageState({
  pageTitle,
  quality,
  url,
}: {
  pageTitle: string;
  quality: CaptureQuality;
  url: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-6 text-center">
      <p className="text-sm font-medium">{pageTitle}</p>
      <QualityBadge quality={quality} className="mt-2" />
      <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
        No readable content was captured for this page.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-xs text-[#a8b0ff] hover:underline"
      >
        Open in PebblePad <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

function QualityBadge({
  quality,
  className,
}: {
  quality: CaptureQuality;
  className?: string;
}) {
  const variant =
    quality === "rich"
      ? "success"
      : quality === "placeholder-only"
        ? "destructive"
        : "secondary";
  return (
    <Badge variant={variant} className={cn("shrink-0 text-[10px]", className)}>
      {quality}
    </Badge>
  );
}
