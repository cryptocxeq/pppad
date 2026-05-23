const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID?.trim() ?? "";
const TOKEN_KEY = "ipgce-github-token";
const GIST_ID_KEY = "ipgce-github-gist-id";
const PKCE_VERIFIER_KEY = "ipgce-github-pkce-verifier";
const OAUTH_STATE_KEY = "ipgce-github-oauth-state";

export const isGitHubSyncConfigured = CLIENT_ID.length > 0;

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredGistId(): string | null {
  return localStorage.getItem(GIST_ID_KEY);
}

export function setStoredGistId(gistId: string): void {
  localStorage.setItem(GIST_ID_KEY, gistId);
}

export function clearGitHubSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(GIST_ID_KEY);
}

export function appRedirectUrl(): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const path = base.endsWith("/") ? base : `${base}/`;
  return `${window.location.origin}${path}`;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function pkceChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64Url(new Uint8Array(digest));
}

function randomVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

export function startGitHubLogin(): void {
  if (!isGitHubSyncConfigured) return;

  const verifier = randomVerifier();
  const state = randomVerifier();
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(OAUTH_STATE_KEY, state);

  void pkceChallenge(verifier).then((challenge) => {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: appRedirectUrl(),
      scope: "gist",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  });
}

export async function completeGitHubLoginFromUrl(
  search: string,
): Promise<{ token: string } | { error: string }> {
  const params = new URLSearchParams(search);
  const code = params.get("code");
  const state = params.get("state");
  const error = params.get("error_description") ?? params.get("error");

  if (error) return { error };
  if (!code) return { error: "Missing authorization code." };

  const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
  if (!state || state !== expectedState) {
    return { error: "OAuth state mismatch. Try signing in again." };
  }

  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  if (!verifier) return { error: "Missing PKCE verifier. Try signing in again." };

  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    code,
    redirect_uri: appRedirectUrl(),
    code_verifier: verifier,
  });

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const json = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !json.access_token) {
    return {
      error: json.error_description ?? json.error ?? "Could not complete GitHub sign-in.",
    };
  }

  localStorage.setItem(TOKEN_KEY, json.access_token);
  return { token: json.access_token };
}

export function stripOAuthParamsFromUrl(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("code") && !url.searchParams.has("error")) return;
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

export type GitHubUser = {
  login: string;
  name: string | null;
  avatar_url: string;
};

export async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  const res = await fetch("https://api.github.com/user", {
    headers: githubHeaders(token),
  });
  if (!res.ok) throw new Error(`GitHub user: ${res.status}`);
  const json = (await res.json()) as GitHubUser;
  return json;
}

export function githubHeaders(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}
