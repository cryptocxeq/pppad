import type { ProgressState } from "@/types";

export const STORAGE_KEY = "ipgce-tracker-progress-v1";
export const STORAGE_UPDATED_KEY = "ipgce-tracker-progress-v1-at";

export const defaultProgressState: ProgressState = {
  tasks: {},
  checklist: {},
  notes: {},
};

export function loadLocalProgress(): { state: ProgressState; updatedAt: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const atRaw = localStorage.getItem(STORAGE_UPDATED_KEY);
    const updatedAt = atRaw ? Number(atRaw) : 0;
    if (!raw) {
      return { state: { ...defaultProgressState }, updatedAt };
    }
    return {
      state: { ...defaultProgressState, ...JSON.parse(raw) },
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
    };
  } catch {
    return { state: { ...defaultProgressState }, updatedAt: 0 };
  }
}

export function saveLocalProgress(state: ProgressState): number {
  const updatedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(STORAGE_UPDATED_KEY, String(updatedAt));
  return updatedAt;
}

export function reconcileProgress(
  local: ProgressState,
  localUpdatedAt: number,
  remote: ProgressState,
  remoteUpdatedAt: number,
): ProgressState {
  const localHasData =
    Object.keys(local.tasks).length > 0 ||
    Object.keys(local.checklist).length > 0 ||
    Object.keys(local.notes).length > 0;
  const remoteHasData =
    Object.keys(remote.tasks).length > 0 ||
    Object.keys(remote.checklist).length > 0 ||
    Object.keys(remote.notes).length > 0;

  if (!remoteHasData && localHasData) return local;
  if (!localHasData && remoteHasData) return remote;
  if (remoteUpdatedAt >= localUpdatedAt) return remote;
  return local;
}
