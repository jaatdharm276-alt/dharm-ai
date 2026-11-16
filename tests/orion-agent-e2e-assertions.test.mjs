import test from "node:test";
import assert from "node:assert/strict";
import {
  assertDeploymentCommit,
  assertVerifiedAgentResponse,
} from "../lib/orion-agent-e2e-assertions.mjs";

const sha = "a".repeat(40);
const goodAnswer = "भारत सरकार का राष्ट्रीय पोर्टल सरकारी जानकारी और ऑनलाइन सेवाओं तक एक केंद्रीय पहुँच प्रदान करता है। आधिकारिक स्रोत: https://www.india.gov.in/";

test("requires the deployed API commit to match the expected PR head", () => {
  assert.equal(assertDeploymentCommit(sha, sha), sha);
});

test("rejects a missing or mismatched deployed commit SHA", () => {
  assert.throws(() => assertDeploymentCommit("", sha), /valid Vercel commit SHA/);
  assert.throws(() => assertDeploymentCommit("b".repeat(40), sha), /commit mismatch/);
});

test("accepts a completed answer with a citation on the expected official host", () => {
  const result = assertVerifiedAgentResponse({
    terminalStage: "complete",
    toolFailed: false,
    searchSucceeded: true,
    answer: goodAnswer,
    expectedHost: "india.gov.in",
  });
  assert.equal(result.citedSources, 1);
  assert.deepEqual(result.matchingSourceHosts, ["www.india.gov.in"]);
});

test("rejects reasoning and verification fallback even when it includes URLs", () => {
  assert.throws(() => assertVerifiedAgentResponse({
    terminalStage: "complete",
    toolFailed: false,
    searchSucceeded: true,
    answer: "AI reasoning/verification विफल होने के कारण कोई तथ्यात्मक दावा नहीं दिया जा रहा। स्रोत: https://www.india.gov.in/",
  }), /partial or unverified fallback/);
});

test("rejects unrelated citations such as Wikipedia for an official portal query", () => {
  assert.throws(() => assertVerifiedAgentResponse({
    terminalStage: "complete",
    toolFailed: false,
    searchSucceeded: true,
    answer: "यह सरकारी पोर्टल है। Sources: https://en.wikipedia.org/wiki/India.gov.in",
  }), /expected official host/);
});

test("rejects incomplete agent runs even if a source URL is present", () => {
  assert.throws(() => assertVerifiedAgentResponse({
    terminalStage: "partial_recovery",
    toolFailed: false,
    searchSucceeded: true,
    answer: goodAnswer,
  }), /did not finish with complete status/);
});
