import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
process.env.GITHUB_APP_ID = "123456";
process.env.GITHUB_APP_SLUG = "orion-ai";
process.env.GITHUB_APP_PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "pem" });
process.env.GITHUB_APP_SESSION_SECRET = "test-only-secret-that-is-at-least-32-characters";

const auth = await import("../lib/orion-github-app.mjs");

test("creates a signed state cookie and validates the matching state", () => {
  const { state, cookie } = auth.createGitHubState();
  const value = cookie.split(";")[0].split("=").slice(1).join("=");
  assert.equal(auth.verifyGitHubState(state, value), true);
  assert.equal(auth.verifyGitHubState("attacker-state", value), false);
});

test("rejects a modified or malformed state cookie", () => {
  const { state, cookie } = auth.createGitHubState();
  const value = cookie.split(";")[0].split("=").slice(1).join("=");
  assert.equal(auth.verifyGitHubState(state, value + "tampered"), false);
  assert.equal(auth.verifyGitHubState(state, "not-a-cookie"), false);
});

test("signs installation cookies and rejects tampering", () => {
  const cookie = auth.createInstallationCookie("987654321");
  const value = cookie.split(";")[0];
  assert.equal(auth.readInstallationId(value), "987654321");
  assert.equal(auth.readInstallationId(value + "tampered"), null);
});

test("rejects malformed installation identifiers", () => {
  assert.throws(() => auth.createInstallationCookie("1/../2"), /Invalid GitHub installation ID/);
  assert.throws(() => auth.createInstallationToken("not-an-id"), /valid GitHub installation/);
});

test("creates a GitHub App JWT with an eight-minute expiry window", () => {
  const now = 1_800_000_000;
  const jwt = auth.createAppJwt(now);
  const [header, payload, signature] = jwt.split(".");
  assert.ok(header && signature);
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  assert.equal(decoded.iss, "123456");
  assert.equal(decoded.iat, now - 60);
  assert.equal(decoded.exp, now + 8 * 60);
});
