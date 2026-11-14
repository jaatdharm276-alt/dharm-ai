const endpoint = process.env.ORION_AGENT_URL || "https://dharm-ai-git-orion-ai-agent-live-smoke-dharm-ai.vercel.app/api/agent";
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 150_000);

try {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
        ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
        : {}),
    },
    body: JSON.stringify({
      message: "Use search_web to find the official National Portal of India (India.gov.in). Answer briefly and cite the exact source URL.",
      messages: [],
      memories: [],
    }),
    signal: controller.signal,
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 800);
    throw new Error("ORION Agent API returned HTTP " + response.status + ": " + detail);
  }
  if (!response.body) throw new Error("ORION Agent API did not return a response stream.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  const stages = [];
  let terminalStage = "";
  let searchSucceeded = false;
  let toolFailed = false;

  while (true) {
    const part = await reader.read();
    if (part.done) break;
    buffer += decoder.decode(part.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const event = JSON.parse(data);
        if (event.orion_status?.detail) stages.push(event.orion_status.detail);
        if (event.orion_status?.stage) terminalStage = event.orion_status.stage;
        if (event.orion_status?.stage === "tool_error") toolFailed = true;
        if (event.orion_status?.stage === "tool_completed" && /web search completed with verified sources/i.test(event.orion_status?.detail || "")) searchSucceeded = true;
        const delta = event.choices?.[0]?.delta?.content;
        if (typeof delta === "string") answer += delta;
      } catch {
        // Ignore non-JSON stream fragments; continue parsing the SSE response.
      }
    }
  }

  if (terminalStage !== "complete") {
    throw new Error("Agent did not reach complete status (terminal stage: " + (terminalStage || "missing") + "). Stages: " + stages.join(" | ") + ". Response: " + answer.slice(0, 1200));
  }
  if (toolFailed) throw new Error("Agent emitted a tool_error status. Stages: " + stages.join(" | "));
  if (!searchSucceeded) throw new Error("Agent did not report a successful web search with verified sources (Tavily or Bing RSS fallback). Stages: " + stages.join(" | "));
  if (!/https?:\/\/(?:www\.)?india\.gov\.in\b/i.test(answer)) {
    throw new Error("Agent response did not cite the expected India.gov.in source. Response: " + answer.slice(0, 1200));
  }

  console.log(JSON.stringify({
    status: "passed",
    terminalStage,
    searchSucceeded,
    toolFailed,
    endpoint,
    source: "india.gov.in",
    responseCharacters: answer.length,
    observedStages: [...new Set(stages)].slice(0, 12),
    answer: answer.slice(0, 1400),
  }, null, 2));
} finally {
  clearTimeout(timeout);
}
