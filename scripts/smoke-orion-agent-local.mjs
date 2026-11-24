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
      message: "According to the official india.gov.in/services page, which campaign does the page say played a pivotal role in promoting online accessibility? Answer with the campaign name only, make no other factual claims, and cite the exact HTTPS page URL.",
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
  const statusEvents = [];
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
        if (event.orion_status?.stage) {
          terminalStage = event.orion_status.stage;
          statusEvents.push({ stage: event.orion_status.stage, detail: String(event.orion_status.detail || "").slice(0, 400) });
        }
        if (event.orion_status?.stage === "tool_error") toolFailed = true;
        if (
          event.orion_status?.stage === "tool_completed" &&
          /वेब खोज से (?:परिणाम मिले|प्रासंगिक स्रोत मिले)|web search completed/i.test(event.orion_status?.detail || "")
        ) searchSucceeded = true;
        const delta = event.choices?.[0]?.delta?.content;
        if (typeof delta === "string") answer += delta;
      } catch {
        // Ignore non-JSON stream fragments and continue parsing SSE.
      }
    }
  }

  console.log(JSON.stringify({ status: "diagnostic", terminalStage, searchSucceeded, observedStages: [...new Set(stages)], statusEvents, answerPreview: answer.slice(0, 500) }, null, 2));

  if (!/Digital India/i.test(answer)) {
    throw new Error("Official-page answer did not identify the campaign stated in the page content. Observed answer: " + answer.slice(0, 800));
  }

  const evidence = assertVerifiedAgentResponse({
    terminalStage,
    toolFailed,
    searchSucceeded,
    answer,
    expectedHost: "india.gov.in",
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
