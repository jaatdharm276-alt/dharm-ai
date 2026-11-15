import test from "node:test";
import assert from "node:assert/strict";
import { shouldUseAgentMode, shouldEscalateAfterChat } from "../lib/orion-routing.mjs";

test("routes current information and web research to Agent mode", () => {
  for (const query of ["latest India news", "weather today", "search the web for ISRO", "verify online this claim"]) {
    assert.equal(shouldUseAgentMode(query), true, query);
  }
});

test("routes Hindi and Hinglish navigation questions to Agent mode", () => {
  for (const query of ["Jaipur ka rasta batao", "mujhe station kaise pahuchu", "उदयपुर का रास्ता बताओ", "nearby places batao"]) {
    assert.equal(shouldUseAgentMode(query), true, query);
  }
});

test("routes colloquial Hindi and Hinglish live-research prompts to Agent mode", () => {
  for (const query of ["aaj ki news batao", "aaj ka mausam kya hai", "is claim ko verify karo", "online check karo", "स्रोत के साथ बताओ"]) {
    assert.equal(shouldUseAgentMode(query), true, query);
  }
});

test("routes colloquial code-review and debugging prompts to Agent mode", () => {
  for (const query of ["code me bug dhundo", "isko check karke batao", "कोड में बग ढूँढो", "find the bug in this code"]) {
    assert.equal(shouldUseAgentMode(query), true, query);
  }
});

test("keeps ordinary chat, math and writing in Chat mode", () => {
  for (const query of ["Who made ORION AI?", "2 + 2", "Write a birthday message", "Explain photosynthesis", "aaj mera birthday hai"]) {
    assert.equal(shouldUseAgentMode(query), false, query);
  }
});

test("escalates explicit non-answers for research prompts", () => {
  assert.equal(shouldEscalateAfterChat("latest India news", ""), true);
  assert.equal(shouldEscalateAfterChat("latest India news", "I don't know"), true);
  assert.equal(shouldEscalateAfterChat("Who made ORION AI?", "Dharm AI"), false);
});
