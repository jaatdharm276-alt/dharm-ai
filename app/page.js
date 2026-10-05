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
  { id: "chat", label: "Chat", icon: "✦" },
  { id: "study", label: "Study", icon: "📚" },
  { id: "work", label: "Work", icon: "⚡" },
  { id: "business", label: "Business", icon: "◈" },
  { id: "content", label: "Content", icon: "✎" },
  { id: "agent", label: "Agent", icon: "◉" },
];
const taskInstructions = {
  chat: "Meri baat samjho aur natural tarike se jawab do.",
  study: "Topic ko simple aur clearly samjhao.",
  work: "Kaam ko step-by-step solve karo.",
  business: "Practical business solution do.",
  content: "High-quality content tayyar karo.",
  agent: "Task ko logically plan karke best result do.",
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
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.text || ""
      )
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
}

function formatText(text) {
  const source = extractText(text);

  if (!source.trim()) {
    return "";
  }

  const lines = source.split("\n");
  const output = [];
  let inCode = false;
  let codeLines = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCode) {
        output.push(
          `<pre><code>${escapeHtml(
            codeLines.join("\n")
          )}</code></pre>`
        );

        codeLines = [];
      }

      inCode = !inCode;
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      output.push("<br />");
      continue;
    }

    if (trimmed.startsWith("### ")) {
      output.push(
        `<h4>${renderInline(
          trimmed.slice(4)
        )}</h4>`
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      output.push(
        `<h3>${renderInline(
          trimmed.slice(3)
        )}</h3>`
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      output.push(
        `<h2>${renderInline(
          trimmed.slice(2)
        )}</h2>`
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      output.push(
        `<li>${renderInline(
          trimmed.replace(/^[-*]\s+/, "")
        )}</li>`
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      output.push(
        `<li>${renderInline(
          trimmed.replace(/^\d+\.\s+/, "")
        )}</li>`
      );
      continue;
    }

    output.push(
      `<p>${renderInline(trimmed)}</p>`
    );
  }

  if (inCode && codeLines.length) {
    output.push(
      `<pre><code>${escapeHtml(
        codeLines.join("\n")
      )}</code></pre>`
    );
  }

  return output.join("");
        }
export default function Home() {
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
      (task) => task.id === taskMode
    ) || taskModes[0];

  const hasMessages =
    messages.length > 0;

  const currentSuggestions =
    suggestions.slice(0, 4);
    const updateLastAssistant = useCallback(
    (text) => {
      setMessages((prev) => {
        if (!prev.length) {
          return prev;
        }

        const updated = [...prev];
        const last = updated[updated.length - 1];

        if (last.role !== "assistant") {
          return prev;
        }

        updated[updated.length - 1] = {
          ...last,
          content: text,
        };

        return updated;
      });
    },
    []
  );

  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    setLoading(false);
  }, []);

  const newChat = useCallback(() => {
    stopGeneration();

    setMessages([]);
    setInput("");
    setError("");
    setCopiedText("");

    window.setTimeout(() => {
      composerRef.current?.focus();
    }, 50);
  }, [stopGeneration]);

  const handleChatScroll = useCallback(() => {
    const element = messagesRef.current;

    if (!element) {
      return;
    }

    const distanceFromBottom =
      element.scrollHeight -
      element.scrollTop -
      element.clientHeight;

    shouldScrollRef.current =
      distanceFromBottom < 120;
  }, []);

  useEffect(() => {
    const element = messagesRef.current;

    if (!element || !shouldScrollRef.current) {
      return;
    }

    element.scrollTop =
      element.scrollHeight;
  }, [messages]);

  useEffect(() => {
    composerRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
    const focusComposer = useCallback(() => {
    window.setTimeout(() => {
      composerRef.current?.focus();
    }, 50);
  }, []);

  const sendMessage = useCallback(
    async (textOverride = "") => {
      const text =
        String(textOverride || input).trim();

      if (!text || loading) {
        return;
      }

      setInput("");
      setError("");
      setCopiedText("");
      setLoading(true);

      shouldScrollRef.current = true;

      const userMessage = {
        role: "user",
        content: text,
      };

      const assistantMessage = {
        role: "assistant",
        content: "",
      };

      const previousHistory = messages
        .slice(-16)
        .map((message) => ({
          role: message.role,
          content: extractText(
            message.content
          ),
        }));

      setMessages((prev) => [
        ...prev,
        userMessage,
        assistantMessage,
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(
          "/api/chat",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify({
              message: text,
              history: previousHistory,
              mode: taskMode,
              task:
                taskInstructions[taskMode] ||
                taskInstructions.chat,
            }),
          }
        );

        if (!response.ok) {
          const message =
            await response.text();

          throw new Error(
            message ||
              `Request failed: ${response.status}`
          );
        }

        if (!response.body) {
          throw new Error(
            "Response stream available nahi hai."
          );
        }

        const reader =
          response.body.getReader();

        const decoder =
          new TextDecoder();

        let buffer = "";
        let fullText = "";
                while (true) {
          const { value, done } =
            await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(
            value,
            { stream: true }
          );

          const events =
            buffer.split("\n");

          buffer =
            events.pop() || "";

          for (const event of events) {
            const line = event.trim();

            if (!line.startsWith("data:")) {
              continue;
            }

            const data =
              line.slice(5).trim();

            if (!data || data === "[DONE]") {
              continue;
            }

            try {
              const parsed =
                JSON.parse(data);

              const chunk =
                parsed?.choices?.[0]?.delta
                  ?.content || "";

              if (!chunk) {
                continue;
              }

              fullText += chunk;

              updateLastAssistant(
                fullText
              );
            } catch {
              // Incomplete SSE data ko ignore karo.
            }
          }
        }

        if (!fullText.trim()) {
          updateLastAssistant(
            "Mujhe abhi koi response nahi mila. Dobara try karo."
          );
        }
      } catch (requestError) {
        if (
          requestError?.name ===
          "AbortError"
        ) {
          return;
        }

        console.error(
          "ORION AI request error:",
          requestError
        );

        setError(
          requestError?.message ||
            "Kuch problem aa gayi. Dobara try karo."
        );

        updateLastAssistant(
          "Sorry, response generate karte waqt problem aa gayi. Please dobara try karo."
        );
      } finally {
        abortRef.current = null;
        setLoading(false);
        focusComposer();
      }
    },
    [
      input,
      loading,
      messages,
      taskMode,
      updateLastAssistant,
      focusComposer,
    ]
  );
    const copyMessage = useCallback(
    async (text) => {
      const value = extractText(text);

      if (!value.trim()) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          value
        );

        setCopiedText(value);

        window.setTimeout(() => {
          setCopiedText("");
        }, 1500);
      } catch (copyError) {
        console.error(
          "Copy failed:",
          copyError
        );
      }
    },
    []
  );

  const speakMessage = useCallback(
    (text) => {
      const value = extractText(text);

      if (
        !value.trim() ||
        typeof window === "undefined" ||
        !("speechSynthesis" in window)
      ) {
        return;
      }

      window.speechSynthesis.cancel();

      const utterance =
        new SpeechSynthesisUtterance(
          value
        );

      utterance.lang = "hi-IN";
      utterance.rate = 0.95;
      utterance.pitch = 1;

      window.speechSynthesis.speak(
        utterance
      );
    },
    []
  );

  const toggleVoice = useCallback(() => {
    if (
      typeof window === "undefined"
    ) {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Aapke browser me voice input support nahi hai."
      );
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setListening(true);
      setError("");
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i += 1
      ) {
        transcript +=
          event.results[i][0]?.transcript ||
          "";
      }

      setInput(transcript);
    };

    recognition.onerror = (event) => {
      console.error(
        "Voice recognition error:",
        event.error
      );

      setListening(false);

      if (event.error !== "aborted") {
        setError(
          "Voice input me problem aa gayi. Dobara try karo."
        );
      }
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      focusComposer();
    };

    recognitionRef.current =
      recognition;

    recognition.start();
  }, [
    listening,
    focusComposer,
  ]);
    const handleSuggestion = useCallback(
    (question) => {
      if (loading) {
        return;
      }

      setInput(question);
      setError("");

      window.setTimeout(() => {
        composerRef.current?.focus();
      }, 50);
    },
    [loading]
  );

  const handleTaskChange = useCallback(
    (mode) => {
      const selected =
        taskModes.find(
          (task) => task.id === mode
        ) || taskModes[0];

      setTaskMode(selected.id);
      setTaskLabel(selected.label);
      setError("");

      window.setTimeout(() => {
        composerRef.current?.focus();
      }, 50);
    },
    []
  );

  const submitMessage = useCallback(
    (event) => {
      event?.preventDefault();

      if (!loading) {
        sendMessage();
      }
    },
    [loading, sendMessage]
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        if (!loading) {
          sendMessage();
        }
      }
    },
    [loading, sendMessage]
  );

  const quickAsk = useCallback(
    (question) => {
      if (loading) {
        return;
      }

      sendMessage(question);
    },
    [loading, sendMessage]
  );
    return (
    <main className="orion-app">
      <div className="orion-glow orion-glow-one" />
      <div className="orion-glow orion-glow-two" />

      <header className="topbar">
        <button
          type="button"
          className="brand"
          onClick={newChat}
          aria-label="ORION AI New Chat"
        >
          <span className="brand-orbit">
            ✦
          </span>

          <span className="brand-text">
            <strong>ORION AI</strong>
            <small>
              Your Intelligent Companion
            </small>
          </span>
        </button>

        <div className="top-actions">
          <button
            type="button"
            className="new-chat-btn"
            onClick={newChat}
          >
            <span>＋</span>
            <span>New Chat</span>
          </button>
        </div>
      </header>

      <section className="chat-shell">
        <div
          ref={messagesRef}
          className={`messages-area ${
            hasMessages
              ? "has-messages"
              : "empty-messages"
          }`}
          onScroll={handleChatScroll}
        >
          {!hasMessages && (
            <div className="welcome">
              <div className="welcome-orbit">
                <span>✦</span>
              </div>

              <p className="welcome-tag">
                NAMASTE 🙏
              </p>

              <h1>
                Welcome to{" "}
                <span>ORION AI</span>
              </h1>

              <p className="welcome-subtitle">
                Your Intelligent Companion
              </p>

              <p className="welcome-credit">
                ORION AI · Powered by Dharm AI
              </p>

              <p className="welcome-description">
                Ask anything, explore ideas,
                learn, create and solve
                problems with ORION AI.
              </p>

              <div className="quick-grid">
                {currentSuggestions.map(
                  (question) => (
                    <button
                      key={question}
                      type="button"
                      className="quick-card"
                      onClick={() =>
                        quickAsk(question)
                      }
                    >
                      <span className="quick-icon">
                        ✦
                      </span>

                      <span>
                        {question}
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {hasMessages && (
            <div className="conversation">
                          {messages.map(
                (message, index) => {
                  const isUser =
                    message.role === "user";

                  const messageText =
                    extractText(
                      message.content
                    );

                  return (
                    <article
                      key={`${message.role}-${index}`}
                      className={`message-row ${
                        isUser
                          ? "user-row"
                          : "assistant-row"
                      }`}
                    >
                      {!isUser && (
                        <div className="message-avatar">
                          ✦
                        </div>
                      )}

                      <div
                        className={`message-bubble ${
                          isUser
                            ? "user-bubble"
                            : "assistant-bubble"
                        }`}
                      >
                        <div className="message-name">
                          {isUser
                            ? "You"
                            : "ORION AI"}
                        </div>

                        {isUser ? (
                          <div className="message-content user-content">
                            {messageText}
                          </div>
                        ) : (
                          <div
                            className="message-content assistant-content"
                            dangerouslySetInnerHTML={{
                              __html:
                                formatText(
                                  messageText
                                ),
                            }}
                          />
                        )}

                        {!isUser &&
                          messageText.trim() && (
                            <div className="message-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  copyMessage(
                                    messageText
                                  )
                                }
                                aria-label="Copy response"
                              >
                                {copiedText ===
                                messageText
                                  ? "✓ Copied"
                                  : "⧉ Copy"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  speakMessage(
                                    messageText
                                  )
                                }
                                aria-label="Listen to response"
                              >
                                🔊 Listen
                              </button>
                            </div>
                          )}
                      </div>
                    </article>
                  );
                }
              )}

              {loading && (
                <div className="message-row assistant-row">
                  <div className="message-avatar">
                    ✦
                  </div>

                  <div className="message-bubble assistant-bubble typing-bubble">
                    <div className="message-name">
                      ORION AI
                    </div>

                    <div className="typing-indicator">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}              </div>
            </div>
          )}

          {hasMessages && !loading && (
            <div className="conversation-hint">
              ORION AI · Powered by Dharm AI
            </div>
          )}
        </div>

        <div className="composer-wrap">
          <div className="task-bar">
            <div className="task-selector">
              {taskModes.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className={`task-btn ${
                    taskMode === task.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    handleTaskChange(
                      task.id
                    )
                  }
                >
                  <span>{task.icon}</span>
                  <span>{task.label}</span>
                </button>
              ))}
            </div>

            <span className="active-task-label">
              {activeTask.icon} {taskLabel}
            </span>
          </div>

          <form
            className="composer"
            onSubmit={submitMessage}
          >
            <button
              type="button"
              className={`icon-btn mic-btn ${
                listening ? "listening" : ""
              }`}
              onClick={toggleVoice}
              aria-label={
                listening
                  ? "Stop voice input"
                  : "Start voice input"
              }
            >
              {listening ? "■" : "🎙️"}
            </button>

            <textarea
              ref={composerRef}
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder={
                listening
                  ? "Sun raha hoon..."
                  : "ORION AI se kuch bhi pucho..."
              }
              rows={1}
              disabled={loading}
              className="message-input"
            />

            {loading ? (
              <button
                type="button"
                className="send-btn stop-btn"
                onClick={stopGeneration}
                aria-label="Stop response"
              >
                ■
              </button>
            ) : (
              <button
                type="submit"
                className="send-btn"
                disabled={!input.trim()}
                aria-label="Send message"
              >
                ↑
              </button>
            )}
          </form>

          <div className="composer-footer">
            <span>
              ORION AI can make mistakes.
              Check important information.
            </span>

            <strong>
              Powered by Dharm AI
            </strong>
          </div>
        </div>
    </section>

<style jsx>{styles}</style>

</main>
);
              }
   const styles = `
  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    min-height: 100%;
  }

  body {
    background: #ffffff;
    color: #111827;
    font-family:
      Inter,
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
  }

  button,
  textarea {
    font: inherit;
  }

  button {
    -webkit-tap-highlight-color: transparent;
  }

  .orion-app {
    position: relative;
    min-height: 100dvh;
    overflow: hidden;
    background:
      radial-gradient(
        circle at 50% 0%,
        rgba(99, 102, 241, 0.08),
        transparent 32%
      ),
      #ffffff;
  }

  .orion-glow {
    position: fixed;
    width: 280px;
    height: 280px;
    border-radius: 50%;
    pointer-events: none;
    filter: blur(80px);
    opacity: 0.16;
    z-index: 0;
  }

  .orion-glow-one {
    top: -140px;
    left: -100px;
    background: #818cf8;
  }

  .orion-glow-two {
    right: -120px;
    bottom: -120px;
    background: #38bdf8;
  }

  .topbar {
    position: relative;
    z-index: 5;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 22px;
    border-bottom: 1px solid #eef0f4;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(16px);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 11px;
    border: 0;
    padding: 0;
    background: transparent;
    color: #111827;
    cursor: pointer;
    text-align: left;
  }

  .brand-orbit {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    color: #6366f1;
    font-size: 22px;
    background: #f5f5ff;
    border: 1px solid #e0e2ff;
    box-shadow:
      0 0 18px rgba(99, 102, 241, 0.22),
      inset 0 0 12px rgba(99, 102, 241, 0.08);
  }

  .brand-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .brand-text strong {
    font-size: 16px;
    letter-spacing: 0.08em;
    font-weight: 800;
  }

  .brand-text small {
    color: #7b8190;
    font-size: 10px;
    letter-spacing: 0.02em;
  }

  .top-actions {
    display: flex;
    align-items: center;
  }

  .new-chat-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 38px;
    padding: 0 13px;
    border: 1px solid #e4e7ec;
    border-radius: 11px;
    background: #ffffff;
    color: #374151;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
  }

  .new-chat-btn:hover {
    border-color: #c7c9ff;
    box-shadow:
      0 5px 18px rgba(99, 102, 241, 0.1);
    transform: translateY(-1px);
  }

  .chat-shell {
    position: relative;
    z-index: 2;
    width: min(100%, 1040px);
    height: calc(100dvh - 72px);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
  }

  .messages-area {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 24px 18px 12px;
    scrollbar-width: thin;
    scrollbar-color: #d8dbe4 transparent;
  }

  .messages-area::-webkit-scrollbar {
    width: 6px;
  }

  .messages-area::-webkit-scrollbar-thumb {
    background: #d8dbe4;
    border-radius: 20px;
  }

  .empty-messages {
    display: flex;
    align-items: center;
    justify-content: center;
  }    .welcome {
    width: min(100%, 700px);
    margin: auto;
    padding: 30px 12px 24px;
    text-align: center;
  }

  .welcome-orbit {
    width: 64px;
    height: 64px;
    margin: 0 auto 15px;
    display: grid;
    place-items: center;
    border-radius: 20px;
    color: #6366f1;
    font-size: 32px;
    background: #f7f7ff;
    border: 1px solid #e2e3ff;
    box-shadow:
      0 0 28px rgba(99, 102, 241, 0.2),
      0 8px 30px rgba(17, 24, 39, 0.05);
    animation:
      orbitGlow 3s ease-in-out infinite;
  }

  .welcome-tag {
    display: inline-flex;
    margin: 0 0 10px;
    padding: 5px 10px;
    border-radius: 999px;
    background: #f6f6ff;
    border: 1px solid #e4e4ff;
    color: #6366f1;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.12em;
  }

  .welcome h1 {
    margin: 0;
    color: #171a23;
    font-size: clamp(28px, 5vw, 42px);
    line-height: 1.1;
    letter-spacing: -0.035em;
  }

  .welcome h1 span {
    color: #6366f1;
    text-shadow:
      0 0 20px rgba(99, 102, 241, 0.16);
  }

  .welcome-subtitle {
    margin: 9px 0 0;
    color: #555d6d;
    font-size: 16px;
    font-weight: 500;
  }

  .welcome-credit {
    margin: 7px 0 0;
    color: #8a90a0;
    font-size: 11px;
    font-weight: 600;
  }

  .welcome-description {
    max-width: 540px;
    margin: 15px auto 24px;
    color: #737988;
    font-size: 13px;
    line-height: 1.6;
  }

  .quick-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 10px;
    width: min(100%, 650px);
    margin: 0 auto;
  }

  .quick-card {
    min-height: 58px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid #e8eaf0;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.92);
    color: #3f4654;
    text-align: left;
    cursor: pointer;
    font-size: 12px;
    line-height: 1.35;
  }

  .quick-card:hover {
    transform: translateY(-2px);
    border-color: #cfd1ff;
    box-shadow:
      0 9px 24px rgba(31, 41, 55, 0.07);
  }

  .quick-icon {
    flex: 0 0 auto;
    color: #6366f1;
    font-size: 15px;
  }

  .conversation {
    width: min(100%, 820px);
    margin: 0 auto;
    padding: 10px 0 20px;
  }

  .message-row {
    display: flex;
    gap: 10px;
    width: 100%;
    margin: 0 0 20px;
  }

  .user-row {
    justify-content: flex-end;
  }

  .assistant-row {
    justify-content: flex-start;
  }

  .message-avatar {
    flex: 0 0 auto;
    width: 32px;
    height: 32px;
    margin-top: 2px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    color: #6366f1;
    background: #f5f5ff;
    border: 1px solid #e1e2ff;
    box-shadow:
      0 0 14px rgba(99, 102, 241, 0.12);
    font-size: 15px;
  }

  .message-bubble {
    max-width: min(82%, 700px);
    border-radius: 17px;
    padding: 11px 14px;
  }

  .user-bubble {
    background: #f1f2ff;
    border: 1px solid #e2e3ff;
    border-bottom-right-radius: 5px;
  }

  .assistant-bubble {
    background: #ffffff;
    border: 1px solid #e9ebf0;
    border-bottom-left-radius: 5px;
    box-shadow:
      0 5px 20px rgba(17, 24, 39, 0.035);
  }

  .message-name {
    margin-bottom: 5px;
    color: #777e8d;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
  }

  .user-bubble .message-name {
    color: #6366f1;
  }

  .message-content {
    color: #303644;
    font-size: 14px;
    line-height: 1.7;
    overflow-wrap: anywhere;
  }

  .user-content {
    white-space: pre-wrap;
  }

  .assistant-content p {
    margin: 0 0 9px;
  }

  .assistant-content p:last-child {
    margin-bottom: 0;
  }

  .assistant-content h2,
  .assistant-content h3,
  .assistant-content h4 {
    margin: 14px 0 7px;
    color: #1c2230;
    line-height: 1.3;
  }

  .assistant-content h2 {
    font-size: 19px;
  }

  .assistant-content h3 {
    font-size: 17px;
  }

  .assistant-content h4 {
    font-size: 15px;
  }

  .assistant-content li {
    margin: 5px 0 5px 18px;
  }

  .assistant-content code {
    padding: 2px 5px;
    border-radius: 5px;
    background: #f1f2f5;
    color: #4f46e5;
    font-size: 0.9em;
  }

  .assistant-content pre {
    margin: 10px 0;
    padding: 12px;
    overflow-x: auto;
    border-radius: 10px;
    background: #f5f6f8;
    border: 1px solid #e5e7eb;
  }

  .assistant-content pre code {
    padding: 0;
    background: transparent;
    color: #303644;
  }     .message-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 9px;
    padding-top: 7px;
    border-top: 1px solid #f0f1f4;
  }

  .message-actions button {
    border: 0;
    padding: 4px 7px;
    border-radius: 7px;
    background: transparent;
    color: #858b98;
    cursor: pointer;
    font-size: 10px;
  }

  .message-actions button:hover {
    background: #f5f6f8;
    color: #6366f1;
  }

  .typing-bubble {
    min-width: 90px;
  }

  .typing-indicator {
    display: flex;
    align-items: center;
    gap: 5px;
    height: 22px;
  }

  .typing-indicator span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #6366f1;
    animation: typing 1.2s infinite ease-in-out;
  }

  .typing-indicator span:nth-child(2) {
    animation-delay: 0.15s;
  }

  .typing-indicator span:nth-child(3) {
    animation-delay: 0.3s;
  }

  .error-message {
    width: min(100%, 700px);
    margin: 4px auto 14px;
    padding: 9px 12px;
    border-radius: 10px;
    background: #fff7f7;
    border: 1px solid #f3dede;
    color: #b42318;
    font-size: 11px;
  }

  .conversation-hint {
    padding: 2px 0 8px;
    text-align: center;
    color: #a0a5b0;
    font-size: 9px;
  }

  .composer-wrap {
    position: relative;
    z-index: 5;
    padding: 7px 18px 12px;
    background:
      linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0),
        #ffffff 18%
      );
  }

  .task-bar {
    width: min(100%, 820px);
    margin: 0 auto 7px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .task-selector {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .task-selector::-webkit-scrollbar {
    display: none;
  }

  .task-btn {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 5px;
    min-height: 29px;
    padding: 0 8px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: #7b8190;
    cursor: pointer;
    font-size: 10px;
  }

  .task-btn.active {
    background: #f5f5ff;
    border-color: #e1e2ff;
    color: #6366f1;
    font-weight: 700;
  }

  .active-task-label {
    flex: 0 0 auto;
    color: #9a9fab;
    font-size: 9px;
    white-space: nowrap;
  }

  .composer {
    width: min(100%, 820px);
    min-height: 54px;
    margin: 0 auto;
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 7px;
    border: 1px solid #e2e5eb;
    border-radius: 17px;
    background: #ffffff;
    box-shadow:
      0 8px 30px rgba(17, 24, 39, 0.07);
  }

  .message-input {
    flex: 1;
    min-width: 0;
    min-height: 38px;
    max-height: 130px;
    resize: none;
    border: 0;
    outline: 0;
    padding: 9px 2px;
    background: transparent;
    color: #202532;
    font-size: 14px;
    line-height: 1.45;
  }

  .message-input::placeholder {
    color: #a3a8b3;
  }

  .icon-btn,
  .send-btn {
    flex: 0 0 auto;
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 11px;
    cursor: pointer;
  }

  .icon-btn {
    background: #f5f6f8;
    color: #656b78;
  }

  .mic-btn:hover,
  .mic-btn.listening {
    background: #f1f1ff;
    color: #6366f1;
  }

  .send-btn {
    background: #6366f1;
    color: #ffffff;
    font-size: 19px;
    font-weight: 700;
    box-shadow:
      0 5px 15px rgba(99, 102, 241, 0.22);
  }

  .send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }

  .stop-btn {
    background: #30343d;
    font-size: 13px;
  }

  .composer-footer {
    width: min(100%, 820px);
    margin: 6px auto 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: #a0a5b0;
    font-size: 9px;
  }

  .composer-footer strong {
    color: #858a98;
    font-weight: 600;
    white-space: nowrap;
  }

  @keyframes typing {
    0%,
    60%,
    100% {
      transform: translateY(0);
      opacity: 0.45;
    }

    30% {
      transform: translateY(-4px);
      opacity: 1;
    }
  }

  @keyframes orbitGlow {
    0%,
    100% {
      transform: translateY(0);
      box-shadow:
        0 0 28px rgba(99, 102, 241, 0.2),
        0 8px 30px rgba(17, 24, 39, 0.05);
    }

    50% {
      transform: translateY(-3px);
      box-shadow:
        0 0 38px rgba(99, 102, 241, 0.3),
        0 10px 34px rgba(17, 24, 39, 0.07);
    }
  }
   @media (max-width: 760px) {
    .topbar {
      height: 64px;
      padding: 0 14px;
    }

    .chat-shell {
      height: calc(100dvh - 64px);
    }

    .brand-orbit {
      width: 36px;
      height: 36px;
      border-radius: 11px;
      font-size: 19px;
    }

    .brand-text strong {
      font-size: 14px;
    }

    .brand-text small {
      font-size: 9px;
    }

    .new-chat-btn {
      min-height: 35px;
      padding: 0 10px;
      font-size: 11px;
    }

    .messages-area {
      padding: 18px 11px 8px;
    }

    .welcome {
      padding: 18px 4px 16px;
    }

    .welcome-orbit {
      width: 56px;
      height: 56px;
      font-size: 27px;
    }

    .welcome h1 {
      font-size: 30px;
    }

    .welcome-subtitle {
      font-size: 14px;
    }

    .welcome-description {
      font-size: 12px;
      margin-bottom: 18px;
    }

    .quick-grid {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .quick-card {
      min-height: 50px;
    }

    .conversation {
      padding-top: 4px;
    }

    .message-bubble {
      max-width: 88%;
    }

    .message-content {
      font-size: 13px;
    }

    .composer-wrap {
      padding:
        5px 10px
        calc(8px + env(safe-area-inset-bottom))
        ;
    }

    .task-bar {
      margin-bottom: 5px;
    }

    .task-selector {
      max-width: 100%;
    }       .active-task-label {
      display: none;
    }

    .composer {
      min-height: 50px;
      border-radius: 15px;
      padding: 6px;
    }

    .message-input {
      min-height: 36px;
      font-size: 13px;
      padding: 8px 2px;
    }

    .icon-btn,
    .send-btn {
      width: 36px;
      height: 36px;
      border-radius: 10px;
    }

    .composer-footer {
      font-size: 8px;
    }

    .composer-footer span {
      max-width: 65%;
    }

    .message-actions {
      margin-top: 7px;
    }
  }

  @media (max-width: 480px) {
    .topbar {
      padding: 0 10px;
    }

    .brand {
      gap: 8px;
    }

    .brand-orbit {
      width: 34px;
      height: 34px;
      font-size: 17px;
    }

    .brand-text strong {
      font-size: 13px;
    }

    .brand-text small {
      font-size: 8px;
    }

    .new-chat-btn {
      width: 34px;
      padding: 0;
      justify-content: center;
    }

    .new-chat-btn span:last-child {
      display: none;
    }

    .messages-area {
      padding-left: 8px;
      padding-right: 8px;
    }

    .welcome h1 {
      font-size: 27px;
    }

    .welcome-credit {
      font-size: 10px;
    }

    .welcome-description {
      max-width: 320px;
      font-size: 11px;
    }

    .quick-card {
      min-height: 47px;
      padding: 10px 11px;
      font-size: 11px;
    }

    .message-row {
      gap: 7px;
      margin-bottom: 16px;
    }

    .message-avatar {
      width: 29px;
      height: 29px;
      border-radius: 9px;
      font-size: 13px;
    }

    .message-bubble {
      max-width: calc(100% - 36px);
      padding: 9px 11px;
      border-radius: 14px;
    }

    .message-content {
      font-size: 12.5px;
      line-height: 1.6;
    }

    .composer-footer strong {
      display: none;
    }

    .composer-footer span {
      max-width: 100%;
      text-align: center;
      width: 100%;
    }       .composer-wrap {
      padding-bottom:
        calc(7px + env(safe-area-inset-bottom));
    }

    .task-btn {
      min-height: 27px;
      padding: 0 7px;
      font-size: 9px;
    }

    .task-btn span:first-child {
      font-size: 10px;
    }

    .typing-bubble {
      min-width: 78px;
    }
  }

  @media (max-height: 700px) {
    .welcome {
      padding-top: 10px;
      padding-bottom: 10px;
    }

    .welcome-orbit {
      width: 48px;
      height: 48px;
      margin-bottom: 9px;
      font-size: 23px;
    }

    .welcome-tag {
      margin-bottom: 7px;
    }

    .welcome-description {
      margin-top: 10px;
      margin-bottom: 13px;
    }

    .quick-card {
      min-height: 44px;
    }
  }
`;        
