import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMemories, MAX_MEMORY_ITEMS, MAX_MEMORY_CHARS, createMemoryBackup, parseMemoryBackup, MAX_MEMORY_BACKUP_BYTES } from "../lib/orion-memory.mjs";

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
test("ensures every normalized memory has a unique non-empty id", () => {
  const result = normalizeMemories([
    { id: "same", text: "First memory" },
    { id: "same", text: "Second memory" },
    { id: "", text: "Third memory" },
    { id: "memory-1", text: "Fourth memory" },
  ]);
  const ids = result.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(Boolean));
});

test("exports and restores a versioned memory backup", () => {
  const backup = createMemoryBackup([{ text: "Use Hindi" }], "2026-01-01T00:00:00.000Z");
  assert.equal(backup.format, "orion-memory-backup");
  assert.equal(backup.version, 1);
  assert.deepEqual(parseMemoryBackup(JSON.stringify(backup)), [{ id: "memory-1", text: "Use Hindi" }]);
});
test("rejects malformed and unsupported backup files", () => {
  assert.throws(() => parseMemoryBackup("{broken"), /valid JSON/);
  assert.throws(() => parseMemoryBackup(JSON.stringify({ format: "other", version: 1, memories: [] })), /supported ORION/);
  assert.throws(() => parseMemoryBackup(JSON.stringify({ format: "orion-memory-backup", version: 99, memories: [] })), /supported ORION/);
});
test("rejects oversized backup files", () => {
  assert.throws(() => parseMemoryBackup("x".repeat(MAX_MEMORY_BACKUP_BYTES + 1)), /too large/);
});
test("filters invalid entries during restore", () => {
  const raw = JSON.stringify({ format: "orion-memory-backup", version: 1, memories: [{ text: "Keep this" }, null, { text: " " }] });
  assert.deepEqual(parseMemoryBackup(raw), [{ id: "memory-1", text: "Keep this" }]);
});
