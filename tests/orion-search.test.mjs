import test from "node:test";
import assert from "node:assert/strict";
import { buildTavilySearchRequest, normalizeTavilySearchResults, normalizeBingRssResults } from "../lib/orion-search.mjs";

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


test("normalizes safe Bing RSS results and decodes XML entities", () => {
  const xml = `<rss><channel><item><title>India &amp; Government</title><link>https://www.india.gov.in/</link><description><![CDATA[Official portal &amp; services]]></description></item><item><title>Unsafe</title><link>javascript:alert(1)</link><description>bad</description></item></channel></rss>`;
  const output = normalizeBingRssResults(xml, { limit: 3 });
  assert.equal(output.provider, "Bing RSS");
  assert.equal(output.results.length, 1);
  assert.equal(output.results[0].title, "India & Government");
  assert.equal(output.results[0].url, "https://www.india.gov.in/");
  assert.equal(output.results[0].content, "Official portal & services");
});

test("Bing RSS parser returns no results for malformed or empty XML", () => {
  assert.deepEqual(normalizeBingRssResults("<rss></rss>").results, []);
});

test("requests full-page markdown only when a Tavily API key is configured", () => {
  const keyed = buildTavilySearchRequest({ apiKey: "tvly-test", query: "official PIB role" });
  assert.equal(JSON.parse(keyed.init.body).include_raw_content, "markdown");
  const keyless = buildTavilySearchRequest({ query: "official PIB role" });
  assert.equal(Object.hasOwn(JSON.parse(keyless.init.body), "include_raw_content"), false);
});

test("prefers extracted full-page content and marks its evidence mode", () => {
  const output = normalizeTavilySearchResults({ results: [{ title: "Official PIB", url: "https://pib.gov.in/", content: "Short snippet", raw_content: "Full official page content with agency role." }] });
  assert.equal(output.results[0].content, "Full official page content with agency role.");
  assert.equal(output.results[0].contentMode, "full_page");
});
