import { buildTavilySearchRequest, normalizeTavilySearchResults, normalizeBingRssResults } from "../lib/orion-search.mjs";

const query = "India official government portal";
const request = buildTavilySearchRequest({ query, maxResults: 1 });
if (request.init.headers.Authorization || request.init.headers["X-Tavily-Access-Mode"] !== "keyless") {
  throw new Error("The smoke test must exercise keyless mode without an API key.");
}

let tavilyStatus = "unavailable";
let tavilyReason = "";
const response = await fetch(request.url, {
  ...request.init,
  signal: AbortSignal.timeout(25_000),
});
if (response.ok) {
  const data = await response.json();
  const normalized = normalizeTavilySearchResults(data, { limit: 1, accessMode: "keyless" });
  if (normalized.results.length) tavilyStatus = "available";
} else {
  const detail = (await response.text()).slice(0, 500);
  tavilyStatus = response.status === 429 ? "daily-cap-reached" : "provider-error";
  tavilyReason = detail;
}

// Verify the public fallback used by ORION when Tavily is rate-limited.
const rssUrl = "https://www.bing.com/search?format=rss&q=" + encodeURIComponent(query);
const rssResponse = await fetch(rssUrl, {
  headers: { Accept: "application/rss+xml, application/xml, text/xml" },
  signal: AbortSignal.timeout(25_000),
});
if (!rssResponse.ok) {
  throw new Error("Bing RSS fallback failed (HTTP " + rssResponse.status + "). Tavily status: " + tavilyStatus + " " + tavilyReason);
}
const fallback = normalizeBingRssResults(await rssResponse.text(), { limit: 1 });
if (!fallback.results.length) {
  throw new Error("Bing RSS fallback returned no usable HTTP(S) source. Tavily status: " + tavilyStatus);
}
const result = fallback.results[0];
console.log(JSON.stringify({
  status: "passed",
  primaryProvider: "Tavily",
  primaryStatus: tavilyStatus,
  fallbackProvider: fallback.provider,
  fallbackResultCount: fallback.results.length,
  sample: { title: result.title, domain: new URL(result.url).hostname },
}, null, 2));
