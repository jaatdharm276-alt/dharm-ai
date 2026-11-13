const MARKDOWN_LINK = /\[([^\]]{1,180})\]\((https?:\/\/[^\s)]+)\)/g;

export function extractSources(content, limit = 6) {
  const text = typeof content === "string" ? content : "";
  const safeLimit = Number.isInteger(limit) ? Math.max(0, Math.min(limit, 10)) : 6;
  const seen = new Set();
  const sources = [];
  for (const match of text.matchAll(MARKDOWN_LINK)) {
    const label = match[1].trim();
    let url;
    try {
      url = new URL(match[2]);
    } catch {
      continue;
    }
    if (!["http:", "https:"].includes(url.protocol)) continue;
    url.hash = "";
    const href = url.toString();
    const key = href.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      title: label || url.hostname,
      domain: url.hostname.replace(/^www\./, ""),
      url: href,
    });
    if (sources.length >= safeLimit) break;
  }
  return sources;
}
