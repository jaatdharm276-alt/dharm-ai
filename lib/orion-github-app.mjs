import { createHmac, createSign, randomBytes, timingSafeEqual } from "node:crypto";

const API = "https://api.github.com";
const API_VERSION = "2022-11-28";
const SESSION_COOKIE = "orion_github_installation";
const STATE_COOKIE = "orion_github_oauth_state";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const STATE_MAX_AGE = 10 * 60;

function config() {
  const appId = process.env.GITHUB_APP_ID?.trim();
  const slug = process.env.GITHUB_APP_SLUG?.trim();
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const secret = process.env.GITHUB_APP_SESSION_SECRET;
  if (!appId || !slug || !privateKey || !secret || secret.length < 32) {
    throw new Error("GitHub App is not configured. Set GITHUB_APP_ID, GITHUB_APP_SLUG, GITHUB_APP_PRIVATE_KEY and a 32+ character GITHUB_APP_SESSION_SECRET.");
  }
  return { appId, slug, privateKey, secret };
}

function b64url(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function encodeCookie(payload, secret) {
  const body = b64url(JSON.stringify(payload));
  return body + "." + sign(body, secret);
}

function decodeCookie(value, secret) {
  if (!value || typeof value !== "string") return null;
  const [body, signature, extra] = value.split(".");
  if (!body || !signature || extra) return null;
  const expected = Buffer.from(sign(body, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload || !Number.isFinite(payload.exp) || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function cookieOptions(maxAge) {
  return `Path=/api/github; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function createGitHubState() {
  const { secret } = config();
  const state = randomBytes(32).toString("base64url");
  const cookie = encodeCookie({ state, exp: Date.now() + STATE_MAX_AGE * 1000 }, secret);
  return { state, cookie: `${STATE_COOKIE}=${cookie}; ${cookieOptions(STATE_MAX_AGE)}` };
}

export function verifyGitHubState(state, cookieValue) {
  const { secret } = config();
  const payload = decodeCookie(cookieValue, secret);
  return Boolean(payload?.state && typeof state === "string" && state.length <= 200 &&
    Buffer.from(payload.state).length === Buffer.from(state).length &&
    timingSafeEqual(Buffer.from(payload.state), Buffer.from(state)));
}

export function isValidGitHubInstallationId(value) {
  return /^\\d{1,20}$/.test(String(value ?? ""));
}

export function createInstallationCookie(installationId) {
  const { secret } = config();
  if (!/^\d{1,20}$/.test(String(installationId))) throw new Error("Invalid GitHub installation ID.");
  const value = encodeCookie({ installationId: String(installationId), exp: Date.now() + SESSION_MAX_AGE * 1000 }, secret);
  return `${SESSION_COOKIE}=${value}; ${cookieOptions(SESSION_MAX_AGE)}`;
}

export function clearGitHubCookies() {
  return [
    `${SESSION_COOKIE}=; ${cookieOptions(0)}`,
    `${STATE_COOKIE}=; ${cookieOptions(0)}`,
  ];
}

export function clearGitHubStateCookie() {
  return `${STATE_COOKIE}=; ${cookieOptions(0)}`;
}

export function readInstallationId(cookieHeader = "") {
  const { secret } = config();
  const cookies = Object.fromEntries(cookieHeader.split(";").map((part) => {
    const index = part.indexOf("=");
    return index < 0 ? ["", ""] : [part.slice(0, index).trim(), part.slice(index + 1).trim()];
  }).filter(([key]) => key));
  const payload = decodeCookie(cookies[SESSION_COOKIE], secret);
  return /^\d{1,20}$/.test(String(payload?.installationId || "")) ? payload.installationId : null;
}

export function createAppJwt(now = Math.floor(Date.now() / 1000)) {
  const { appId, privateKey } = config();
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iat: now - 60, exp: now + 8 * 60, iss: appId }));
  const input = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(input);
  signer.end();
  return `${input}.${signer.sign(privateKey, "base64url")}`;
}

async function githubFetch(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": API_VERSION,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.message || `GitHub API returned HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function createInstallationToken(installationId) {
  if (!/^\d{1,20}$/.test(String(installationId || ""))) throw new Error("A valid GitHub installation is required.");
  const jwt = createAppJwt();
  const data = await githubFetch(`/app/installations/${installationId}/access_tokens`, jwt, {
    method: "POST",
    body: JSON.stringify({ permissions: { metadata: "read", contents: "read", pull_requests: "read", actions: "read" } }),
  });
  if (!data?.token || !data?.expires_at) throw new Error("GitHub did not return a usable installation token.");
  return { token: data.token, expiresAt: data.expires_at, permissions: data.permissions || {} };
}

export async function listInstallationRepositories(installationId) {
  const auth = await createInstallationToken(installationId);
  const data = await githubFetch("/installation/repositories?per_page=100", auth.token);
  return {
    repositories: (Array.isArray(data.repositories) ? data.repositories : []).map((repo) => ({
      id: repo.id,
      full_name: repo.full_name,
      private: Boolean(repo.private),
      default_branch: repo.default_branch,
      permissions: repo.permissions || {},
    })),
    total_count: Number(data.total_count || 0),
    token_expires_at: auth.expiresAt,
    granted_permissions: auth.permissions,
  };
}

export function getGitHubAppSlug() {
  return config().slug;
}
