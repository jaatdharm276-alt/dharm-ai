import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMemories, selectRelevantMemories, MAX_MEMORY_ITEMS, MAX_MEMORY_CHARS, createMemoryBackup, parseMemoryBackup, MAX_MEMORY_BACKUP_BYTES, MEMORY_BACKUP_VERSION } from "../lib/orion-memory.mjs";

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
  const result = normalizeMemories([{ id: "same", text: "First memory" }, { id: "same", text: "Second memory" }, { id: "", text: "Third memory" }, { id: "memory-1", text: "Fourth memory" }]);
  const ids = result.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(Boolean));
});
test("preserves pinned state through normalization and backup", () => {
  assert.deepEqual(normalizeMemories([{ id: "a", text: "Use Hindi", pinned: true }]), [{ id: "a", text: "Use Hindi", pinned: true }]);
});
test("preserves validated v2 metadata and drops invalid metadata", () => {
  assert.deepEqual(normalizeMemories([{ id: "a", text: "ORION project", category: "project", tags: ["Agent", "AGENT", "", 3], createdAt: "2026-01-01T00:00:00Z", expiresAt: "invalid", pinned: true }]), [
    { id: "a", text: "ORION project", pinned: true, category: "project", tags: ["agent"], createdAt: "2026-01-01T00:00:00.000Z" },
  ]);
});
test("selects matching memories and always includes pinned notes", () => {
  const memories = [{ id: "a", text: "I prefer Hindi replies" }, { id: "b", text: "My project is ORION AI" }, { id: "c", text: "I use an Android phone", pinned: true }, { id: "d", text: "I like short answers" }];
  assert.deepEqual(selectRelevantMemories(memories, "Tell me about my ORION AI project").map((item) => item.id), ["c", "b"]);
});
test("uses tags for relevance and excludes expired memories, including pinned ones", () => {
  const memories = [
    { id: "tagged", text: "Build notes", tags: ["orion", "agentic"] },
    { id: "expired", text: "ORION old note", pinned: true, expiresAt: "2025-01-01T00:00:00.000Z" },
    { id: "pinned", text: "Always use Hindi", pinned: true },
  ];
  assert.deepEqual(selectRelevantMemories(memories, "agentic ORION", 5, Date.parse("2026-01-01T00:00:00.000Z")).map((item) => item.id), ["pinned", "tagged"]);
});
test("does not inject unrelated unpinned memories", () => {
  assert.deepEqual(selectRelevantMemories([{ text: "I prefer Hindi" }], "Explain photosynthesis"), []);
});
test("exports v2 backups and restores metadata", () => {
  const backup = createMemoryBackup([{ text: "Use Hindi", pinned: true, category: "preference", tags: ["language"] }], "2026-01-01T00:00:00.000Z");
  assert.equal(backup.format, "orion-memory-backup");
  assert.equal(backup.version, MEMORY_BACKUP_VERSION);
  assert.deepEqual(parseMemoryBackup(JSON.stringify(backup)), [{ id: "memory-1", text: "Use Hindi", pinned: true, category: "preference", tags: ["language"] }]);
});
test("continues to import v1 backups", () => {
  const legacy = JSON.stringify({ format: "orion-memory-backup", version: 1, memories: [{ text: "Legacy memory", pinned: true }] });
  assert.deepEqual(parseMemoryBackup(legacy), [{ id: "memory-1", text: "Legacy memory", pinned: true }]);
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
