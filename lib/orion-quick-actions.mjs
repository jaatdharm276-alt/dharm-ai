import { calculateSafely } from "./orion-tools.mjs";
import { convertUnits } from "./orion-units.mjs";

const DATE_TERMS = [
  /aaj(?:\s+ki)?\s+(?:date|tarikh|tareekh)/iu,
  /आज\s*(?:की)?\s*(?:तारीख|तिथि|डेट)/u,
  /today'?s\s+date/u,
  /what\s+date\s+is\s+it/u,
];
const TIME_TERMS = [
  /abhi\s+(?:kitne|kya)\s+baje/u,
  /current\s+time/u,
  /what\s+time\s+is\s+it/u,
  /अभी\s+कितने\s+बजे/u,
  /वर्तमान\s+समय/u,
];
const DATETIME_TERMS = [
  /aaj\s+(?:ka|ki)\s+din/u,
  /आज\s+(?:का|की)\s+दिन/u,
  /day\s+is\s+today/u,
];

function indiaParts(now) {
  const date = new Intl.DateTimeFormat("hi-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  const time = new Intl.DateTimeFormat("hi-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);
  return { date, time };
}

function cleanNumber(value) {
  return Number(value.toPrecision(12)).toString();
}

function parseCalculation(text) {
  const explicit = /^(?:calculate|calc|solve|hisab|गणना|हल करो)\s*[:：]?\s*(.+)$/iu.exec(text);
  if (explicit) return explicit[1].trim();
  const symbolic = /^(?:\(?\s*\d[\d\s().+*/%^-]*\d\s*\)?|\d+(?:\.\d+)?\s*[+*/%-]\s*\d[\d\s().+*/%^-]*)$/u;
  if (symbolic.test(text) && /[+*/%^]|\s-\s/u.test(text)) return text;
  const words = /^(\d+(?:\.\d+)?)\s+(?:plus|जोड़)\s+(\d+(?:\.\d+)?)$/iu.exec(text);
  if (words) return `${words[1]}+${words[2]}`;
  const minus = /^(\d+(?:\.\d+)?)\s+(?:minus|घटा)\s+(\d+(?:\.\d+)?)$/iu.exec(text);
  if (minus) return `${minus[1]}-${minus[2]}`;
  const times = /^(\d+(?:\.\d+)?)\s+(?:times|गुना)\s+(\d+(?:\.\d+)?)$/iu.exec(text);
  if (times) return `${times[1]}*${times[2]}`;
  return null;
}

function parseConversion(text) {
  const match = /^(?:convert\s+)?(-?\d+(?:\.\d+)?)\s*([a-z°]+)\s+(?:to|in|में)\s+([a-z°]+)$/iu.exec(text);
  if (!match) return null;
  return { value: Number(match[1]), from: match[2], to: match[3] };
}

/** Small, deterministic offline actions; returns null when an LLM/tool is needed. */
export function getOfflineQuickAnswer(message, now = new Date()) {
  const text = String(message || "").normalize("NFKC").trim();
  if (!text || text.length > 5000) return null;

  if (DATE_TERMS.some((pattern) => pattern.test(text))) {
    const { date } = indiaParts(now);
    return `भारत में आज की तारीख: ${date} (Asia/Kolkata).`;
  }
  if (TIME_TERMS.some((pattern) => pattern.test(text))) {
    const { time } = indiaParts(now);
    return `भारत में अभी समय: ${time} (Asia/Kolkata).`;
  }
  if (DATETIME_TERMS.some((pattern) => pattern.test(text))) {
    const { date, time } = indiaParts(now);
    return `भारत में आज ${date} है और अभी समय ${time} है (Asia/Kolkata).`;
  }

  const conversion = parseConversion(text);
  if (conversion) {
    try {
      const result = convertUnits(conversion.value, conversion.from, conversion.to);
      return `${cleanNumber(result.value)} ${result.from} = ${cleanNumber(result.result)} ${result.to}.`;
    } catch {
      return null;
    }
  }

  const expression = parseCalculation(text);
  if (expression) {
    try {
      const result = calculateSafely(expression);
      return `${result.expression} = ${cleanNumber(result.result)}.`;
    } catch {
      return null;
    }
  }

  return null;
}
