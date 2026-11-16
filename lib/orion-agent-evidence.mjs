const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "into", "about", "compare", "comparison",
  "explain", "their", "this", "that", "which", "what", "when", "where", "how",
  "भारत", "और", "में", "की", "के", "का", "को", "से", "पर", "तक", "लिए", "बताओ",
  "करो", "साथ", "सभी", "एक", "दो", "तीन", "तुलना", "समझाओ", "क्या", "कौन",
]);

function clean(value, max = 900) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").replace(/\[\[?\d+\]?\]/g, "").replace(/\(\s*\d+\s*\)/g, "").trim().slice(0, max)
    : "";
}

function tokens(value) {
  return new Set(
    String(value || "").toLowerCase().match(/[a-z0-9]+(?:\.[0-9]+)?|[\u0900-\u097f]{2,}/g)?.filter((word) =>
      !STOP_WORDS.has(word) && (word.length > 2 || /^\d/.test(word)),
    ) || [],
  );
}

export function buildObjectiveSearchQuery(objective, proposedQuery = "") {
  const task = clean(objective, 320);
  const proposed = clean(proposedQuery, 220);
  const hindiToEnglish = [["भारत", "India"], ["जापान", "Japan"], ["रोबोटिक्स", "robotics"], ["स्वचालन", "automation"]];
  const translated = hindiToEnglish.filter(([hindi]) => task.includes(hindi)).map(([, english]) => english);
  return [task, translated.join(" "), proposed].filter(Boolean).join(" ").slice(0, 500);
}

export function isRelevantAgentSource(source, objective) {
  const target = tokens(objective);
  const evidence = tokens([source?.title, source?.content, source?.snippet, source?.description, source?.url].join(" "));
  if (!target.size || !evidence.size) return false;
  let overlap = 0;
  for (const word of target) if (evidence.has(word)) overlap += 1;
  const required = Math.min(3, Math.max(2, Math.ceil(target.size * 0.18)));
  return overlap >= required;
}

export function buildAgentEvidenceAnswer({ toolResults = [], failureCode = "GROQ_RATE_LIMITED", objective = "" } = {}) {
  const items = Array.isArray(toolResults) ? toolResults : [];
  const time = items.find((item) => item?.name === "get_india_datetime")?.result;
  const search = items.find((item) => item?.name === "search_web")?.result;
  const candidates = Array.isArray(search?.results) ? search.results : [];
  const sources = candidates.filter((source) => isRelevantAgentSource(source, objective)).slice(0, 3);
  const lines = [];

  if (time?.current) lines.push(`भारत में वर्तमान तारीख और समय: ${clean(time.current, 160)} (Asia/Kolkata)।`);

  if (sources.length) {
    lines.push("सवाल से संबंधित संभावित स्रोत मिले हैं। AI reasoning/verification विफल होने के कारण नीचे दिए गए स्रोतों से कोई तथ्यात्मक दावा यहाँ प्रस्तुत नहीं किया जा रहा:");
    for (const source of sources) {
      const label = clean(source.title, 180) || "वेब स्रोत";
      const url = clean(source.url, 500);
      if (url.startsWith("https://") || url.startsWith("http://")) lines.push(`- ${label}: ${url}`);
    }
  } else {
    lines.push("इस सवाल के मुख्य विषय से मेल खाने वाला पर्याप्त वेब प्रमाण नहीं मिला। सामान्य या असंबंधित पेजों को स्रोत के रूप में नहीं दिखाया गया।");
  }

  lines.push("", failureCode === "GROQ_RATE_LIMITED"
    ? "आंशिक परिणाम: AI provider की rate limit के कारण उत्तर का विश्लेषण और पूर्ण सत्यापन पूरा नहीं हो सका।"
    : "आंशिक परिणाम: AI का अगला reasoning चरण पूरा नहीं हो सका; इसलिए इसे पूर्ण सत्यापित उत्तर न मानें।");
  return lines.join("\n");
}

/**
 * Attach exact URLs from relevant search results to the final answer.
 * This cites retrieved search evidence; it does not claim the page was opened.
 */
export function appendRelevantSourceCitations(answer, toolResults = [], objective = "") {
  const text = String(answer || "").trim();
  const items = Array.isArray(toolResults) ? toolResults : [];
  const searchResults = items
    .filter((item) => item?.name === "search_web")
    .flatMap((item) => Array.isArray(item?.result?.results) ? item.result.results : []);
  const relevant = searchResults
    .filter((source) => isRelevantAgentSource(source, objective))
    .flatMap((source) => {
      try {
        const parsed = new URL(String(source?.url || ""));
        if (parsed.protocol !== "https:") return [];
        return [{ title: clean(source?.title, 160) || parsed.hostname, url: parsed.toString() }];
      } catch {
        return [];
      }
    });
  const seen = new Set();
  const unique = relevant.filter((source) => {
    if (seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  }).slice(0, 3);
  if (!unique.length) return text;
  const missing = unique.filter((source) => !text.includes(source.url));
  if (!missing.length) return text;
  const citationBlock = missing.map((source) => "- " + source.title + ": " + source.url).join("\n");
  return text + "\n\nस्रोत (प्राप्त वेब खोज परिणाम):\n" + citationBlock;
}