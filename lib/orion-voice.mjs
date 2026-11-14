const punctuation = /[\\p{P}\\p{S}]/gu;

function comparableWord(word) {
  return String(word || "")
    .normalize("NFKC")
    .toLocaleLowerCase("hi-IN")
    .replace(punctuation, "");
}

function startsWithWords(candidate, prefix) {
  return prefix.length <= candidate.length &&
    prefix.every((word, index) => comparableWord(candidate[index]) === comparableWord(word));
}

/**
 * Merge speech-recognition segments without repeating cumulative hypotheses.
 * Android speech services sometimes emit "phrase", then "phrase + next words"
 * as separate final segments. The longer cumulative hypothesis replaces the
 * shorter prefix instead of being appended to it.
 */
export function mergeRecognizedSegments(segments) {
  let merged = [];

  for (const segment of Array.isArray(segments) ? segments : []) {
    const next = String(segment || "").trim().split(/\\s+/).filter(Boolean);
    if (!next.length) continue;

    if (!merged.length) {
      merged = next;
      continue;
    }

    if (startsWithWords(next, merged)) {
      merged = next;
      continue;
    }

    if (startsWithWords(merged, next)) {
      continue;
    }

    let overlap = Math.min(merged.length, next.length);
    while (overlap > 0) {
      const left = merged.slice(-overlap);
      const right = next.slice(0, overlap);
      if (left.every((word, index) => comparableWord(word) === comparableWord(right[index]))) break;
      overlap -= 1;
    }

    merged = merged.concat(next.slice(overlap));
  }

  return merged.join(" ");
}
