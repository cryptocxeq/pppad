import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearGitHubSession,
  completeGitHubLoginFromUrl,
  fetchGitHubUser,
  getStoredToken,
  isGitHubSyncConfigured,
  startGitHubLogin,
  stripOAuthParamsFromUrl,
  type GitHubUser,
} from "@/lib/githubAuth";
import { loadProgressFromGitHub, saveProgressToGitHub } from "@/lib/githubProgress";
import {
  defaultProgressState,
  loadLocalProgress,
  reconcileProgress,
  saveLocalProgress,
} from "@/lib/progressStorage";
import type { ProgressState, TaskStatus } from "@/types";

export type SyncStatus = "local" | "loading" | "synced" | "syncing" | "error";

export function useProgress() {
  const [state, setState] = useState<ProgressState>(() => loadLocalProgress().state);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [gistUrl, setGistUrl] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    isGitHubSyncConfigured ? "loading" : "local",
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const skipNextRemoteSave = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const oauthHandled = useRef(false);

  const persistLocal = useCallback((next: ProgressState) => {
    saveLocalProgress(next);
  }, []);

  const pullRemote = useCallback(
    async (token: string) => {
      setSyncStatus("loading");
      setSyncError(null);

      try {
        const user = await fetchGitHubUser(token);
        setGithubUser(user);

        const { envelope, gistUrl: url } = await loadProgressFromGitHub(token);
        setGistUrl(url);

        const local = loadLocalProgress();
        if (envelope) {
          const merged = reconcileProgress(
            local.state,
            local.updatedAt,
            envelope.state,
            envelope.updatedAt,
          );
          skipNextRemoteSave.current = true;
          setState(merged);
          persistLocal(merged);
        } else if (
          Object.keys(local.state.tasks).length > 0 ||
          Object.keys(local.state.checklist).length > 0 ||
          Object.keys(local.state.notes).length > 0
        ) {
          const { gistUrl: createdUrl } = await saveProgressToGitHub(token, local.state);
          setGistUrl(createdUrl);
        }

        setSyncStatus("synced");
      } catch (e) {
        setSyncStatus("error");
        setSyncError(e instanceof Error ? e.message : "Failed to load from GitHub");
      }
    },
    [persistLocal],
  );

  const pushRemote = useCallback(async (token: string, next: ProgressState) => {
    setSyncStatus("syncing");
    try {
      const { gistUrl: url } = await saveProgressToGitHub(token, next);
      setGistUrl(url);
      setSyncStatus("synced");
      setSyncError(null);
    } catch (e) {
      setSyncStatus("error");
      setSyncError(e instanceof Error ? e.message : "Failed to save to GitHub");
    }
  }, []);

  useEffect(() => {
    persistLocal(state);
  }, [state, persistLocal]);

  useEffect(() => {
    if (!isGitHubSyncConfigured) {
      setSyncStatus("local");
      return;
    }

    let cancelled = false;

    const boot = async () => {
      if (!oauthHandled.current) {
        oauthHandled.current = true;
        const params = new URLSearchParams(window.location.search);
        if (params.has("code") || params.has("error")) {
          const result = await completeGitHubLoginFromUrl(window.location.search);
          stripOAuthParamsFromUrl();
          if ("error" in result) {
            if (!cancelled) {
              setSyncStatus("error");
              setSyncError(result.error);
            }
            return;
          }
        }
      }

      const token = getStoredToken();
      if (!token) {
        if (!cancelled) setSyncStatus("local");
        return;
      }

      await pullRemote(token);
    };

    void boot();

    return () => {
      cancelled = true;
    };
  }, [pullRemote]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token || !githubUser) return;
    if (skipNextRemoteSave.current) {
      skipNextRemoteSave.current = false;
      return;
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void pushRemote(token, state);
    }, 800);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, githubUser, pushRemote]);

  const setTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    setState((s) => ({
      ...s,
      tasks: { ...s.tasks, [taskId]: status },
    }));
  }, []);

  const toggleChecklist = useCallback((itemId: string) => {
    setState((s) => ({
      ...s,
      checklist: {
        ...s.checklist,
        [itemId]: !s.checklist[itemId],
      },
    }));
  }, []);

  const setNote = useCallback((taskId: string, note: string) => {
    setState((s) => ({
      ...s,
      notes: { ...s.notes, [taskId]: note },
    }));
  }, []);

  const resetProgress = useCallback(async () => {
    if (!confirm("Clear all completion data? This cannot be undone.")) {
      return;
    }

    const empty = { ...defaultProgressState };
    setState(empty);
    persistLocal(empty);

    const token = getStoredToken();
    if (token) {
      await saveProgressToGitHub(token, empty);
    }
  }, [persistLocal]);

  const signInWithGitHub = useCallback(() => {
    startGitHubLogin();
  }, []);

  const signOut = useCallback(() => {
    clearGitHubSession();
    setGithubUser(null);
    setGistUrl(null);
    setSyncStatus("local");
    setSyncError(null);
  }, []);

  const getTaskStatus = useCallback(
    (taskId: string): TaskStatus => state.tasks[taskId] ?? "todo",
    [state.tasks],
  );

  const isChecklistDone = useCallback(
    (itemId: string) => !!state.checklist[itemId],
    [state.checklist],
  );

  return {
    state,
    setTaskStatus,
    toggleChecklist,
    setNote,
    resetProgress,
    getTaskStatus,
    isChecklistDone,
    githubUser,
    gistUrl,
    syncStatus,
    syncError,
    isCloudEnabled: isGitHubSyncConfigured,
    signInWithGitHub,
    signOut,
  };
}
