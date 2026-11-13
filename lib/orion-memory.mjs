export const MAX_MEMORY_ITEMS = 12;
export const MAX_MEMORY_CHARS = 300;

export function normalizeMemories(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const usedIds = new Set();
  const normalized = [];
  let nextId = 1;

  for (const item of input) {
    const text = typeof item === "string" ? item.trim() : typeof item?.text === "string" ? item.text.trim() : "";
    if (!text) continue;
    const value = text.slice(0, MAX_MEMORY_CHARS);
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const candidate = typeof item?.id === "string" && item.id.trim() && item.id.length <= 80
      ? item.id
      : "";
    let id = candidate;
    if (!id || usedIds.has(id)) {
      do {
        id = `memory-${nextId++}`;
      } while (usedIds.has(id));
    }
    usedIds.add(id);
    normalized.push({ id, text: value });
    if (normalized.length >= MAX_MEMORY_ITEMS) break;
  }
  return normalized;
}

export const MEMORY_BACKUP_FORMAT = "orion-memory-backup";
export const MEMORY_BACKUP_VERSION = 1;
export const MAX_MEMORY_BACKUP_BYTES = 16 * 1024;

export function createMemoryBackup(input, exportedAt = new Date().toISOString()) {
  return { format: MEMORY_BACKUP_FORMAT, version: MEMORY_BACKUP_VERSION, exportedAt, memories: normalizeMemories(input) };
}

export function parseMemoryBackup(raw) {
  if (typeof raw !== "string" || raw.length > MAX_MEMORY_BACKUP_BYTES) throw new Error("Backup file is too large or invalid.");
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error("This file is not valid JSON."); }
  if (!data || data.format !== MEMORY_BACKUP_FORMAT || data.version !== MEMORY_BACKUP_VERSION || !Array.isArray(data.memories)) {
    throw new Error("This is not a supported ORION Memory backup.");
  }
  return normalizeMemories(data.memories);
}
