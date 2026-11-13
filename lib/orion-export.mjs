export function formatChatTranscript(messages) {
  if (!Array.isArray(messages)) return "";

  return messages
    .filter((message) =>
      message &&
      (message.role === "user" || message.role === "assistant")
    )
    .map((message) => {
      const speaker = message.role === "user" ? "You" : "ORION AI";
      const content = typeof message.content === "string"
        ? message.content
        : Array.isArray(message.content)
          ? message.content.map((item) => typeof item === "string" ? item : item?.text || "").join("")
          : message.content?.text || "";
      return `${speaker}:\n${content}`;
    })
    .join("\n\n")
    .trim();
}
