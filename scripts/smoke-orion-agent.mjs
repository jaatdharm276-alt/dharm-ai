import {
  assertDeploymentCommit,
  assertVerifiedAgentResponse,
} from "../lib/orion-agent-e2e-assertions.mjs";

const endpoint = process.env.ORION_AGENT_URL;
if (!endpoint) {
  throw new Error("ORION_AGENT_URL must be set explicitly; refusing to fall back to a stale Preview deployment.");
}
const parsedEndpoint = new URL(endpoint);
if (parsedEndpoint.protocol !== "https:") {
  throw new Error("ORION_AGENT_URL must use HTTPS.");
}

const expectedDeploymentSha = process.env.ORION_EXPECTED_DEPLOYMENT_SHA;
if (!expectedDeploymentSha) {
  throw new Error("ORION_EXPECTED_DEPLOYMENT_SHA must be set to the exact Git commit being tested.");
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 150_000);

try {
  let response;
  let deploymentSha = "";
  // Branch aliases can briefly serve the previous Preview deployment while
  // Vercel propagates a new alias. Check the response header before consuming
  // the stream, cancel stale responses, and retry without accepting old code.
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
          ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
          : {}),
      },
      body: JSON.stringify({
        message: "According to the official india.gov.in/services page, which campaign does the page say played a pivotal role in promoting online accessibility? Answer with the campaign name only, make no other factual claims, and cite the exact HTTPS page URL.",
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
    deploymentSha = response.headers.get("x-orion-deployment-sha") || "";
    if (deploymentSha.toLowerCase() === expectedDeploymentSha.toLowerCase()) break;
    await response.body.cancel().catch(() => {});
    if (attempt === 12) assertDeploymentCommit(deploymentSha, expectedDeploymentSha);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  assertDeploymentCommit(deploymentSha, expectedDeploymentSha);

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
        if (
          event.orion_status?.stage === "tool_completed" &&
          /वेब खोज से (?:परिणाम मिले|प्रासंगिक स्रोत मिले)|web search completed/i.test(event.orion_status?.detail || "")
        ) {
          searchSucceeded = true;
        }
        const delta = event.choices?.[0]?.delta?.content;
        if (typeof delta === "string") answer += delta;
      } catch {
        // Ignore non-JSON stream fragments; continue parsing the SSE response.
      }
    }
  }

  let evidence;
  try {
    evidence = assertVerifiedAgentResponse({
      terminalStage,
      toolFailed,
      searchSucceeded,
      answer,
      expectedHost: "india.gov.in",
    });
  } catch (error) {
    throw new Error(
      error.message +
      "\\nObserved stages: " + [...new Set(stages)].join(" | ") +
      "\\nAgent response: " + answer.slice(0, 1200),
    );
  }

  console.log(JSON.stringify({
    status: "passed",
    terminalStage,
    searchSucceeded,
    toolFailed,
    endpoint,
    deploymentSha,
    expectedDeploymentSha,
    evidenceStatus: "verified-agent-answer",
    citedSources: evidence.citedSources,
    matchingSourceHosts: evidence.matchingSourceHosts,
    responseCharacters: answer.length,
    observedStages: [...new Set(stages)].slice(0, 12),
    answer: answer.slice(0, 1400),
  }, null, 2));
} finally {
  clearTimeout(timeout);
}
