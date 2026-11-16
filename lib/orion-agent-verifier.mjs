export function parseVerifierOutput(value) {
  const lines = String(value ?? "").replace(/\r\n?/g, "\n").split("\n");
  const verdictLine = lines.find((line) => /^VERDICT:\s*(PASS|PARTIAL)\b/i.test(line));
  const verdict = verdictLine?.match(/^VERDICT:\s*(PASS|PARTIAL)\b/i)?.[1]?.toUpperCase();
  const answerStart = lines.findIndex((line) => /^ANSWER:\s*/i.test(line));

  if (answerStart < 0) return { verdict, answer: undefined };

  const firstAnswerLine = lines[answerStart].replace(/^ANSWER:\s*/i, "");
  const answerLines = [firstAnswerLine, ...lines.slice(answerStart + 1)];
  const findingsStart = answerLines.findIndex((line) => /^FINDINGS:\s*/i.test(line));
  const answer = answerLines.slice(0, findingsStart < 0 ? undefined : findingsStart).join("\n").trim();

  return { verdict, answer: answer || undefined };
}

export function buildVerifierEvidenceSummary(searchResults, maxChars = 1450) {
  const summary = (Array.isArray(searchResults) ? searchResults : [])
    .slice(0, 5)
    .map((source, index) => [
      `[${index + 1}] ${String(source?.title || "Web source").slice(0, 140)}`,
      `URL: ${String(source?.url || "").slice(0, 500)}`,
      `Evidence: ${String(source?.content || source?.snippet || "").replace(/\s+/g, " ").slice(0, 260)}`,
    ].join("\n"))
    .join("\n");

  return summary.slice(0, maxChars) || "No web source URLs were collected.";
}
