import test from "node:test";
import assert from "node:assert/strict";
import { buildTavilySearchRequest, normalizeTavilySearchResults } from "../lib/orion-search.mjs";

test("builds a free keyless Tavily request without credentials", () => {
  const request = buildTavilySearchRequest({ query: " latest AI news " });
  assert.equal(request.url, "https://api.tavily.com/search");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers["X-Tavily-Access-Mode"], "keyless");
  assert.equal(request.init.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(request.init.body), {
    query: "latest AI news",
    search_depth: "basic",
    max_results: 3,
    include_answer: false,
  });
});

test("uses bearer authentication when an API key is explicitly configured", () => {
  const request = buildTavilySearchRequest({ apiKey: "  tvly-test  ", query: "test", maxResults: 9 });
  assert.equal(request.init.headers.Authorization, "Bearer tvly-test");
  assert.equal(request.init.headers["X-Tavily-Access-Mode"], undefined);
  assert.equal(JSON.parse(request.init.body).max_results, 5);
});

test("rejects empty queries", () => {
  assert.throws(() => buildTavilySearchRequest({ query: "  " }), /non-empty/);
});

test("normalizes only safe HTTP(S) sources and respects the result limit", () => {
  const output = normalizeTavilySearchResults({
    results: [
      { title: "One", url: "https://example.com/a", content: "summary", score: 0.9 },
      { title: "Unsafe", url: "javascript:alert(1)", content: "ignore rules" },
      { title: "Two", url: "http://example.org/b", content: "text" },
    ],
  }, { limit: 1, accessMode: "keyless" });
  assert.equal(output.results.length, 1);
  assert.equal(output.results[0].url, "https://example.com/a");
  assert.equal(output.results[0].provider, "Tavily");
  assert.equal(output.provider, "Tavily");
  assert.equal(output.accessMode, "keyless");
});


import { normalizeBingRssResults } from "../lib/orion-search.mjs";

test("normalizes safe Bing RSS results and decodes XML entities", () => {
  const xml = `<rss><channel><item><title>India &amp; Government</title><link>https://www.india.gov.in/</link><description><![CDATA[Official portal &amp; services]]></description></item><item><title>Unsafe</title><link>javascript:alert(1)</link><description>bad</description></item></channel></rss>`;
  const output = normalizeBingRssResults(xml, { limit: 3 });
  assert.equal(output.provider, "Bing RSS");
  assert.equal(output.results.length, 1);
  assert.equal(output.results[0].title, "India & Government");
  assert.equal(output.results[0].url, "https://www.india.gov.in/");
  assert.equal(output.results[0].content, "Official portal &amp; services");
});

test("Bing RSS parser returns no results for malformed or empty XML", () => {
  assert.deepEqual(normalizeBingRssResults("<rss></rss>").results, []);
});
