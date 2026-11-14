export function getOrionHealth(env = process.env) {
  const chatConfigured = Boolean(String(env.GROQ_API_KEY || "").trim());
  const searchEnabled = env.ORION_ENABLE_EXTERNAL_SEARCH !== "false";
  const searchMode = !searchEnabled
    ? "disabled"
    : String(env.TAVILY_API_KEY || "").trim()
      ? "tavily-with-public-fallback"
      : "public-rss-fallback";
  const commit = String(env.VERCEL_GIT_COMMIT_SHA || env.GITHUB_SHA || "").slice(0, 12) || "local";

  return {
    status: "ok",
    app: "ORION AI",
    poweredBy: "Dharm AI",
    commit,
    providers: {
      chat: { configured: chatConfigured, provider: "Groq" },
      search: { enabled: searchEnabled, mode: searchMode },
    },
  };
}
