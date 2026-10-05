"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const suggestions = [
  "Bhagavad Gita ka saar batao",
  "Dharma kya hai?",
  "Hanuman ji ka mantra batao",
  "Aaj ka dharmik vichar batao",
];

const taskModes = [
  {
    id: "chat",
    label: "Chat",
    icon: "✦",
  },
  {
    id: "study",
    label: "Study",
    icon: "📚",
  },
  {
    id: "work",
    label: "Work",
    icon: "⚡",
  },
  {
    id: "business",
    label: "Business",
    icon: "◈",
  },
  {
    id: "content",
    label: "Content",
    icon: "✎",
  },
  {
    id: "agent",
    label: "Agent",
    icon: "◉",
  },
];

const taskInstructions = {
  chat: "Meri baat samjho aur natural tarike se jawab do.",
  study: "Is topic ko simple aur clearly samjhao.",
  work: "Is kaam ko step-by-step solve karo.",
  business: "Is problem ka practical business solution do.",
  content: "Is topic par high-quality content tayyar karo.",
  agent: "Task ko logically plan karke best possible result do.",
};

const quickQuestions = [
  "Bhagavad Gita ka saar batao",
  "Dharma kya hai?",
  "Hanuman ji ka mantra batao",
  "Aaj ka dharmik vichar batao",
];
function extractText(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        return item?.text || "";
      })
      .join("");
  }

  return content?.text || "";
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInline(text) {
  return escapeHtml(text)
    .replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    )
    .replace(
      /\*(.*?)\*/g,
      "<em>$1</em>"
    )
    .replace(
      /`([^`]+)`/g,
      "<code>$1</code>"
    );
}function formatText(text) {
  const source = extractText(text);
  if (!source.trim()) return "";

  const lines = source.split("\n");
  const output = [];
  let inCode = false;
  let codeLines = [];

  lines.forEach((line, index) => {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        output.push(
          `<pre><code>${escapeHtml(
            codeLines.join("\n")
          )}</code></pre>`
        );
        codeLines = [];
      }

      inCode = !inCode;
      return;
    }

    if (inCode) {
      codeLines.push(line);
      return;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      output.push("<br />");
      return;
    }

    if (trimmed.startsWith("### ")) {
      output.push(
        `<h4>${renderInline(
          trimmed.slice(4)
        )}</h4>`
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      output.push(
        `<h3>${renderInline(
          trimmed.slice(3)
        )}</h3>`
      );
      return;
    }

    if (trimmed.startsWith("# ")) {
      output.push(
        `<h2>${renderInline(
          trimmed.slice(2)
        )}</h2>`
      );
      return;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      output.push(
        `<li>${renderInline(
          trimmed.replace(/^[-*]\s+/, "")
        )}</li>`
      );
      return;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      output.push(
        `<li>${renderInline(
          trimmed.replace(/^\d+\.\s+/, "")
        )}</li>`
      );
      return;
    }

    output.push(
      `<p>${renderInline(trimmed)}</p>`
    );
  });

  if (inCode && codeLines.length) {
    output.push(
      `<pre><code>${escapeHtml(
        codeLines.join("\n")
      )}</code></pre>`
    );
  }

  return output.join("");
          }export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [taskMode, setTaskMode] = useState("chat");
  const [taskLabel, setTaskLabel] = useState("Chat");
  const [copiedText, setCopiedText] = useState("");

  const messagesRef = useRef(null);
  const composerRef = useRef(null);
  const abortRef = useRef(null);
  const recognitionRef = useRef(null);
  const shouldScrollRef = useRef(true);

  const activeTask =
    taskModes.find(
      (mode) => mode.id === taskMode
    ) || taskModes[0];

  const hasMessages = messages.length > 0;  const updateLastAssistant = useCallback(
    (content) => {
      setMessages((prev) => {
        if (!prev.length) return prev;

        const next = [...prev];
        const last = next.length - 1;

        next[last] = {
          ...next[last],
          content,
        };

        return next;
      });
    },
    []
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  const newChat = useCallback(() => {
    stopGeneration();
    setMessages([]);
    setInput("");
    setError("");
    setCopiedText("");
    setTaskMode("chat");
    setTaskLabel("Chat");
    composerRef.current?.focus();
  }, [stopGeneration]);

  const handleChatScroll = useCallback(() => {
    const box = messagesRef.current;
    if (!box) return;

    const distance =
      box.scrollHeight -
      box.scrollTop -
      box.clientHeight;

    shouldScrollRef.current = distance < 120;
  }, []);  useEffect(() => {
    setTaskLabel(activeTask.label);
  }, [activeTask.label]);

  useEffect(() => {
    const box = messagesRef.current;

    if (!box || !shouldScrollRef.current) {
      return;
    }

    box.scrollTo({
      top: box.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      recognitionRef.current?.stop();

      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const focusComposer = useCallback(() => {
    requestAnimationFrame(() => {
      composerRef.current?.focus();
    });
  }, []);

  const handleSubmit = useCallback(
    (event) => {
      event?.preventDefault();

      const text = input.trim();

      if (!text || loading) return;

      setError("");
      setInput("");

      // Chat request will be connected in Part 7.
      return text;
    },
    [input, loading]
  );  const sendMessage = useCallback(
    async (text) => {
      const cleanText = String(text || "").trim();

      if (!cleanText || loading) return;

      const userMessage = {
        role: "user",
        content: cleanText,
      };

      const assistantMessage = {
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [
        ...prev,
        userMessage,
        assistantMessage,
      ]);

      setInput("");
      setError("");
      setLoading(true);
      shouldScrollRef.current = true;

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const history = [...messages, userMessage]
          .slice(-16)
          .map((item) => ({
            role:
              item.role === "assistant"
                ? "assistant"
                : "user",
            content: extractText(item.content),
          }));

        const response = await fetch(
          "/api/chat",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: cleanText,
              history,
              mode: taskMode,
              task: taskMode,
            }),
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Request failed (${response.status})`
          );
        }

        if (!response.body) {
          throw new Error(
            "Response stream nahi mila."
          );
        }

        const reader =
          response.body.getReader();

        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";        const addText = (text) => {
          if (!text) return;

          fullText += text;
          updateLastAssistant(fullText);
        };

        while (true) {
          const { value, done } =
            await reader.read();

          if (done) break;

          buffer += decoder.decode(value, {
            stream: true,
          });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data:")) {
              continue;
            }

            const data = line
              .slice(5)
              .trim();

            if (!data || data === "[DONE]") {
              continue;
            }

            try {
              const json = JSON.parse(data);

              const text =
                json?.choices?.[0]?.delta?.content ||
                json?.choices?.[0]?.text ||
                json?.text ||
                "";

              addText(text);
            } catch {
              // Ignore incomplete stream chunks.
            }
          }
        }

        buffer += decoder.decode();

        if (!fullText.trim()) {
          updateLastAssistant(
            "Maaf kijiye, mujhe response nahi mila."
          );
        }
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error(
            "ORION AI error:",
            err
          );

          setError(
            err?.message ||
              "Kuch galat ho gaya. Dobara try karein."
          );
        }
      } finally {
        abortRef.current = null;
        setLoading(false);
      }
    },
    [
      messages,
      loading,
      taskMode,
      updateLastAssistant,
    ]
  );  const copyMessage = useCallback(async (content) => {
    const text = extractText(content);

    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);

      setTimeout(() => {
        setCopiedText("");
      }, 1200);
    } catch {
      setError("Copy nahi ho paya.");
    }
  }, []);

  const speakMessage = useCallback((content) => {
    const text = extractText(content);

    if (
      !text ||
      typeof window === "undefined" ||
      !window.speechSynthesis
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const voice = new SpeechSynthesisUtterance(text);

    voice.lang = "hi-IN";
    voice.rate = 0.95;
    voice.pitch = 1;

    window.speechSynthesis.speak(voice);
  }, []);

  const toggleVoice = useCallback(() => {
    if (
      typeof window === "undefined" ||
      !(
        window.SpeechRecognition ||
        window.webkitSpeechRecognition
      )
    ) {
      setError(
        "Voice input aapke browser me available nahi hai."
      );
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    const recognition = new Recognition();

    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setListening(true);
      setError("");
    };

    recognition.onresult = (event) => {
      let text = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        text += event.results[i][0].transcript;
      }

      if (text.trim()) {
        setInput(text.trim());
      }
    };

    recognition.onerror = () => {
      setListening(false);
      setError("Voice input me problem aa gayi.");
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [listening]);  const handleSuggestion = useCallback(
    (question) => {
      if (!question || loading) return;

      setInput(question);
      focusComposer();
    },
    [loading, focusComposer]
  );

  const handleTaskChange = useCallback(
    (event) => {
      const value = event.target.value;

      setTaskMode(value);

      const task = taskModes.find(
        (item) => item.id === value
      );

      setTaskLabel(
        task?.label || "Chat"
      );
    },
    []
  );

  const submitMessage = useCallback(
    (event) => {
      event?.preventDefault();

      const text = input.trim();

      if (!text || loading) return;

      sendMessage(text);
    },
    [input, loading, sendMessage]
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key !== "Enter") return;

      if (event.shiftKey) return;

      event.preventDefault();
      submitMessage(event);
    },
    [submitMessage]
  );

  const quickAsk = useCallback(
    (question) => {
      if (loading) return;

      sendMessage(question);
    },
    [loading, sendMessage]
  );

  const stopSpeaking = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      window.speechSynthesis
    ) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const currentSuggestions =
    suggestions.slice(0, 4);  return (
    <main className="orionApp">
      <header className="topBar">
        <button
          className="brandButton"
          onClick={newChat}
          aria-label="New chat"
        >
          <span className="orionLogo">✦</span>

          <span className="brandText">
            <strong>ORION AI</strong>
            <small>Your Intelligent Companion</small>
          </span>
        </button>

        <button
          className="newChatButton"
          onClick={newChat}
          title="New chat"
        >
          ＋ New Chat
        </button>
      </header>

      <section className="chatArea">
        <div
          className="messages"
          ref={messagesRef}
          onScroll={handleChatScroll}
        >
          {!hasMessages ? (
            <div className="welcome">
              <div className="welcomeLogo">✦</div>

              <h1>Hello, Explorer.</h1>

              <p className="welcomeBrand">
                ORION AI · Powered by Dharm AI
              </p>

              <div className="quickQuestions">
                {quickQuestions.map((question) => (
                  <button
                    key={question}
                    onClick={() => quickAsk(question)}
                  >
                    <span>✦</span>
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messageList">
              {messages.map((message, index) => {
                const isUser =
                  message.role === "user";

                const content =
                  extractText(message.content);

                return (
                  <article
                    className={
                      isUser
                        ? "message userMessage"
                        : "message assistantMessage"
                    }
                    key={`${message.role}-${index}`}
                  >
                    <div className="messageBubble">
                      {isUser ? (
                        <div>{content}</div>
                      ) : (
                        <div
                          className="markdown"
                          dangerouslySetInnerHTML={{
                            __html: formatText(content),
                          }}
                        />
                      )}
                    </div>

                    {!isUser && content && (
                      <div className="messageActions">
                        <button
                          onClick={() =>
                            copyMessage(content)
                          }
                        >
                          {copiedText === content
                            ? "✓"
                            : "⧉"}
                        </button>

                        <button
                          onClick={() =>
                            speakMessage(content)
                          }
                        >
                          🔊
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}

              {loading      <form
        className="composerArea"
        onSubmit={submitMessage}
      >
        <div className="taskRow">
          <select
            value={taskMode}
            onChange={handleTaskChange}
            disabled={loading}
          >
            {taskModes.map((task) => (
              <option
                key={task.id}
                value={task.id}
              >
                {task.icon} {task.label}
              </option>
            ))}
          </select>

          <span className="taskLabel">
            {taskLabel}
          </span>
        </div>

        <div className="composer">
          <textarea
            ref={composerRef}
            value={input}
            onChange={(e) =>
              setInput(e.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Ask ORION AI anything..."
            rows={1}
            disabled={loading}
          />

          <div className="composerActions">
            <button
              type="button"
              className="iconButton"
              onClick={toggleVoice}
              disabled={loading}
            >
              {listening ? "■" : "🎙️"}
            </button>

            {loading ? (
              <button
                type="button"
                className="sendButton stop"
                onClick={stopGeneration}
              >
                ■
              </button>
            ) : (
              <button
                type="submit"
                className="sendButton"
                disabled={!input.trim()}
              >
                ↑
              </button>
            )}
          </div>
        </div>

        <div className="composerBottom">
          <div className="brandCredit">
            <span>✦ ORION AI</span>
            <b>Powered by Dharm AI</b>
          </div>
        </div>
      </form>      <div className="suggestionRow">
        {currentSuggestions.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => handleSuggestion(item)}
            disabled={loading}
          >
            {item}
          </button>
        ))}
      </div>
        <style jsx>{css}</style>
    </main>
  );
}

const css = `
* {
  box-sizing: border-box;
}

.orionApp {
  min-height: 100vh;
  background: #fff;
  color: #171717;
  display: flex;
  flex-direction: column;
  font-family: Inter, Arial, sans-serif;
}

.topBar {
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px;
  border-bottom: 1px solid #eee;
}

.brandButton {
  border: 0;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.orionLogo {
  font-size: 27px;
  text-shadow: 0 0 14px #aaa;
}

.brandText {
  display: flex;
  flex-direction: column;
}

.brandText strong {
  font-size: 16px;
}

.brandText small {
  color: #777;
  font-size: 11px;
}

.newChatButton {
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
}

.chatArea {
  flex: 1;
  min-height: 0;
  display: flex;
  justify-content: center;
}

.messages {
  width: min(900px, 100%);
  overflow-y: auto;
  padding: 30px 16px 170px;
}

.welcome {
  min-height: 55vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.welcomeLogo {
  font-size: 55px;
  text-shadow: 0 0 18px #aaa;
}

.welcome h1 {
  margin: 10px 0 5px;
  font-size: clamp(30px, 7vw, 48px);
}

.welcomeBrand {
  color: #777;
  font-size: 14px;
  margin-bottom: 25px;
}

.quickQuestions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.quickQuestions button,
.suggestionRow button {
  border: 1px solid #e2e2e2;
  background: #fff;
  border-radius: 12px;
  padding: 9px 12px;
  cursor: pointer;
}

.messageList {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.message {
  max-width: 82%;
}

.userMessage {
  align-self: flex-end;
}

.assistantMessage {
  align-self: flex-start;
}

.messageBubble {
  padding: 12px 15px;
  border-radius: 17px;
  line-height: 1.65;
  font-size: 15px;
}

.userMessage .messageBubble {
  background: #171717;
  color: #fff;
}

.assistantMessage .messageBubble {
  background: #f7f7f7;
}

.markdown p {
  margin: 0 0 8px;
}

.markdown h2,
.markdown h3,
.markdown h4 {
  margin: 12px 0 7px;
}

.markdown pre {
  overflow-x: auto;
  background: #111;
  color: #fff;
  padding: 12px;
  border-radius: 10px;
}

.messageActions {
  display: flex;
  gap: 5px;
  margin-top: 4px;
}

.messageActions button,
.iconButton {
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 5px;
}

.typing {
  display: flex;
  gap: 5px;
  padding: 12px;
}

.typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #888;
  animation: pulse 1s infinite;
}

.typing span:nth-child(2) {
  animation-delay: .15s;
}

.typing span:nth-child(3) {
  animation-delay: .3s;
}

@keyframes pulse {
  50% {
    opacity: .25;
    transform: translateY(-3px);
  }
}

.errorBox {
  margin: 12px auto;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
}

.composerArea {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: min(900px, calc(100% - 24px));
  padding: 8px 0 11px;
  background: rgba(255,255,255,.97);
}

.taskRow {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.taskRow select {
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  padding: 5px;
}

.taskLabel {
  color: #888;
  font-size: 12px;
}

.composer {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  border: 1px solid #ddd;
  border-radius: 16px;
  padding: 7px;
  background: #fff;
  box-shadow: 0 5px 25px rgba(0,0,0,.06);
}

.composer textarea {
  flex: 1;
  resize: none;
  border: 0;
  outline: 0;
  min-height: 38px;
  max-height: 120px;
  padding: 9px 6px;
  font: inherit;
}

.composerActions {
  display: flex;
  align-items: center;
}

.sendButton {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 11px;
  background: #171717;
  color: #fff;
  cursor: pointer;
}

.sendButton:disabled {
  opacity: .3;
}

.sendButton.stop {
  background: #444;
}

.composerBottom {
  padding-top: 5px;
}

.brandCredit {
  display: flex;
  justify-content: center;
  gap: 7px;
  color: #777;
  font-size: 10px;
}

.brandCredit b {
  color: #555;
}

.suggestionRow {
  display: none;
}

@media (max-width: 600px) {
  .topBar {
    padding: 0 12px;
  }

  .newChatButton {
    font-size: 12px;
    padding: 7px 9px;
  }

  .messages {
    padding: 25px 10px 160px;
  }

  .message {
    max-width: 92%;
  }

  .welcome {
    min-height: 50vh;
  }

  .quickQuestions button {
    font-size: 12px;
  }

  .composerArea {
    width: calc(100% - 14px);
  }

  .brandCredit {
    font-size: 9px;
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    scroll-behavior: auto !important;
  }
}
`;
