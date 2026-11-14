import test from "node:test";
import assert from "node:assert/strict";
import { getOrionHealth } from "../lib/orion-health.mjs";

test("health response reports provider configuration without exposing credentials", () => {
  const result = getOrionHealth({
    GROQ_API_KEY: "secret-value",
    TAVILY_API_KEY: "",
    ORION_ENABLE_EXTERNAL_SEARCH: "true",
    VERCEL_GIT_COMMIT_SHA: "1234567890abcdef",
  });
  assert.equal(result.status, "ok");
  assert.equal(result.commit, "1234567890ab");
  assert.equal(result.providers.chat.configured, true);
  assert.equal(result.providers.search.mode, "public-rss-fallback");
  assert.equal(JSON.stringify(result).includes("secret-value"), false);
});

test("health reports disabled search and missing chat provider", () => {
  const result = getOrionHealth({ ORION_ENABLE_EXTERNAL_SEARCH: "false" });
  assert.equal(result.providers.chat.configured, false);
  assert.equal(result.providers.search.enabled, false);
  assert.equal(result.providers.search.mode, "disabled");
});
