import test from "node:test";
import assert from "node:assert/strict";
import { formatChatTranscript } from "../lib/orion-export.mjs";

test("exports user and assistant messages with speaker labels", () => {
  assert.equal(
    formatChatTranscript([
      { role: "system", content: "hidden" },
      { role: "user", content: "Namaste" },
      { role: "assistant", content: "Hello" },
    ]),
    "You:\nNamaste\n\nORION AI:\nHello",
  );
});

test("supports structured text content and ignores empty or unsupported messages", () => {
  assert.equal(
    formatChatTranscript([
      { role: "user", content: [{ text: "Part one" }, { text: " part two" }] },
      { role: "tool", content: "not shown" },
      null,
      { role: "assistant", content: "" },
    ]),
    "You:\nPart one part two\n\nORION AI:",
  );
});

test("returns an empty string for invalid or empty input", () => {
  assert.equal(formatChatTranscript(null), "");
  assert.equal(formatChatTranscript([]), "");
});
