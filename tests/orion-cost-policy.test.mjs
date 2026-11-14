import test from "node:test";
import assert from "node:assert/strict";
import { getExternalSearchPolicy } from "../lib/orion-cost-policy.mjs";

test("external search stays disabled unless explicitly enabled", () => {
  assert.equal(getExternalSearchPolicy({ apiKey: "secret" }).allowed, false);
  assert.equal(getExternalSearchPolicy({ enabled: "false", apiKey: "secret" }).allowed, false);
});

test("explicit opt-in enables free keyless search without a provider key", () => {
  const policy = getExternalSearchPolicy({ enabled: "true" });
  assert.equal(policy.allowed, true);
  assert.equal(policy.authMode, "keyless");
});

test("an optional API key selects keyed mode without changing the bounded defaults", () => {
  const policy = getExternalSearchPolicy({ enabled: "true", apiKey: "secret" });
  assert.equal(policy.allowed, true);
  assert.equal(policy.authMode, "api_key");
  assert.equal(policy.maxCalls, 1);
  assert.equal(policy.maxResults, 3);
  assert.equal(policy.searchDepth, "basic");
});

test("rejects unsafe search-call limits", () => {
  const policy = getExternalSearchPolicy({ enabled: "true", apiKey: "secret", maxCalls: 99 });
  assert.equal(policy.allowed, false);
  assert.equal(policy.maxCalls, 1);
});
