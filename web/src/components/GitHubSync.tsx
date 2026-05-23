import { Cloud, CloudOff, ExternalLink, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SyncStatus } from "@/hooks/useProgress";
import type { GitHubUser } from "@/lib/githubAuth";
import { cn } from "@/lib/utils";

export function GitHubSync({
  isCloudEnabled,
  githubUser,
  gistUrl,
  syncStatus,
  syncError,
  onSignIn,
  onSignOut,
}: {
  isCloudEnabled: boolean;
  githubUser: GitHubUser | null;
  gistUrl: string | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  if (!isCloudEnabled) {
    return (
      <div
        className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-[10px] text-[var(--color-muted-foreground)]"
        title="Set VITE_GITHUB_CLIENT_ID in the build to enable GitHub gist sync"
      >
        <CloudOff className="h-3 w-3 shrink-0" />
        Local only
      </div>
    );
  }

  if (githubUser) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px]",
            syncStatus === "error"
              ? "border-[var(--color-destructive)]/40 text-[#ff9b9e]"
              : "border-[var(--color-border)] text-[var(--color-muted-foreground)]",
          )}
        >
          {syncStatus === "syncing" || syncStatus === "loading" ? (
            <Loader2 className="h-3 w-3 animate-spin text-[#a8b0ff]" />
          ) : (
            <Cloud className="h-3 w-3 text-[#a8b0ff]" />
          )}
          <span className="max-w-[120px] truncate">@{githubUser.login}</span>
          <span className="text-zinc-600">·</span>
          <span>{syncLabel(syncStatus)}</span>
        </div>
        {gistUrl && (
          <a
            href={gistUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--color-border)] px-2 text-[10px] text-[#a8b0ff] hover:bg-[var(--color-accent)]"
          >
            Gist <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-[10px]"
          onClick={onSignOut}
        >
          <LogOut className="h-3 w-3" />
          Sign out
        </Button>
        {syncError && <p className="w-full text-[10px] text-[#ff9b9e]">{syncError}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        className="h-7 gap-1.5 text-[10px]"
        onClick={onSignIn}
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        Save to GitHub
      </Button>
      <p className="max-w-[200px] text-right text-[10px] text-[var(--color-muted-foreground)]">
        Private gist in your account — no extra database
      </p>
      {syncError && <p className="text-[10px] text-[#ff9b9e]">{syncError}</p>}
    </div>
  );
}

function syncLabel(status: SyncStatus): string {
  switch (status) {
    case "syncing":
      return "Saving…";
    case "loading":
      return "Loading…";
    case "synced":
      return "On GitHub";
    case "error":
      return "Error";
    default:
      return "Local";
  }
}
