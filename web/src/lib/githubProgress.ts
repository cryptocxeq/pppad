import {
  getStoredGistId,
  githubHeaders,
  setStoredGistId,
  type GitHubUser,
} from "@/lib/githubAuth";
import type { ProgressState } from "@/types";

export const GIST_DESCRIPTION = "ipgce-tracker-progress-v1";
export const GIST_FILENAME = "progress.json";

export type ProgressEnvelope = {
  version: 1;
  updatedAt: number;
  state: ProgressState;
};

type GistListItem = { id: string; description: string | null };
type GistDetail = {
  id: string;
  html_url: string;
  files: Record<string, { content?: string } | undefined>;
  updated_at: string;
};

export async function loadProgressFromGitHub(
  token: string,
): Promise<{ envelope: ProgressEnvelope | null; gistUrl: string | null }> {
  let gistId = getStoredGistId();

  if (!gistId) {
    gistId = await findProgressGistId(token);
    if (gistId) setStoredGistId(gistId);
  }

  if (!gistId) {
    return { envelope: null, gistUrl: null };
  }

  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: githubHeaders(token),
  });

  if (res.status === 404) {
    return { envelope: null, gistUrl: null };
  }
  if (!res.ok) throw new Error(`GitHub gist read failed (${res.status})`);

  const gist = (await res.json()) as GistDetail;
  const raw = gist.files[GIST_FILENAME]?.content;
  if (!raw) return { envelope: null, gistUrl: gist.html_url };

  try {
    const envelope = JSON.parse(raw) as ProgressEnvelope;
    if (envelope.version !== 1 || !envelope.state) {
      throw new Error("Invalid envelope");
    }
    return { envelope, gistUrl: gist.html_url };
  } catch {
    throw new Error("Progress gist has invalid JSON.");
  }
}

export async function saveProgressToGitHub(
  token: string,
  state: ProgressState,
): Promise<{ gistUrl: string }> {
  const envelope: ProgressEnvelope = {
    version: 1,
    updatedAt: Date.now(),
    state,
  };
  const content = JSON.stringify(envelope, null, 2);

  let gistId = getStoredGistId();
  if (!gistId) {
    gistId = await findProgressGistId(token);
  }

  if (gistId) {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "PATCH",
      headers: {
        ...githubHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        files: {
          [GIST_FILENAME]: { content },
        },
      }),
    });
    if (!res.ok) throw new Error(`GitHub gist update failed (${res.status})`);
    const gist = (await res.json()) as GistDetail;
    setStoredGistId(gist.id);
    return { gistUrl: gist.html_url };
  }

  const res = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      ...githubHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: {
        [GIST_FILENAME]: { content },
      },
    }),
  });

  if (!res.ok) throw new Error(`GitHub gist create failed (${res.status})`);
  const gist = (await res.json()) as GistDetail;
  setStoredGistId(gist.id);
  return { gistUrl: gist.html_url };
}

async function findProgressGistId(token: string): Promise<string | null> {
  let page = 1;
  while (page <= 5) {
    const res = await fetch(
      `https://api.github.com/gists?per_page=100&page=${page}`,
      { headers: githubHeaders(token) },
    );
    if (!res.ok) throw new Error(`GitHub gist list failed (${res.status})`);
    const gists = (await res.json()) as GistListItem[];
    const match = gists.find((g) => g.description === GIST_DESCRIPTION);
    if (match) return match.id;
    if (gists.length < 100) break;
    page += 1;
  }
  return null;
}

export type { GitHubUser };
