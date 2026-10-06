"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const SUGGESTIONS = [
  "Bhagavad Gita ka saar batao",
  "Dharma kya hai?",
  "Hanuman ji ka mantra batao",
  "Aaj ka dharmik vichar batao",
];

const TASK_MODES = [
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

const TASK_INSTRUCTIONS = {
  chat:
    "User ko naturally samjho aur clear, useful answer do.",

  study:
    "Topic ko step-by-step, simple aur educational tareeke se samjhao.",

  work:
    "Task ko practical steps mein break karo aur useful result do.",

  content:
    "Original, polished aur well-structured content create karo.",

  agent:
    "Task ko understand, plan, execute aur verify karke final result do.",
};

const HOME_ACTIONS = [
  {
    id: "business",
    icon: "💡",
    title: "Business Idea",
    description:
      "Low budget mein practical business idea explore karo.",
    prompt:
      "Mere liye ek practical low-budget business idea suggest karo aur uska step-by-step plan batao.",
  },
  {
    id: "commit",
    icon: "◈",
    title: "Commit",
    description:
      "Goal ko clear plan aur daily action mein badlo.",
    prompt:
      "Mere goal ko ek practical commitment plan mein convert karo.",
  },
];

function getText(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        return item?.text || "";
      })
      .join("");
  }

  return content?.text || "";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInline(value) {
  return escapeHtml(value)
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

function formatMessage(content) {
  const source = getText(content);

  if (!source.trim()) {
    return "";
  }

  const lines = source.split("\n");
  const output = [];

  let inCode = false;
  let codeLines = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("```")) {
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
      codeLines.push(rawLine);
      continue;
    }

    if (!line) {
      output.push("<br />");
      continue;
    }

    if (line.startsWith("### ")) {
      output.push(
        `<h4>${renderInline(
          line.slice(4)
        )}</h4>`
      );
      continue;
    }

    if (line.startsWith("## ")) {
      output.push(
        `<h3>${renderInline(
          line.slice(3)
        )}</h3>`
      );
      continue;
    }

    if (line.startsWith("# ")) {
      output.push(
        `<h2>${renderInline(
          line.slice(2)
        )}</h2>`
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      output.push(
        `<li>${renderInline(
          line.replace(/^[-*]\s+/, "")
        )}</li>`
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      output.push(
        `<li>${renderInline(
          line.replace(/^\d+\.\s+/, "")
        )}</li>`
      );
      continue;
    }

    output.push(
      `<p>${renderInline(line)}</p>`
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

function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");

  const [taskMode, setTaskMode] =
    useState("chat");

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState("");

  const messagesRef = useRef(null);
  const composerRef = useRef(null);
  const abortRef = useRef(null);
  const recognitionRef = useRef(null);

  const shouldFollowRef = useRef(true);

  const activeTask = useMemo(() => {
    return (
      TASK_MODES.find(
        (task) => task.id === taskMode
      ) || TASK_MODES[0]
    );
  }, [taskMode]);

  const hasMessages =
    messages.length > 0;

  const visibleSuggestions =
    SUGGESTIONS.slice(0, 4);

  const visibleHomeActions =
    HOME_ACTIONS;
  const scrollToBottom = useCallback((force = false) => {
    const container = messagesRef.current;

    if (!container) {
      return;
    }

    if (
      force ||
      shouldFollowRef.current
    ) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: force ? "auto" : "smooth",
      });
    }
  }, []);

  const handleMessageScroll = useCallback(() => {
    const container = messagesRef.current;

    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    shouldFollowRef.current =
      distanceFromBottom < 120;
  }, []);

  useEffect(() => {
    if (!hasMessages) {
      return;
    }

    scrollToBottom(false);
  }, [
    messages,
    hasMessages,
    scrollToBottom,
  ]);

  useEffect(() => {
    if (!composerRef.current) {
      return;
    }

    composerRef.current.style.height = "auto";

    const nextHeight =
      Math.min(
        composerRef.current.scrollHeight,
        150
      );

    composerRef.current.style.height =
      `${nextHeight}px`;
  }, [input]);

  const createId = useCallback(() => {
    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;
  }, []);

  const startNewChat = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    setLoading(false);
    setListening(false);
    setError("");
    setMessages([]);
    setInput("");
    setSearchOpen(false);
    setSearchQuery("");

    shouldFollowRef.current = true;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    setTimeout(() => {
      composerRef.current?.focus();
    }, 100);
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    setLoading(false);
  }, []);

  const buildHistory = useCallback(
    (currentMessages) => {
      return currentMessages
        .filter(
          (message) =>
            message.role === "user" ||
            message.role === "assistant"
        )
        .slice(-20)
        .map((message) => ({
          role: message.role,
          content: getText(message.content),
        }));
    },
    []
  );

  const sendMessage = useCallback(
    async (customMessage = null) => {
      const messageText =
        typeof customMessage === "string"
          ? customMessage.trim()
          : input.trim();

      if (!messageText || loading) {
        return;
      }

      if (abortRef.current) {
        abortRef.current.abort();
      }

      setError("");
      setInput("");
      setLoading(true);

      shouldFollowRef.current = true;

      const userMessage = {
        id: createId(),
        role: "user",
        content: messageText,
      };

      const assistantId = createId();

      const assistantMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
      };

      const nextMessages = [
        ...messages,
        userMessage,
      ];

      setMessages([
        ...nextMessages,
        assistantMessage,
      ]);

      setTimeout(() => {
        scrollToBottom(true);
      }, 50);

      const controller =
        new AbortController();

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
              message: messageText,
              taskMode,
              messages:
                buildHistory(nextMessages),
            }),
          }
        );

        if (!response.ok) {
          let errorMessage =
            "Something went wrong.";

          try {
            const errorData =
              await response.json();

            errorMessage =
              errorData?.error ||
              errorMessage;
          } catch {
            const errorText =
              await response.text();

            if (errorText) {
              errorMessage = errorText;
            }
          }

          throw new Error(errorMessage);
        }

        if (!response.body) {
          throw new Error(
            "AI response stream is unavailable."
          );
        }const reader =
          response.body.getReader();

        const decoder =
          new TextDecoder();

        let buffer = "";
        let fullAnswer = "";

        const updateAssistant = (
          content
        ) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    content,
                  }
                : message
            )
          );
        };

        while (true) {
          const {
            value,
            done,
          } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(
            value,
            {
              stream: true,
            }
          );

          const lines =
            buffer.split("\n");

          buffer =
            lines.pop() || "";

          for (const rawLine of lines) {
            const line =
              rawLine.trim();

            if (!line) {
              continue;
            }

            if (
              line === "data: [DONE]" ||
              line === "[DONE]"
            ) {
              continue;
            }

            if (!line.startsWith("data:")) {
              continue;
            }

            const data =
              line.slice(5).trim();

            if (!data) {
              continue;
            }

            try {
              const parsed =
                JSON.parse(data);

              const delta =
                parsed?.choices?.[0]
                  ?.delta?.content;

              if (
                typeof delta ===
                "string" &&
                delta.length > 0
              ) {
                fullAnswer += delta;

                updateAssistant(
                  fullAnswer
                );
              }
            } catch {
              continue;
            }
          }
        }

        if (!fullAnswer.trim()) {
          updateAssistant(
            "Mujhe abhi koi response nahi mila. Please dobara try karo."
          );
        }
      } catch (requestError) {
        if (
          requestError?.name ===
          "AbortError"
        ) {
          return;
        }

        const message =
          requestError?.message ||
          "AI response nahi aa saka.";

        setError(message);

        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? {
                  ...item,
                  content:
                    "Sorry, response generate nahi ho saka. Please dobara try karo.",
                }
              : item
          )
        );
      } finally {
        abortRef.current = null;
        setLoading(false);

        setTimeout(() => {
          scrollToBottom(false);
        }, 50);
      }
    },
    [
      input,
      loading,
      messages,
      taskMode,
      createId,
      buildHistory,
      scrollToBottom,
    ]
  );

  const handleSubmit = useCallback(
    async (event) => {
      event?.preventDefault();

      await sendMessage();
    },
    [sendMessage]
  );

  const handleSuggestion = useCallback(
    async (suggestion) => {
      await sendMessage(suggestion);
    },
    [sendMessage]
  );

  const handleHomeAction = useCallback(
    async (action) => {
      await sendMessage(action.prompt);
    },
    [sendMessage]
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

  const filteredMessages = useMemo(() => {
    const query =
      searchQuery.trim().toLowerCase();

    if (!query) {
      return messages;
    }

    return messages.filter(
      (message) =>
        getText(message.content)
          .toLowerCase()
          .includes(query)
    );
  }, [messages, searchQuery]);
    useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const startVoice = useCallback(() => {
    if (loading) return;

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Voice input is not supported on this browser."
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
        i++
      ) {
        transcript +=
          event.results[i][0].transcript;
      }

      setInput(transcript);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [loading, listening]);
    const speakText = useCallback((text) => {
    if (
      typeof window === "undefined" ||
      !window.speechSynthesis ||
      !text
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/[*#`]/g, "")
      .replace(/\n+/g, " ")
      .trim();

    const utterance =
      new SpeechSynthesisUtterance(cleanText);

    utterance.lang = "hi-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1;

    window.speechSynthesis.speak(
      utterance
    );
  }, []);
  const currentSearchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return messages;
    }

    const query =
      searchQuery.trim().toLowerCase();

    return messages.filter((message) =>
      getText(message.content)
        .toLowerCase()
        .includes(query)
    );
  }, [messages, searchQuery]);

  const isHome = !hasMessages;
  return (
    <main className="orion-app">
      <div className="orion-glow glow-one" />
      <div className="orion-glow glow-two" />

      <header className="topbar">
        <button
          className="brand-button"
          onClick={startNewChat}
          type="button"
        >
          <span className="brand-orbit">
            ✦
          </span>

          <span className="brand-text">
            ORION AI
          </span>
        </button>

        <div className="top-actions">
          {hasMessages && (
            <button
              className="top-button"
              onClick={() =>
                setSearchOpen(
                  (value) => !value
                )
              }
              type="button"
              aria-label="Search chat"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="6.5"
                />
                <path d="m16 16 5 5" />
              </svg>
            </button>
          )}

          {hasMessages && (
            <button
              className="new-chat-button"
              onClick={startNewChat}
              type="button"
            >
              + New chat
            </button>
          )}
        </div>
      </header>

      {searchOpen && hasMessages && (
        <div className="search-panel">
          <input
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(
                event.target.value
              )
            }
            placeholder="Search this chat..."
            autoFocus
          />
        </div>
      )}

      {!hasMessages ? (
        <section className="home-screen">
          <div className="hero">
            <div className="hero-logo">
              ✦
            </div>

            <p className="namaste">
              🙏 Namaste
            </p>

            <h1>
              Welcome to{" "}
              <span>ORION AI</span>
            </h1>

            <p className="tagline">
              Your Intelligent Companion
            </p>

            <p className="credit">
              Powered by Dharm AI
            </p>
          </div>
          <div className="home-actions">
            {visibleHomeActions.map((action) => (
              <button
                key={action.id}
                className="action-card"
                onClick={() =>
                  handleHomeAction(action)
                }
                type="button"
              >
                <span className="action-icon">
                  {action.icon}
                </span>

                <span className="action-content">
                  <strong>{action.title}</strong>
                  <small>
                    {action.description}
                  </small>
                </span>
              </button>
            ))}
          </div>

          <div className="mode-row">
            {TASK_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={
                  taskMode === mode.id
                    ? "mode-button active"
                    : "mode-button"
                }
                onClick={() =>
                  setTaskMode(mode.id)
                }
              >
                <span>{mode.icon}</span>
                {mode.label}
              </button>
            ))}
          </div>
          <div className="suggestions">
            {visibleSuggestions.map(
              (suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="suggestion-button"
                  onClick={() =>
                    handleSuggestion(
                      suggestion
                    )
                  }
                >
                  <span>✦</span>
                  {suggestion}
                </button>
              )
            )}
          </div>
          <form
            className="composer"
            onSubmit={handleSubmit}
          >
            <textarea
              ref={composerRef}
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Ask ORION AI anything..."
              rows={1}
              disabled={loading}
            />

            <button
              type="button"
              className={
                listening
                  ? "icon-button listening"
                  : "icon-button"
              }
              onClick={startVoice}
              disabled={loading}
              aria-label="Voice input"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <rect
                  x="9"
                  y="3"
                  width="6"
                  height="12"
                  rx="3"
                />
                <path d="M5 11a7 7 0 0 0 14 0" />
                <path d="M12 18v3" />
                <path d="M9 21h6" />
              </svg>
            </button>

            <button
              type="submit"
              className="send-button"
              disabled={
                !input.trim() || loading
              }
              aria-label="Send message"
            >
              ↑
            </button>
          </form>

          <p className="composer-credit">
            Powered by Dharm AI
          </p>
          </section>
        ) : (
          <section className="chat-screen">
            <div
              ref={messagesRef}
              className="messages-container"
              onScroll={handleMessageScroll}
            >
              {searchQuery.trim() &&
              currentSearchResults.length === 0 ? (
                <div className="no-results">
                  No messages found.
                </div>
              ) : (
                currentSearchResults.map(
                  (message) => (
                    <article
                      key={message.id}
                      className={
                        message.role === "user"
                          ? "message user-message"
                          : "message assistant-message"
                      }
                    >
                      {message.role ===
                        "assistant" && (
                        <div className="assistant-avatar">
                          ✦
                        </div>
                      )}

                      <div className="message-content">
                        {message.content ? (
                          <div
                            dangerouslySetInnerHTML={{
                              __html:
                                formatMessage(
                                  message.content
                                ),
                            }}
                          />
                        ) : loading &&
                          message.id ===
                            messages[
                              messages.length - 1
                            ]?.id ? (
                          <div className="thinking">
                            <span />
                            <span />
                            <span />
                          </div>
                        ) : null}
                      </div>
                    </article>
                  )
                )
              )}              {loading && (
                <button
                  type="button"
                  className="stop-button"
                  onClick={stopGeneration}
                >
                  ■ Stop generating
                </button>
              )}
            </div>

            {!loading &&
              messages.length > 0 && (
                <div className="chat-hint">
                  ORION AI · {activeTask.label}
                </div>
              )}
            <form
              className="composer chat-composer"
              onSubmit={handleSubmit}
            >
              <textarea
                ref={composerRef}
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder={`Message ORION AI · ${activeTask.label}`}
                rows={1}
                disabled={loading}
              />

              <button
                type="button"
                className={
                  listening
                    ? "icon-button listening"
                    : "icon-button"
                }
                onClick={startVoice}
                disabled={loading}
                aria-label="Voice input"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <rect
                    x="9"
                    y="3"
                    width="6"
                    height="12"
                    rx="3"
                  />
                  <path d="M5 11a7 7 0 0 0 14 0" />
                  <path d="M12 18v3" />
                  <path d="M9 21h6" />
                </svg>
              </button>

              <button
                type="submit"
                className="send-button"
                disabled={
                  !input.trim() || loading
                }
                aria-label="Send message"
              >
                ↑
              </button>
            </form>
            <p className="composer-credit">
              Powered by Dharm AI
            </p>
          </section>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="mode-description">
          {TASK_INSTRUCTIONS[taskMode]}
        </div>
      </main>
    );
}const styles = `
  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    width: 100%;
    min-height: 100%;
    font-family:
      Inter,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    background: #ffffff;
    color: #151522;
  }

  body {
    overflow-x: hidden;
  }

  button,
  textarea,
  input {
    font: inherit;
  }

  button {
    cursor: pointer;
  }

  .orion-app {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    background:
      radial-gradient(
        circle at 50% 0%,
        rgba(124, 92, 255, 0.08),
        transparent 32%
      ),
      #ffffff;
  }

  .orion-glow {
    position: fixed;
    width: 280px;
    height: 280px;
    border-radius: 50%;
    filter: blur(90px);
    pointer-events: none;
    opacity: 0.18;
  }

  .glow-one {
    top: -120px;
    left: -100px;
    background: #8b5cf6;
  }

  .glow-two {
    right: -120px;
    bottom: -100px;
    background: #38bdf8;
  }

  .topbar {
    position: relative;
    z-index: 5;
    width: 100%;
    height: 68px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 22px;
    border-bottom: 1px solid
      rgba(30, 30, 60, 0.07);
    background: rgba(255, 255, 255, 0.86);
    backdrop-filter: blur(18px);
  }

  .brand-button {
    display: flex;
    align-items: center;
    gap: 9px;
    border: 0;
    background: transparent;
    color: #171326;
    padding: 6px;
  }

  .brand-orbit {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #7c3aed;
    font-size: 22px;
    box-shadow:
      0 0 14px rgba(124, 58, 237, 0.35),
      inset 0 0 10px
        rgba(56, 189, 248, 0.18);
  }

  .brand-text {
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  .top-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .top-button,
  .new-chat-button {
    border: 1px solid
      rgba(30, 30, 60, 0.1);
    background: rgba(255, 255, 255, 0.9);
    color: #373044;
    border-radius: 12px;
    transition: 0.2s ease;
  }

  .top-button {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
  }

  .top-button svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
  }

  .top-button:hover,
  .new-chat-button:hover {
    border-color: rgba(124, 58, 237, 0.3);
    box-shadow:
      0 4px 18px
      rgba(124, 58, 237, 0.1);
  }

  .new-chat-button {
    padding: 9px 13px;
    font-size: 13px;
    font-weight: 650;
  }

  .search-panel {
    position: relative;
    z-index: 4;
    width: min(620px, calc(100% - 32px));
    margin: 12px auto 0;
  }

  .search-panel input {
    width: 100%;
    padding: 12px 15px;
    border: 1px solidrgba(30, 30, 60, 0.12);
    border-radius: 14px;
    outline: none;
    background: #ffffff;
    box-shadow:
      0 8px 30px
      rgba(40, 30, 80, 0.08);
  }

  .search-panel input:focus {
    border-color: rgba(124, 58, 237, 0.45);
  }

  .home-screen {
    position: relative;
    z-index: 1;
    width: min(900px, calc(100% - 28px));
    min-height: calc(100vh - 68px);
    margin: 0 auto;
    padding: 58px 0 30px;
  }

  .hero {
    text-align: center;
  }

  .hero-logo {
    width: 72px;
    height: 72px;
    margin: 0 auto 18px;
    display: grid;
    place-items: center;
    border-radius: 24px;
    color: #7c3aed;
    font-size: 40px;
    background:
      linear-gradient(
        145deg,
        rgba(124, 58, 237, 0.1),
        rgba(56, 189, 248, 0.08)
      );
    box-shadow:
      0 0 35px
      rgba(124, 58, 237, 0.22);
  }

  .namaste {
    margin: 0 0 9px;
    color: #6d5c86;
    font-size: 14px;
  }

  .hero h1 {
    margin: 0;
    font-size: clamp(30px, 6vw, 52px);
    line-height: 1.1;
    letter-spacing: -0.04em;
  }

  .hero h1 span {
    color: #7442d8;
  }

  .tagline {
    margin: 13px 0 4px;
    color: #625b6f;
    font-size: 16px;
  }

  .credit,
  .composer-credit {
    color: #8a8195;
    font-size: 11px;
    letter-spacing: 0.04em;
  }

  .credit {
    margin: 8px 0 0;
  }

    .home-actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    margin: 34px auto 20px;
    max-width: 680px;
  }

  .action-card {
    display: flex;
    align-items: center;
    gap: 13px;
    text-align: left;
    padding: 17px;
    border: 1px solid
      rgba(80, 60, 120, 0.1);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.85);
    box-shadow:
      0 8px 30px
      rgba(70, 50, 110, 0.07);
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
  }

  .action-card:hover {
    transform: translateY(-2px);
    box-shadow:
      0 12px 32px
      rgba(90, 60, 150, 0.12);
  }

  .action-icon {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    background: #f4efff;
    font-size: 20px;
  }

  .action-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .action-content strong {
    color: #292235;
    font-size: 14px;
  }

  .action-content small {
    color: #81788d;
    font-size: 11px;
    line-height: 1.4;
  }

  .mode-row {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
    margin: 12px auto 18px;
  }

  .mode-button {
    border: 1px solid
      rgba(70, 50, 110, 0.1);
    border-radius: 999px;
    padding: 8px 13px;
    background: #fff;
    color: #71687e;
    font-size: 12px;
    transition: 0.2s ease;
  }

  .mode-button.active {
    color: #6536c5;
    border-color:
      rgba(124, 58, 237, 0.28);
    background: #f6f1ff;
    box-shadow:
      0 4px 15px
      rgba(124, 58, 237, 0.1);
  }

  .suggestions {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
    max-width: 760px;
    margin: 0 auto 20px;
  }

  .suggestion-button {
    border: 1px solid
      rgba(70, 50, 110, 0.09);
    border-radius: 999px;
    padding: 8px 12px;
    background: #fff;
    color: #62596d;
    font-size: 11px;
  }

  .suggestion-button span {
    margin-right: 5px;
    color: #7c3aed;
  }

  .suggestion-button:hover {
    border-color:
      rgba(124, 58, 237, 0.28);
    color: #6034bd;
  }
  .composer {
    width: min(760px, 100%);
    margin: 8px auto 0;
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 9px;
    border: 1px solid
      rgba(70, 50, 110, 0.12);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow:
      0 10px 35px
      rgba(60, 40, 100, 0.09);
  }

  .composer textarea {
    flex: 1;
    min-width: 0;
    max-height: 150px;
    resize: none;
    overflow-y: auto;
    border: 0;
    outline: 0;
    padding: 9px 6px;
    background: transparent;
    color: #24202d;
    line-height: 1.45;
  }

  .composer textarea::placeholder {
    color: #9b94a3;
  }

  .icon-button,
  .send-button {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border: 0;
    transition: 0.2s ease;
  }

  .icon-button {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: #f5f1fb;
    color: #6d3dc8;
  }

  .icon-button svg {
    width: 19px;
    height: 19px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
  }

  .icon-button.listening {
    background: #eee3ff;
    box-shadow:
      0 0 0 4px
      rgba(124, 58, 237, 0.08);
  }

  .send-button {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: #7040d2;
    color: #fff;
    font-size: 21px;
    line-height: 1;
  }

  .send-button:disabled,
  .icon-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .send-button:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow:
      0 5px 18px
      rgba(112, 64, 210, 0.25);
  }

  .composer-credit {
    margin: 9px 0 0;
    text-align: center;
  }  .chat-screen {
    position: relative;
    z-index: 1;
    width: min(850px, calc(100% - 24px));
    height: calc(100vh - 68px);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    padding: 18px 0 12px;
  }

  .messages-container {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 8px 20px;
    scroll-behavior: smooth;
  }

  .message {
    display: flex;
    gap: 10px;
    margin: 0 auto 22px;
    max-width: 820px;
    animation: messageIn 0.2s ease;
  }

  .user-message {
    justify-content: flex-end;
  }

  .assistant-message {
    justify-content: flex-start;
  }

  .message-content {
    max-width: min(720px, 88%);
    color: #292531;
    font-size: 15px;
    line-height: 1.7;
  }

  .user-message .message-content {
    padding: 10px 15px;
    border-radius: 18px 18px 5px 18px;
    background: #f1ebff;
    color: #34294a;
  }

  .assistant-avatar {
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #7442d8;
    background: #f4efff;
    box-shadow:
      0 0 14px
      rgba(124, 58, 237, 0.15);
  }

  .message-content p {
    margin: 0 0 9px;
  }

  .message-content p:last-child {
    margin-bottom: 0;
  }

  .message-content h2,
  .message-content h3,
  .message-content h4 {
    margin: 14px 0 7px;
    color: #241d31;
  }

  .message-content code {
    padding: 2px 5px;
    border-radius: 5px;
    background: #f3f0f6;
    font-size: 0.9em;
  }

  .message-content pre {
    overflow-x: auto;
    margin: 12px 0;
    padding: 13px;
    border-radius: 12px;
    background: #f5f3f7;
  }

  .message-content pre code {
    padding: 0;
    background: transparent;
  }  .thinking {
    display: flex;
    align-items: center;
    gap: 5px;
    min-height: 24px;
  }

  .thinking span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #8a68c9;
    animation: thinkingDot 1.2s infinite ease-in-out;
  }

  .thinking span:nth-child(2) {
    animation-delay: 0.15s;
  }

  .thinking span:nth-child(3) {
    animation-delay: 0.3s;
  }

  .stop-button {
    display: block;
    margin: 0 auto 8px;
    padding: 7px 12px;
    border: 1px solid rgba(120, 80, 180, 0.16);
    border-radius: 999px;
    background: #fff;
    color: #7040c8;
    font-size: 11px;
  }

  .chat-hint {
    margin: 3px 0 8px;
    text-align: center;
    color: #aaa2b0;
    font-size: 10px;
  }

  .no-results {
    padding: 40px 10px;
    text-align: center;
    color: #99919f;
    font-size: 13px;
  }

  .error-message {
    width: min(760px, calc(100% - 24px));
    margin: 8px auto;
    padding: 9px 12px;
    border-radius: 10px;
    background: #fff3f3;
    color: #b44b4b;
    font-size: 12px;
    text-align: center;
  }

  .mode-description {
    width: min(760px, calc(100% - 24px));
    margin: 5px auto 12px;
    text-align: center;
    color: #9a929f;
    font-size: 10px;
  }

  @keyframes thinkingDot {
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

  @keyframes messageIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @media (max-width: 700px) {
    .topbar {
      height: 62px;
      padding: 0 13px;
    }

    .brand-text {
      font-size: 14px;
    }

    .new-chat-button {
      padding: 8px 10px;
      font-size: 11px;
    }

    .home-screen {
      width: min(100% - 20px, 600px);
      min-height: calc(100vh - 62px);
      padding: 42px 0 22px;
    }

    .hero-logo {
      width: 62px;
      height: 62px;
      font-size: 34px;
    }

    .hero h1 {
      font-size: 32px;
    }

    .home-actions {
      grid-template-columns: 1fr;
      margin-top: 27px;
    }

    .mode-row {
      gap: 6px;
    }

    .mode-button {
      padding: 7px 10px;
      font-size: 11px;
    }

    .suggestions {
      justify-content: flex-start;
    }

    .suggestion-button {
      font-size: 10px;
    }

    .chat-screen {
      width: calc(100% - 12px);
      height: calc(100vh - 62px);
      padding-top: 10px;
    }

    .messages-container {
      padding: 6px 4px 16px;
    }

    .message-content {
      max-width: 88%;
      font-size: 14px;
    }

    .composer {
      border-radius: 17px;
    }

    .composer textarea {
      font-size: 14px;
    }

    .mode-description {
      margin-bottom: 8px;
    }
  }
   @media (max-width: 430px) {
    .hero h1 {
      font-size: 29px;
    }

    .message-content {
      max-width: 91%;
    }

    .composer {
      padding: 7px;
    }

    .icon-button,
    .send-button {
      width: 35px;
      height: 35px;
    }
  }
`;

  return (
    <>
      <style>{styles}</style>
    </>
  );
}

export default Home; 
