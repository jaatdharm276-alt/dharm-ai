import { buildTavilySearchRequest, normalizeTavilySearchResults } from "../lib/orion-search.mjs";

const query = "India official government portal";
const request = buildTavilySearchRequest({ query, maxResults: 1 });
if (request.init.headers.Authorization || request.init.headers["X-Tavily-Access-Mode"] !== "keyless") {
  throw new Error("The smoke test must exercise keyless mode without an API key.");
}

const response = await fetch(request.url, {
  ...request.init,
  signal: AbortSignal.timeout(25_000),
});
if (!response.ok) {
  const detail = (await response.text()).slice(0, 500);
  throw new Error(`Tavily keyless search failed (HTTP ${response.status}): ${detail}`);
}

const data = await response.json();
const normalized = normalizeTavilySearchResults(data, { limit: 1, accessMode: "keyless" });
if (normalized.results.length !== 1) {
  throw new Error("Tavily keyless search returned no valid HTTP(S) result.");
}
const result = normalized.results[0];
console.log(JSON.stringify({
  status: "passed",
  provider: normalized.provider,
  accessMode: normalized.accessMode,
  resultCount: normalized.results.length,
  sample: { title: result.title, domain: new URL(result.url).hostname },
}, null, 2));
