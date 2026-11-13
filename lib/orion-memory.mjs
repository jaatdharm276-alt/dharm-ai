export const MAX_MEMORY_ITEMS = 12;
export const MAX_MEMORY_CHARS = 300;

export function normalizeMemories(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const normalized = [];
  for (const item of input) {
    const text = typeof item === "string" ? item.trim() : typeof item?.text === "string" ? item.text.trim() : "";
    if (!text) continue;
    const value = text.slice(0, MAX_MEMORY_CHARS);
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      id: typeof item?.id === "string" && item.id.length <= 80 ? item.id : `memory-${normalized.length + 1}`,
      text: value,
    });
    if (normalized.length >= MAX_MEMORY_ITEMS) break;
  }
  return normalized;
}
