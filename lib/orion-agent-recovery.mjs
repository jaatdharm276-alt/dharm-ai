function cleanText(value, limit = 700) {
  return String(value ?? "").replace(/\\s+/g, " ").trim().slice(0, limit);
}

function summarizeResult(name, result) {
  if (result == null) return "";
  if (typeof result === "string" || typeof result === "number" || typeof result === "boolean") {
    return cleanText(result);
  }

  if (name === "search_web") {
    const sources = Array.isArray(result.results) ? result.results : [];
    const lines = sources.slice(0, 5).map((source) => {
      const title = cleanText(source?.title || source?.name || "Web source", 180);
      const url = cleanText(source?.url, 500);
      const snippet = cleanText(source?.content || source?.snippet || source?.description, 320);
      return "- " + title + (url.startsWith("https://") || url.startsWith("http://") ? ": " + url : "") + (snippet ? "\\n  " + snippet : "");
    });
    if (lines.length) return "Search returned " + sources.length + " source(s):\\n" + lines.join("\\n");
    return cleanText(result.message || result.error || "Search returned no usable sources.");
  }

  const preferred = ["result", "value", "answer", "summary", "message", "current", "timezone", "error"];
  const parts = preferred.filter((key) => result[key] !== undefined && result[key] !== null)
    .map((key) => key + ": " + cleanText(result[key], 300));
  if (parts.length) return parts.join("; ");
  return "The tool completed, but its structured result is not suitable for a user-facing summary.";
}

export function buildPartialRecoveryAnswer({ draft = "", toolResults = [], failureStage = "agent" } = {}) {
  const preservedDraft = typeof draft === "string" ? draft.trim().slice(0, 6500) : "";
  const partials = Array.isArray(toolResults)
    ? toolResults.filter((item) => item && typeof item.name === "string" && item.result !== undefined).slice(-8)
    : [];
  const note = "आंशिक परिणाम: ORION सभी Agent चरण पूरे नहीं कर पाया; नीचे दी गई जानकारी को पूर्ण सत्यापित उत्तर न मानें।";
  if (preservedDraft) return preservedDraft + "\\n\\n" + note;
  if (partials.length) {
    const lines = partials.map(({ name, result }) => {
      const summary = summarizeResult(name, result);
      return summary ? "- " + name + ":\\n  " + summary : "";
    }).filter(Boolean);
    if (!lines.length) {
      return "ORION " + failureStage + " चरण पूरा नहीं कर पाया। कोई उपयोगी परिणाम उपलब्ध नहीं है; कृपया बाद में दोबारा प्रयास करें।";
    }
    return "ORION " + failureStage + " चरण पूरा नहीं कर पाया। अब तक मिले परिणाम:\\n\\n" + lines.join("\\n\\n") + "\\n\\n" + note + " कृपया शेष काम पूरा करने के लिए दोबारा प्रयास करें।";
  }
  return "ORION इस अनुरोध को पूरा नहीं कर पाया क्योंकि Agent का एक चरण विफल हुआ। कोई पूरा परिणाम उपलब्ध नहीं है; कृपया दोबारा प्रयास करें।";
}
