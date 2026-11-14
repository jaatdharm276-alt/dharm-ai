function clean(value, max = 900) {
  return typeof value === "string" ? value.replace(/\\s+/g, " ").trim().slice(0, max) : "";
}

export function buildAgentEvidenceAnswer({ toolResults = [], failureCode = "GROQ_RATE_LIMITED" } = {}) {
  const items = Array.isArray(toolResults) ? toolResults : [];
  const time = items.find((item) => item?.name === "get_india_datetime")?.result;
  const search = items.find((item) => item?.name === "search_web")?.result;
  const sources = Array.isArray(search?.results) ? search.results.slice(0, 3) : [];
  const lines = [];

  if (time?.current) lines.push(`भारत में वर्तमान तारीख और समय: ${clean(time.current, 160)} (Asia/Kolkata)।`);

  if (sources.length) {
    const first = sources[0];
    const title = clean(first.title, 180);
    const content = clean(first.content || first.snippet || first.description, 1200);
    if (content) lines.push(content);
    else if (title) lines.push(`प्राप्त स्रोत: ${title}`);
    lines.push("", "स्रोत:");
    for (const source of sources) {
      const label = clean(source.title, 180) || "वेब स्रोत";
      const url = clean(source.url, 500);
      if (url.startsWith("https://") || url.startsWith("http://")) lines.push(`- ${label}: ${url}`);
      else lines.push(`- ${label}`);
    }
  }

  if (!lines.length) {
    lines.push("कुछ टूल चले, लेकिन पर्याप्त सत्यापित जानकारी उपलब्ध नहीं हुई।");
  }

  lines.push("", failureCode === "GROQ_RATE_LIMITED"
    ? "आंशिक परिणाम: Groq की rate limit के कारण ORION अगला reasoning चरण पूरा नहीं कर सका। थोड़ी देर बाद दोबारा प्रयास करें।"
    : "आंशिक परिणाम: AI का अगला reasoning चरण पूरा नहीं हो सका।");
  return lines.join("\n");
}
