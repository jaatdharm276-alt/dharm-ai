import test from "node:test";
import assert from "node:assert/strict";
import { shouldUseAgentMode, shouldEscalateAfterChat } from "./orion-routing.mjs";

test("keeps simple everyday prompts in normal chat", () => {
  for (const prompt of ["नमस्ते", "2 + 2 कितना होता है?", "हनुमान चालीसा सुनाओ", "Translate hello to Hindi"]) {
    assert.equal(shouldUseAgentMode(prompt), false, prompt);
  }
});

test("routes live research and navigation to agent", () => {
  for (const prompt of [
    "आज की ताजा खबर बताओ",
    "Find sources and verify online",
    "मेरे आसपास अस्पताल बताओ",
    "भारत में EV बिक्री के उपलब्ध आँकड़े खोजो और दो भरोसेमंद स्रोतों से पुष्टि करो",
  ]) {
    assert.equal(shouldUseAgentMode(prompt), true, prompt);
  }
});

test("routes multi-part Hindi research prompt used in the live acceptance test", () => {
  const prompt = "भारत में 2030 तक इलेक्ट्रिक वाहनों (EV) की मांग कितनी बढ़ सकती है? इसके लिए 2020 से 2026 तक भारत में EV बिक्री के उपलब्ध आँकड़े खोजो, दो भरोसेमंद स्रोतों से उनकी पुष्टि करो, फिर 2030 के लिए एक अनुमान बनाओ। अनुमान लगाने की विधि और उसकी सीमाएँ समझाओ। साथ ही बताओ कि भारत के कौन-से 5 राज्य EV अपनाने में आगे हैं और क्यों। सभी आँकड़ों के साथ स्रोत और तारीख भी देना।";
  assert.equal(shouldUseAgentMode(prompt), true);
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
