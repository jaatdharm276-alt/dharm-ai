import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMemories, MAX_MEMORY_ITEMS, MAX_MEMORY_CHARS } from "../lib/orion-memory.mjs";

test("normalizes, trims, and deduplicates saved memories", () => {
  assert.deepEqual(normalizeMemories([{ id: "a", text: "  I prefer Hindi. " }, { text: "i prefer hindi." }]), [{ id: "a", text: "I prefer Hindi." }]);
});
test("ignores invalid and empty memory entries", () => {
  assert.deepEqual(normalizeMemories([null, {}, { text: " " }, 42]), []);
});
test("limits memory count and each memory length", () => {
  const result = normalizeMemories(Array.from({ length: 20 }, (_, i) => ({ text: String(i) + "x".repeat(400) })));
  assert.equal(result.length, MAX_MEMORY_ITEMS);
  assert.equal(result[0].text.length, MAX_MEMORY_CHARS);
});
test("assigns safe fallback ids", () => {
  assert.equal(normalizeMemories([{ id: {}, text: "Remember this" }])[0].id, "memory-1");
});
