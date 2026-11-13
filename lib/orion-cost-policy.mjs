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
    allowed: optedIn && configured && validLimit,
    reason: !optedIn
      ? "External search is disabled by default. Enable it explicitly in server settings."
      : !configured
        ? "External search is enabled but no provider key is configured."
        : !validLimit
          ? "External search limit must be between 1 and 3 calls per task."
          : null,
    maxCalls: validLimit ? maxCalls : DEFAULT_SEARCH_CALLS_PER_TASK,
    maxResults: DEFAULT_SEARCH_RESULTS,
    searchDepth: "basic",
  };
}
