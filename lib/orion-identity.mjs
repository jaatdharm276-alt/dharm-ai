const CREATOR_ANSWERS = {
  orion: [
    "ORION AI को Dharm AI ने बनाया और विकसित किया है।",
    "इसके निर्माता और डेवलपर Dharmraj Jat हैं।",
    "ORION AI, Dharm AI project का हिस्सा है।",
  ].join("\\n"),
  dharm: [
    "Dharm AI को Dharmraj Jat ने बनाया है।",
    "Dharmraj Jat इसके निर्माता और डेवलपर हैं।",
  ].join("\\n"),
};

function normalizeQuestion(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("hi-IN")
    .replace(/[’']/gu, "")
    .replace(/[?!.，,।]/gu, " ")
    .replace(/\\s+/gu, " ")
    .trim();
}

/** Return a deterministic creator answer, or null for ordinary questions. */
export function getCreatorAnswer(message) {
  const text = normalizeQuestion(message);
  if (!text) return null;

  const asksWhoMade =
    /\\b(who made|who created|who built|who developed|who designed|creator|developer|founder)\\b/u.test(text) ||
    /(किसने बनाया|किसने बनायी|किसने बनाई|किसने बनाया है|किसने बनाया था|कौन बनाया|निर्माता कौन|डेवलपर कौन)/u.test(text) ||
    /(tumhe|tumhen|tumko|aapko|apko|ye|is|iska|iska)\\s+(kisne|kon|kaun)\\s+(banaya|banayi|banai|develop|design)/u.test(text) ||
    /(kisne|kon|kaun)\\s+(banaya|banayi|banai|develop|design)/u.test(text) ||
    /(tumhara|aapka|iska|is app ka)\\s+(creator|developer|owner|malik)\\s+(kaun|kon)/u.test(text) ||
    /(who is your|your)\\s+(creator|developer|owner)/u.test(text);

  if (!asksWhoMade) return null;

  const asksDharm =
    /dharm\\s*[- ]?ai/u.test(text) ||
    /धर्म\\s*एआई/u.test(text);

  const asksOrion =
    /orion\\s*[- ]?ai/u.test(text) ||
    /ओरियन\\s*एआई/u.test(text);

  if (asksDharm && !asksOrion) return CREATOR_ANSWERS.dharm;
  return CREATOR_ANSWERS.orion;
}
