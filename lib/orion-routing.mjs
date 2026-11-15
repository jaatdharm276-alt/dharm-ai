const LIVE_RESEARCH_PATTERNS = [
  /\b(latest|current|breaking|today'?s news|recent news|live score|weather today|open now)\b/iu,
  /\b(search the web|look up online|verify online|find sources|cite sources|search for|find data|official data)\b/iu,
  /\b(directions?|route|navigate|distance between|near me|nearby places?)\b/iu,
  /(रास्ता|रास्ते|दिशा|दूरी|नज़दीक|नजदीक|आसपास|आज की खबर|ताज़ा खबर|ताजा खबर|मौसम अभी)/u,
  /(खोजो|खोज कर|ढूँढो|ढूंढो|स्रोत|सोर्स|आँकड़े|आंकड़े|डेटा|ताज़ा जानकारी|ताजा जानकारी|वर्तमान जानकारी|अभी की जानकारी|पुष्टि करो|सत्यापित करो)/u,
  /(kaise pahuchu|kaise jaun|rasta batao|direction batao|nearby batao)/iu,
];

const COMPLEXITY_PATTERNS = [
  /\b(compare|comparison|evaluate|investigate|research|analy[sz]e|debug|architect|strategy|roadmap|audit|optimi[sz]e|implement|integrate|troubleshoot|root cause|step by step|in depth|deep dive)\b/iu,
  /\b(pros and cons|trade.?offs|multiple sources|evidence|comprehensive|end.?to.?end|multi.?step|plan and execute)\b/iu,
  /(तुलना|विश्लेषण|जाँच|ऑडिट|कार्यान्वित|इम्प्लीमेंट|समस्या का कारण|गहराई से|विस्तार से|रिसर्च|अनुमान बनाओ|अनुमान लगाओ|सीमाएँ समझाओ|सीमाएं समझाओ|कौन.?से राज्य|क्यों हैं)/u,
  /(पूरी योजना|स्टेप बाय स्टेप|कई चरण|सभी कमियाँ|ठीक करके|दो भरोसेमंद स्रोत|दो स्रोत|स्रोतों से पुष्टि|सभी आँकड़ों|सभी आंकड़ों)/u,
];

const MULTI_PART_PATTERNS = [
  /\b(and then|after that|also|plus|as well as)\b/iu,
  /(और फिर|उसके बाद|साथ में|इसके अलावा|भी साथ|फिर|साथ ही)/u,
];

/**
 * Explicit retrieval, source verification, and multi-part research requests
 * must start in Agent mode. Ordinary conversational prompts remain in Chat.
 */
export function shouldUseAgentMode(message) {
  const text = String(message || "").normalize("NFKC").trim();
  if (!text || text.length > 12000) return false;
  if (LIVE_RESEARCH_PATTERNS.some((pattern) => pattern.test(text))) return true;
  const complexitySignals = COMPLEXITY_PATTERNS.filter((pattern) => pattern.test(text)).length;
  const multiPartSignals = MULTI_PART_PATTERNS.filter((pattern) => pattern.test(text)).length;
  const sentenceCount = (text.match(/[.!?।]+/gu) || []).length;
  return (complexitySignals >= 1 && (text.length > 140 || multiPartSignals > 0 || sentenceCount >= 2))
    || complexitySignals >= 2
    || (multiPartSignals >= 2 && text.length > 180);
}

/** Detect clear non-answers so the UI can transparently escalate to Agent. */
export function shouldEscalateAfterChat(message, answer) {
  const prompt = String(message || "").trim();
  const reply = String(answer || "").trim();
  if (!prompt || prompt.length > 12000) return false;
  if (!reply) return true;
  const uncertainty = /\b(i (?:don't|do not) know|i cannot answer|unable to answer|not enough information|i can't help)\b|(?:मुझे नहीं पता|उत्तर नहीं दे पा रहा|जानकारी उपलब्ध नहीं|जवाब नहीं दे सकता|समझ नहीं पाया)/iu;
  if (uncertainty.test(reply)) return true;
  return reply.length < 24 && shouldUseAgentMode(prompt);
}
