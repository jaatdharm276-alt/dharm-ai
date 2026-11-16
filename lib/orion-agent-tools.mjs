/**
 * Keep the declared tool schema stable for providers that may emit a repeated
 * tool call after receiving a tool result. executeTool caches the first search
 * result/failure, so repeated search_web calls never trigger another network search.
 */
export function getAvailableAgentTools(tools) {
  return tools;
}
