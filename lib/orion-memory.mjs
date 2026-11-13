export const MAX_MEMORY_ITEMS = 12;
export const MAX_MEMORY_CHARS = 300;
export const MAX_MEMORY_TAGS = 8;
export const MEMORY_CATEGORIES = new Set(["preference", "project", "workflow", "personal", "other"]);

const MEMORY_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from",
  "how", "i", "in", "is", "it", "me", "my", "of", "on", "or", "that",
  "the", "this", "to", "we", "what", "when", "where", "with", "you", "your",
  "hai", "hain", "ho", "ka", "ke", "ki", "ko", "kya", "mein", "me", "mera",
  "meri", "mere", "mujhe", "par", "se", "aur", "ye", "yah", "woh", "wo",
]);

function memoryTokens(value) {
  return String(value || "").toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || [];
}

function validIsoDate(value) {
  if (typeof value !== "string" || value.length > 40) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function normalizeTags(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((tag) => typeof tag === "string")
    .map((tag) => tag.trim().toLocaleLowerCase().slice(0, 32))
    .filter(Boolean))].slice(0, MAX_MEMORY_TAGS);
}

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

    const candidate = typeof item?.id === "string" && item.id.trim() && item.id.length <= 80 ? item.id : "";
    let id = candidate;
    if (!id || usedIds.has(id)) {
      do { id = `memory-${nextId++}`; } while (usedIds.has(id));
    }
    usedIds.add(id);

    const category = MEMORY_CATEGORIES.has(item?.category) ? item.category : null;
    const createdAt = validIsoDate(item?.createdAt);
    const updatedAt = validIsoDate(item?.updatedAt);
    const expiresAt = validIsoDate(item?.expiresAt);
    const tags = normalizeTags(item?.tags);
    normalized.push({
      id,
      text: value,
      ...(item?.pinned === true ? { pinned: true } : {}),
      ...(category ? { category } : {}),
      ...(tags.length ? { tags } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(updatedAt ? { updatedAt } : {}),
      ...(expiresAt ? { expiresAt } : {}),
    });
    if (normalized.length >= MAX_MEMORY_ITEMS) break;
  }
  return normalized;
}

export function selectRelevantMemories(input, query, limit = 5, now = Date.now()) {
  const memories = normalizeMemories(input).filter((item) => !item.expiresAt || Date.parse(item.expiresAt) > now);
  const pinned = memories.filter((item) => item.pinned);
  const queryTokens = new Set(memoryTokens(query).filter((token) => !MEMORY_STOP_WORDS.has(token)));
  if (!queryTokens.size) return pinned;

  const ranked = memories
    .filter((item) => !item.pinned)
    .map((item, index) => {
      const tokens = memoryTokens(item.text).filter((token) => !MEMORY_STOP_WORDS.has(token));
      const uniqueTokens = new Set([...tokens, ...item.tags || []]);
      let score = 0;
      for (const token of uniqueTokens) if (queryTokens.has(token)) score += 1;
      const normalizedQuery = String(query || "").toLocaleLowerCase().trim();
      if (normalizedQuery.length >= 4 && item.text.toLocaleLowerCase().includes(normalizedQuery)) score += 4;
      return { item, score, index };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(0, Number.isFinite(limit) ? Math.floor(limit) : 5))
    .map((entry) => entry.item);

  return [...pinned, ...ranked];
}

export const MEMORY_BACKUP_FORMAT = "orion-memory-backup";
export const MEMORY_BACKUP_VERSION = 2;
export const MAX_MEMORY_BACKUP_BYTES = 16 * 1024;

export function createMemoryBackup(input, exportedAt = new Date().toISOString()) {
  return { format: MEMORY_BACKUP_FORMAT, version: MEMORY_BACKUP_VERSION, exportedAt, memories: normalizeMemories(input) };
}

export function parseMemoryBackup(raw) {
  if (typeof raw !== "string" || raw.length > MAX_MEMORY_BACKUP_BYTES) throw new Error("Backup file is too large or invalid.");
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error("This file is not valid JSON."); }
  if (!data || data.format !== MEMORY_BACKUP_FORMAT || ![1, MEMORY_BACKUP_VERSION].includes(data.version) || !Array.isArray(data.memories)) {
    throw new Error("This is not a supported ORION Memory backup.");
  }
  return normalizeMemories(data.memories);
}
