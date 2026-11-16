const FAILURE_MARKERS = [
  /AI reasoning\s*\/\s*verification\s*विफल/i,
  /reasoning(?: step)? (?:failed|unavailable)/i,
  /verification (?:failed|not completed|unavailable)/i,
  /आंशिक परिणाम/i,
  /पूर्ण सत्यापन नहीं हुई/i,
  /पूर्ण सत्यापित उत्तर न मानें/i,
  /कोई तथ्यात्मक दावा .* प्रस्तुत नहीं किया जा रहा/i,
];

export function assertDeploymentCommit(actual, expected) {
  const actualSha = String(actual || "").trim().toLowerCase();
  const expectedSha = String(expected || "").trim().toLowerCase();
  const fullSha = /^[0-9a-f]{40}$/;
  if (!fullSha.test(expectedSha)) {
    throw new Error("Expected deployment SHA must be a full 40-character Git commit SHA.");
  }
  if (!fullSha.test(actualSha)) {
    throw new Error("Deployed ORION API did not expose a valid Vercel commit SHA.");
  }
  if (actualSha !== expectedSha) {
    throw new Error("Deployed commit mismatch: expected " + expectedSha + " but received " + actualSha + ".");
  }
  return actualSha;
}

export function assertVerifiedAgentResponse({
  terminalStage,
  toolFailed,
  searchSucceeded,
  answer,
  expectedHost = "india.gov.in",
} = {}) {
  const text = String(answer || "").trim();
  if (terminalStage !== "complete") {
    throw new Error("Agent did not finish with complete status (received: " + (terminalStage || "missing") + ").");
  }
  if (toolFailed) throw new Error("Agent emitted a tool_error status.");
  if (!searchSucceeded) throw new Error("Agent did not report a successful web search.");
  const failure = FAILURE_MARKERS.find((pattern) => pattern.test(text));
  if (failure) {
    throw new Error("Agent returned a partial or unverified fallback instead of a verified answer.");
  }

  const host = String(expectedHost || "").trim().toLowerCase();
  if (!host) throw new Error("An expected source host is required for this E2E check.");
  const urls = text.match(/https?:\/\/[^\s<>"')\]]+/g) || [];
  const matchingSourceHosts = [];
  for (const raw of urls) {
    const candidate = raw.replace(/[.,;:!?]+$/, "");
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === "https:" && (parsed.hostname === host || parsed.hostname.endsWith("." + host))) {
        matchingSourceHosts.push(parsed.hostname);
      }
    } catch {
      // Ignore malformed URL fragments.
    }
  }
  if (matchingSourceHosts.length === 0) {
    throw new Error("Agent did not cite a source on the expected official host " + host + ".");
  }
  if (!/स्रोत|sources?/i.test(text)) {
    throw new Error("Agent cited a URL without identifying its sources.");
  }
  if (text.length < 80) throw new Error("Agent response is too short to count as a substantive answer.");

  return {
    citedSources: matchingSourceHosts.length,
    matchingSourceHosts: [...new Set(matchingSourceHosts)],
  };
}
