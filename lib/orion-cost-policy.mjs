export const DEFAULT_SEARCH_CALLS_PER_TASK = 1;
export const DEFAULT_SEARCH_RESULTS = 3;

export function getExternalSearchPolicy({
  enabled,
  apiKey,
  maxCalls = DEFAULT_SEARCH_CALLS_PER_TASK,
} = {}) {
  const optedIn = enabled === "true";
  const configured = typeof apiKey === "string" && apiKey.trim().length > 0;
  const validLimit = Number.isInteger(maxCalls) && maxCalls >= 1 && maxCalls <= 3;
  return {
    allowed: optedIn && validLimit,
    reason: !optedIn
      ? "External search is disabled. Set ORION_ENABLE_EXTERNAL_SEARCH=true to enable free keyless search."
      : !validLimit
        ? "External search limit must be between 1 and 3 calls per task."
        : null,
    authMode: configured ? "api_key" : "keyless",
    maxCalls: validLimit ? maxCalls : DEFAULT_SEARCH_CALLS_PER_TASK,
    maxResults: DEFAULT_SEARCH_RESULTS,
    searchDepth: "basic",
  };
}
