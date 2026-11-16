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

/** Once search has been attempted, omit the tools field entirely on the next model call. */
export function shouldDisableAgentTools({ searchResults = null, searchFailure = null } = {}) {
  return Boolean(searchResults || searchFailure);
}
