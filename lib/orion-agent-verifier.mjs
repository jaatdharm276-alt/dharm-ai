export function parseVerifierOutput(value) {
  const raw = String(value ?? "").trim();
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const verdict = ["PASS", "PARTIAL"].includes(String(parsed.verdict || "").toUpperCase())
        ? String(parsed.verdict).toUpperCase()
        : undefined;
      const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
      return { verdict, answer: answer || undefined };
    }
  } catch {
    // Keep compatibility with the legacy line-based verifier response.
  }
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
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
  const sources = (Array.isArray(searchResults) ? searchResults : [])
    .slice(0, 5)
    .map((source) => ({
      title: String(source?.title || "Web source").slice(0, 140),
      url: String(source?.url || "").slice(0, 500),
      evidence: String(source?.content || source?.snippet || "").replace(/\s+/g, " ").slice(0, 260),
    }));
  if (!sources.length) return "No web source URLs were collected.";
  return JSON.stringify({ untrusted_source_data: sources }).slice(0, maxChars);
}
