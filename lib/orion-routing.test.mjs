import test from "node:test";
import assert from "node:assert/strict";
import { shouldUseAgentMode, shouldEscalateAfterChat } from "./orion-routing.mjs";

test("keeps simple everyday prompts in normal chat", () => {
  for (const prompt of ["नमस्ते", "2 + 2 कितना होता है?", "हनुमान चालीसा सुनाओ", "Translate hello to Hindi"]) {
    assert.equal(shouldUseAgentMode(prompt), false, prompt);
  }
});

test("routes live research and navigation to agent", () => {
  assert.equal(shouldUseAgentMode("आज की ताजा खबर बताओ"), true);
  assert.equal(shouldUseAgentMode("Find sources and verify online"), true);
  assert.equal(shouldUseAgentMode("मेरे आसपास अस्पताल बताओ"), true);
});

test("routes genuinely complex multi-step requests to agent", () => {
  assert.equal(shouldUseAgentMode("ORION AI का पूरा security audit करके सभी कमियाँ ठीक करो और tests चलाओ"), true);
  assert.equal(shouldUseAgentMode("Compare these three architectures, analyze the trade-offs, and create a migration roadmap for the team"), true);
  assert.equal(shouldUseAgentMode("मुझे विस्तार से रिसर्च करके सभी विकल्पों की तुलना और पूरी योजना दो"), true);
});

test("does not escalate ordinary short factual questions", () => {
  assert.equal(shouldUseAgentMode("भारत की राजधानी क्या है?"), false);
  assert.equal(shouldUseAgentMode("आज सोमवार है?"), false);
});

test("detects empty or explicit non-answer chat responses for fallback", () => {
  assert.equal(shouldEscalateAfterChat("hard question", ""), true);
  assert.equal(shouldEscalateAfterChat("hard question", "I don't know the answer."), true);
  assert.equal(shouldEscalateAfterChat("simple question", "The answer is 42."), false);
});
