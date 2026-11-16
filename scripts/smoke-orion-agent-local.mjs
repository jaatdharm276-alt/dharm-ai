import {
  assertDeploymentCommit,
  assertVerifiedAgentResponse,
} from "../lib/orion-agent-e2e-assertions.mjs";

const endpoint = process.env.ORION_AGENT_URL || "http://127.0.0.1:3000/api/agent";
const expectedSha = process.env.ORION_EXPECTED_DEPLOYMENT_SHA;
if (!expectedSha) throw new Error("ORION_EXPECTED_DEPLOYMENT_SHA must be the exact checked-out commit SHA.");

const parsed = new URL(endpoint);
if (parsed.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(parsed.hostname)) {
  throw new Error("Local E2E only permits an HTTP loopback endpoint.");
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 150_000);

try {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "भारत के Press Information Bureau (PIB) की भूमिका क्या है? केवल pib.gov.in के आधिकारिक स्रोत से संक्षेप में बताएं और उसका URL उद्धृत करें।",
      messages: [],
      memories: [],
    }),
    signal: controller.signal,
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 800);
    throw new Error("Local ORION Agent API returned HTTP " + response.status + ": " + detail);
  }
  if (!response.body) throw new Error("Local ORION Agent API did not return a response stream.");

  const deploymentSha = response.headers.get("x-orion-deployment-sha");
  assertDeploymentCommit(deploymentSha, expectedSha);

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
          /वेब खोज से (?:परिणाम मिले|सत्यापित स्रोत मिले)|web search completed with verified sources/i.test(event.orion_status?.detail || "")
        ) searchSucceeded = true;
        const delta = event.choices?.[0]?.delta?.content;
        if (typeof delta === "string") answer += delta;
      } catch {
        // Ignore non-JSON stream fragments and continue parsing SSE.
      }
    }
  }

  const evidence = assertVerifiedAgentResponse({
    terminalStage,
    toolFailed,
    searchSucceeded,
    answer,
    expectedHost: "pib.gov.in",
  });

  console.log(JSON.stringify({
    status: "passed",
    mode: "local-ci",
    endpoint,
    deploymentSha,
    expectedSha,
    terminalStage,
    searchSucceeded,
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
