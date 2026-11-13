import test from "node:test";
import assert from "node:assert/strict";
import { getExternalSearchPolicy } from "../lib/orion-cost-policy.mjs";

test("external search is disabled unless explicitly opted in", () => {
  assert.equal(getExternalSearchPolicy({ apiKey: "secret" }).allowed, false);
  assert.equal(getExternalSearchPolicy({ enabled: "false", apiKey: "secret" }).allowed, false);
});

test("requires both explicit opt-in and provider key", () => {
  assert.equal(getExternalSearchPolicy({ enabled: "true" }).allowed, false);
  assert.equal(getExternalSearchPolicy({ enabled: "true", apiKey: "secret" }).allowed, true);
});

test("uses low-cost bounded defaults", () => {
  const policy = getExternalSearchPolicy({ enabled: "true", apiKey: "secret" });
  assert.equal(policy.maxCalls, 1);
  assert.equal(policy.maxResults, 3);
  assert.equal(policy.searchDepth, "basic");
});

test("rejects unsafe search-call limits", () => {
  const policy = getExternalSearchPolicy({ enabled: "true", apiKey: "secret", maxCalls: 99 });
  assert.equal(policy.allowed, false);
  assert.equal(policy.maxCalls, 1);
});
