export const MAX_ANALYZED_TEXT_CHARS = 50_000;
export const WORDS_PER_MINUTE = 200;

export function analyzeText(input) {
  if (typeof input !== "string") throw new TypeError("Text must be a string.");
  if (input.length > MAX_ANALYZED_TEXT_CHARS) {
    throw new RangeError(`Text exceeds the ${MAX_ANALYZED_TEXT_CHARS} character limit.`);
  }

  const text = input.trim();
  const words = text ? text.split(/\s+/u).filter(Boolean) : [];
  const sentences = text
    ? (text.match(/[^.!?।]+[.!?।]+|[^.!?।]+$/gu) || []).filter((part) => part.trim())
    : [];

  return {
    characters: Array.from(input).length,
    charactersWithoutWhitespace: Array.from(input).filter((char) => !/\s/u.test(char)).length,
    words: words.length,
    sentences: sentences.length,
    lines: input.length ? input.split(/\r\n|\r|\n/u).length : 0,
    readingTimeMinutes: words.length ? Math.max(1, Math.ceil(words.length / WORDS_PER_MINUTE)) : 0,
    readingSpeedWordsPerMinute: WORDS_PER_MINUTE,
  };
}
