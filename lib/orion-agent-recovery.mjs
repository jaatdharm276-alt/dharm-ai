export function buildPartialRecoveryAnswer({ draft = "", toolResults = [], failureStage = "agent" } = {}) {
  const preservedDraft = typeof draft === "string" ? draft.trim().slice(0, 6500) : "";
  const partials = Array.isArray(toolResults)
    ? toolResults.filter((item) => item && typeof item.name === "string" && item.result !== undefined).slice(-8)
    : [];
  const note = "Note: ORION could not complete every agent step, so this is a partial result.";
  if (preservedDraft) return `${preservedDraft}\n\n${note}`;
  if (partials.length) {
    const lines = partials.map(({ name, result }) => {
      let value;
      try { value = JSON.stringify(result); } catch { value = String(result); }
      return `- ${name}: ${String(value).slice(0, 700)}`;
    });
    return `ORION could not complete the ${failureStage} step. These tool results were preserved:\n${lines.join("\n")}\n\nPlease retry to complete the remaining steps.`;
  }
  return "ORION could not complete this request because an agent step failed. Please retry; no completed result was available to preserve.";
}
