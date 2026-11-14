import test from "node:test";
import assert from "node:assert/strict";
import { shouldUseAgentMode } from "../lib/orion-routing.mjs";

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

test("keeps ordinary chat, math and writing in Chat mode", () => {
  for (const query of ["Who made ORION AI?", "2 + 2", "Write a birthday message", "Explain photosynthesis"]) {
    assert.equal(shouldUseAgentMode(query), false, query);
  }
});
