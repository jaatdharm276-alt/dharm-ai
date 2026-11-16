/** Return the tools available for the next agent turn under per-task budgets. */
export function getAvailableAgentTools(tools, {
  searchCalls = 0,
  maxSearchCalls = 1,
  searchResults = null,
  searchFailure = null,
} = {}) {
  const searchUnavailable = Boolean(searchResults || searchFailure)
    || searchCalls >= maxSearchCalls;
  return searchUnavailable
    ? tools.filter((tool) => tool?.function?.name !== "search_web")
    : tools;
}

/** Disable all tool calls after the single permitted web-search attempt. */
export function getAgentToolChoice({ searchResults = null, searchFailure = null } = {}) {
  return searchResults || searchFailure ? "none" : "auto";
}
