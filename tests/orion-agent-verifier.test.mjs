import test from "node:test";
import assert from "node:assert/strict";
import { buildVerifierEvidenceSummary, parseVerifierOutput } from "../lib/orion-agent-verifier.mjs";

test("parses a PASS verdict and a multiline answer before FINDINGS", () => {
  const parsed = parseVerifierOutput("VERDICT: PASS\nANSWER:\nपहली पंक्ति\nदूसरी पंक्ति\nFINDINGS:\nसमर्थित");
  assert.equal(parsed.verdict, "PASS");
  assert.equal(parsed.answer, "पहली पंक्ति\nदूसरी पंक्ति");
});

test("parses PARTIAL and preserves the answer", () => {
  const parsed = parseVerifierOutput("VERDICT: PARTIAL\nANSWER: सीमित उत्तर\nFINDINGS: स्रोत अधूरे हैं");
  assert.equal(parsed.verdict, "PARTIAL");
  assert.equal(parsed.answer, "सीमित उत्तर");
});

test("uses the complete answer when FINDINGS is absent", () => {
  const parsed = parseVerifierOutput("VERDICT: PASS\nANSWER: पहली पंक्ति\nदूसरी पंक्ति");
  assert.equal(parsed.verdict, "PASS");
  assert.equal(parsed.answer, "पहली पंक्ति\nदूसरी पंक्ति");
});

test("supports CRLF output and rejects an unknown verdict", () => {
  const parsed = parseVerifierOutput("VERDICT: UNKNOWN\r\nANSWER: उत्तर\r\nFINDINGS: जाँच");
  assert.equal(parsed.verdict, undefined);
  assert.equal(parsed.answer, "उत्तर");
});

test("normalizes evidence whitespace and joins evidence records with real newlines", () => {
  const summary = buildVerifierEvidenceSummary([
    { title: "Source one", url: "https://example.gov/one", content: "Line one\n\tLine two" },
    { title: "Source two", url: "https://example.gov/two", snippet: "Short evidence" },
  ]);
  assert.match(summary, /Evidence: Line one Line two/);
  assert.match(summary, /Source one[\s\S]*\n\[2\] Source two/);
  assert.doesNotMatch(summary, /Line one\\n/);
});
