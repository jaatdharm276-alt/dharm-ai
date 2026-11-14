const LIVE_RESEARCH_PATTERNS = [
  /\b(latest|current|breaking|today'?s news|recent news|live score|weather today|open now)\b/iu,
  /\b(search the web|look up online|verify online|find sources|cite sources)\b/iu,
  /\b(directions?|route|navigate|distance between|near me|nearby places?)\b/iu,
  /(रास्ता|रास्ते|दिशा|दूरी|नज़दीक|नजदीक|आसपास|आज की खबर|ताज़ा खबर|ताजा खबर|मौसम अभी)/u,
  /(kaise pahuchu|kaise jaun|rasta batao|direction batao|nearby batao)/iu,
];

/** True only when a request clearly needs live retrieval or navigation. */
export function shouldUseAgentMode(message) {
  const text = String(message || "").normalize("NFKC").trim();
  if (!text || text.length > 12000) return false;
  return LIVE_RESEARCH_PATTERNS.some((pattern) => pattern.test(text));
}
