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
    "Natural aur clear conversation karo. User ke context ko samjho.",

  study:
    "Topic ko step-by-step aur simple language mein samjhao.",

  work:
    "Task ko logically break karke practical result do.",

  content:
    "Original, polished aur well-structured content banao.",

  agent:
    "Task ko understand, plan, execute aur verify karke result do.",
};

const HOME_ACTIONS = [
  {
    id: "business",
    icon: "💡",
    title: "Business Idea",
    description:
      "Budget aur skills ke hisaab se practical idea explore karo.",
    prompt:
      "Mere liye ek practical business idea suggest karo jo low budget mein start ho sake.",
  },
  {
    id: "commit",
    icon: "◈",
    title: "Commit",
    description:
      "Apne goal ko clear plan aur daily action mein badlo.",
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

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [taskMode, setTaskMode] = useState("chat");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const hasMessages = messages.length > 0;

  const visibleSuggestions = SUGGESTIONS.slice(
    0,
    4
  );

  const visibleHomeActions = HOME_ACTIONS;

    const scrollToBottom = useCallback(
    (force = false) => {
      const container =
        messagesRef.current;

      if (!container) {
        return;
      }

      if (
        !force &&
        !shouldFollowRef.current
      ) {
        return;
      }

      requestAnimationFrame(() => {
        container.scrollTop =
          container.scrollHeight;
      });
    },
    []
  );

  const handleMessagesScroll = useCallback(() => {
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

  const addMessage = useCallback((role, content) => {
    setMessages((current) => [
      ...current,
      {
        id:
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,
        role,
        content,
      },
    ]);
  }, []);

  const updateLastAssistantMessage = useCallback(
    (content) => {
      setMessages((current) => {
        if (!current.length) {
          return current;
        }

        const updated = [...current];
        const lastIndex = updated.length - 1;

        if (
          updated[lastIndex].role !==
          "assistant"
        ) {
          return updated;
        }

        updated[lastIndex] = {
          ...updated[lastIndex],
          content,
        };

        return updated;
      });
    },
    []
  );

  const createAssistantMessage = useCallback(() => {
    setMessages((current) => [
      ...current,
      {
        id:
          `${Date.now()}-assistant-${Math.random()
            .toString(36)
            .slice(2)}`,
        role: "assistant",
        content: "",
      },
    ]);
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    setLoading(false);
  }, []);

  const resetChat = useCallback(() => {
    stopGeneration();

    setMessages([]);
    setInput("");
    setError("");
    setSearchOpen(false);
    setSearchQuery("");

    shouldFollowRef.current = true;

    requestAnimationFrame(() => {
      composerRef.current?.focus();
    });
  }, [stopGeneration]);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore cleanup errors.
        }
      }
    };
  }, []);

  const buildPrompt = useCallback(
    (userText) => {
      const instruction =
        TASK_INSTRUCTIONS[taskMode] ||
        TASK_INSTRUCTIONS.chat;

      return [
        `Task mode: ${activeTask.label}`,
        `Instruction: ${instruction}`,
        "",
        userText.trim(),
      ].join("\n");
    },
    [activeTask.label, taskMode]
  );

  const sendMessage = useCallback(
    async (customText = "") => {
      const rawText =
        customText || input;

      const userText =
        rawText.trim();

      if (!userText || loading) {
        return;
      }

      stopGeneration();

      setError("");
      setInput("");
      setLoading(true);

      shouldFollowRef.current = true;

      const userMessage = {
        id:
          `${Date.now()}-user-${Math.random()
            .toString(36)
            .slice(2)}`,
        role: "user",
        content: userText,
      };

      const nextMessages = [
        ...messages,
        userMessage,
      ];

      setMessages([
        ...nextMessages,
        {
          id:
            `${Date.now()}-assistant-${Math.random()
              .toString(36)
              .slice(2)}`,
          role: "assistant",
          content: "",
        },
      ]);

      requestAnimationFrame(() => {
        scrollToBottom(true);
      });

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
            signal:
              controller.signal,
            body: JSON.stringify({
              message:
                buildPrompt(userText),

              taskMode,

              messages: nextMessages.map(
                (message) => ({
                  role:
                    message.role,
                  content:
                    getText(
                      message.content
                    ),
                })
              ),
            }),
          }
        );

        if (!response.ok) {
          let message =
            "Something went wrong.";

          try {
            const data =
              await response.json();

            message =
              data?.error ||
              data?.message ||
              message;
          } catch {
            // Keep fallback message.
          }

          throw new Error(message);
        }

        if (!response.body) {
          throw new Error(
            "AI response stream is unavailable."
          );
        }

        const reader =
          response.body.getReader();

        const decoder =
          new TextDecoder();

        let assistantText = "";
        let buffer = "";

        const processChunk = (
          chunk
        ) => {
          buffer += chunk;

          const lines =
            buffer.split("\n");

          buffer =
            lines.pop() || "";

          for (const line of lines) {
            const trimmed =
              line.trim();

            if (!trimmed) {
              continue;
            }

            if (
              trimmed.startsWith(
                "data:"
              )
            ) {
              const data =
                trimmed
                  .slice(5)
                  .trim();

              if (
                !data ||
                data === "[DONE]"
              ) {
                continue;
              }

              try {
                const parsed =
                  JSON.parse(data);

                const token =
                  getText(
                    parsed?.choices?.[0]
                      ?.delta?.content
                  ) ||
                  getText(
                    parsed?.choices?.[0]
                      ?.message?.content
                  ) ||
                  getText(
                    parsed?.content
                  ) ||
                  getText(
                    parsed?.text
                  );

                if (token) {
                  assistantText +=
                    token;

                  updateLastAssistantMessage(
                    assistantText
                  );

                  scrollToBottom(false);
                }
              } catch {
                // Ignore incomplete SSE JSON.
              }
            }
          }
        };

        while (true) {
          const {
            value,
            done,
          } =
            await reader.read();

          if (done) {
            break;
          }

          processChunk(
            decoder.decode(
              value,
              {
                stream: true,
              }
            )
          );
        }

        const remaining =
          decoder.decode();

        if (remaining) {
          processChunk(remaining);
        }

        if (!assistantText.trim()) {
          updateLastAssistantMessage(
            "Mujhe is waqt koi response nahi mila. Kripya dobara try karein."
          );
        }
      } catch (err) {
        if (
          err?.name ===
          "AbortError"
        ) {
          return;
        }

        console.error(
          "ORION chat error:",
          err
        );

        setError(
          err?.message ||
            "AI response mein problem aa gayi."
        );

        updateLastAssistantMessage(
          "Sorry, response generate karte waqt problem aa gayi. Kripya dobara try karein."
        );
      } finally {
        abortRef.current = null;
        setLoading(false);

        requestAnimationFrame(() => {
          scrollToBottom(false);
        });
      }
    },
    [
      buildPrompt,
      input,
      loading,
      messages,
      scrollToBottom,
      stopGeneration,
      taskMode,
      updateLastAssistantMessage,
    ]
  );

  const handleSuggestion = useCallback(
    (suggestion) => {
      sendMessage(suggestion);
    },
    [sendMessage]
  );

  const handleHomeAction = useCallback(
    (action) => {
      sendMessage(action.prompt);
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
        sendMessage();
      }
    },
    [sendMessage]
  );

  const handleInputChange =
    useCallback((event) => {
      setInput(event.target.value);
    }, []);

  //   const startVoice = useCallback(() => {
    if (loading) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Aapke browser mein voice input support nahi hai."
      );
      return;
    }

    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore stop errors.
      }

      setListening(false);
      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current =
      recognition;

    let finalText = "";

    recognition.onstart = () => {
      setError("");
      setListening(true);
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i += 1
      ) {
        transcript +=
          event.results[i][0]
            ?.transcript || "";
      }

      if (!transcript) {
        return;
      }

      if (
        event.results[
          event.results.length - 1
        ]?.isFinal
      ) {
        finalText = transcript.trim();
        setInput(finalText);
      } else {
        setInput(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error(
        "Speech recognition error:",
        event.error
      );

      if (
        event.error ===
        "not-allowed"
      ) {
        setError(
          "Microphone permission allow karein."
        );
      } else if (
        event.error !==
        "aborted"
      ) {
        setError(
          "Voice input mein problem aa gayi."
        );
      }

      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;

      if (finalText.trim()) {
        setInput(finalText.trim());
      }
    };

        
  const startVoice = useCallback(() => {
    if (loading) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Aapke browser mein voice input support nahi hai."
      );
      return;
    }

    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore stop errors.
      }

      setListening(false);
      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current =
      recognition;

    let finalText = "";

    recognition.onstart = () => {
      setError("");
      setListening(true);
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i += 1
      ) {
        transcript +=
          event.results[i][0]
            ?.transcript || "";
      }

      if (!transcript) {
        return;
      }

      if (
        event.results[
          event.results.length - 1
        ]?.isFinal
      ) {
        finalText =
          transcript.trim();

        setInput(finalText);
      } else {
        setInput(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error(
        "Speech recognition error:",
        event.error
      );

      if (
        event.error ===
        "not-allowed"
      ) {
        setError(
          "Microphone permission allow karein."
        );
      } else if (
        event.error !==
        "aborted"
      ) {
        setError(
          "Voice input mein problem aa gayi."
        );
      }

      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;

      if (finalText.trim()) {
        setInput(
          finalText.trim()
        );
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error(
        "Unable to start voice:",
        err
      );

      setListening(false);
      recognitionRef.current = null;

      setError(
        "Microphone start nahi ho paya."
      );
    }
  }, [listening, loading]);

  const filteredMessages =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

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

  const openSearch = useCallback(() => {
    setSearchOpen((current) => {
      const next = !current;

      if (!next) {
        setSearchQuery("");
      }

      return next;
    });
  }, []);

  const selectMode = useCallback(
    (mode) => {
      setTaskMode(mode);
    },
    []
  );

  const handleActionSubmit =
    useCallback(
      (event) => {
        event.preventDefault();
        sendMessage();
      },
      [sendMessage]
    );

  const handleSuggestionClick =
    useCallback(
      (suggestion) => {
        setInput(suggestion);

        requestAnimationFrame(() => {
          composerRef.current?.focus();
        });
      },
      []
    );

  const isSearchActive =
    searchOpen &&
    searchQuery.trim().length > 0;

  const displayMessages =
    isSearchActive
      ? filteredMessages
      : messages;

  const showHome =
    !hasMessages;

  //   return (
    <main className="orion-app">
      <div className="orion-bg-glow glow-one" />
      <div className="orion-bg-glow glow-two" />

      <header className="topbar">
        <button
          type="button"
          className="brand-button"
          onClick={resetChat}
          aria-label="ORION AI home"
        >
          <span className="brand-orbit">
            ◉
          </span>

          <span className="brand-name">
            ORION
          </span>
        </button>

        <div className="topbar-actions">
          <button
            type="button"
            className="icon-button"
            onClick={openSearch}
            aria-label="Search chat"
            title="Search"
          >
            ⌕
          </button>

          <button
            type="button"
            className="icon-button"
            onClick={resetChat}
            aria-label="New chat"
            title="New chat"
          >
            ＋
          </button>
        </div>
      </header>

      {showHome ? (
        <section className="home-screen">
          <div className="hero-logo">
            <div className="hero-orion-mark">
              ◉
            </div>
          </div>

          <div className="namaste-pill">
            <span>🙏</span>
            <span>Namaste</span>
          </div>

          <h1 className="hero-title">
            Welcome to ORION AI
          </h1>

          <p className="hero-subtitle">
            Your Intelligent Companion
          </p>

          <p className="powered-credit">
            Powered by Dharm AI
          </p>

          <div className="home-actions">
            {visibleHomeActions.map(
              (action) => (
                <button
                  key={action.id}
                  type="button"
                  className="home-action-card"
                  onClick={() =>
                    handleHomeAction(
                      action
                    )
                  }
                >
                  <span className="action-icon">
                    {action.icon}
                  </span>

                  <span className="action-content">
                    <strong>
                      {action.title}
                    </strong>

                    <small>
                      {action.description}
                    </small>
                  </span>

                  <span className="action-arrow">
                    →
                  </span>
                </button>
              )
            )}
          </div>

          <div className="mode-section">
            <div className="section-label">
              Choose your mode
            </div>

            <div className="mode-row">
              {TASK_MODES.map(
                (mode) => {
                  const active =
                    taskMode === mode.id;

                  return (
                    <button
                      key={mode.id}
                      type="button"
                      className={
                        active
                          ? "mode-button active"
                          : "mode-button"
                      }
                      onClick={() =>
                        selectMode(
                          mode.id
                        )
                      }
                    >
                      <span>
                        {mode.icon}
                      </span>

                      <span>
                        {mode.label}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div className="quick-section">
            <div className="section-label">
              Quick questions
            </div>

            <div className="quick-grid">
              {visibleSuggestions.map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="quick-question"
                    onClick={() =>
                      handleSuggestionClick(
                        suggestion
                      )
                    }
                  >
                    <span className="quick-star">
                      ✦
                    </span>

                    <span>
                      {suggestion}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="chat-screen">
          <div className="chat-heading">
            <div>
              <span className="chat-mode">
                {activeTask.icon}{" "}
                {activeTask.label}
              </span>

              <h2>
                ORION AI
              </h2>
            </div>

            {loading && (
              <button
                type="button"
                className="stop-button"
                onClick={
                  stopGeneration
                }
              >
                Stop
              </button>
            )}
          </div>

          {searchOpen && (
            <div className="search-bar">
              <span>⌕</span>

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

              {searchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchQuery("")
                  }
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          )}

          <div
            ref={messagesRef}
            className="messages-container"
            onScroll={
              handleMessagesScroll
            }
          >
            {displayMessages.length ===
            0 ? (
              <div className="empty-chat">
                <div className="empty-orion">
                  ◉
                </div>

                <h3>
                  What can I help you with?
                </h3>

                <p>
                  Ask ORION AI anything.
                </p>
              </div>
            ) : (
              displayMessages.map(
                (message) => {
                  const text =
                    getText(
                      message.content
                    );

                  const isAssistant =
                    message.role ===
                    "assistant";

                  const isEmpty =
                    !text.trim();

                  return (
                    <article
                      key={
                        message.id
                      }
                      className={
                        isAssistant
                          ? "message-row assistant-row"
                          : "message-row user-row"
                      }
                    >
                      {isAssistant && (
                        <div className="assistant-avatar">
                          ◉
                        </div>
                      )}

                      <div className="message-content">
                        {isAssistant &&
                          isEmpty &&
                          loading ? (
                          <div className="thinking-area">
                            <span>
                              Understanding
                              &amp; planning
                              ...
                            </span>

                            <div className="typing-dots">
                              <i />
                              <i />
                              <i />
                            </div>
                          </div>
                        ) : (
                          <div
                            className="message-text"
                            dangerouslySetInnerHTML={{
                              __html:
                                formatMessage(
                                  text
                                ),
                            }}
                          />
                        )}
                      </div>
                    </article>
                  );
                }
              )
            )}
          </div>
        </section>
      )}

      <div className="composer-area">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="composer-shell">
          <textarea
            ref={composerRef}
            value={input}
            onChange={
              handleInputChange
            }
            onKeyDown={handleKeyDown}
            placeholder={
              listening
                ? "Listening..."
                : "Ask ORION AI..."
            }
            rows={1}
            disabled={loading}
          />

          <button
            type="button"
            className={
              listening
                ? "composer-icon listening"
                : "composer-icon"
            }
            onClick={startVoice}
            disabled={loading}
            aria-label="Voice input"
            title="Voice input"
          >
            🎙️
          </button>

          <button
            type="button"
            className="send-button"
            onClick={() =>
              sendMessage()
            }
            disabled={
              loading ||
              !input.trim()
            }
            aria-label="Send message"
            title="Send"
          >
            →
          </button>
        </div>

        <div className="composer-credit">
          Powered by Dharm AI
        </div>
      </div>
    
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          min-height: 100%;
          background: #ffffff;
        }

        body {
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          color: #17131f;
        }

        button,
        textarea,
        input {
          font: inherit;
        }

        button {
          border: 0;
        }

        .orion-app {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 50% 12%,
              rgba(124, 58, 237, 0.08),
              transparent 32%
            ),
            #ffffff;
        }

        .orion-bg-glow {
          position: fixed;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(80px);
          opacity: 0.28;
          z-index: 0;
        }

        .glow-one {
          top: -180px;
          left: -120px;
          background: rgba(
            139,
            92,
            246,
            0.32
          );
        }

        .glow-two {
          right: -160px;
          bottom: -180px;
          background: rgba(
            59,
            130,
            246,
            0.22
          );
        }

        .topbar {
          position: relative;
          z-index: 10;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          border-bottom: 1px solid
            rgba(100, 80, 130, 0.08);
          background: rgba(
            255,
            255,
            255,
            0.82
          );
          backdrop-filter: blur(18px);
        }

        .brand-button {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0;
          background: transparent;
          cursor: pointer;
        }

        .brand-orbit {
          display: grid;
          place-items: center;
          width: 31px;
          height: 31px;
          border-radius: 50%;
          color: #7c3aed;
          font-size: 21px;
          box-shadow:
            0 0 12px
              rgba(124, 58, 237, 0.4),
            inset 0 0 8px
              rgba(59, 130, 246, 0.15);
        }

        .brand-name {
          font-size: 17px;
          font-weight: 800;
          letter-spacing: 0.14em;
          background: linear-gradient(
            90deg,
            #6d28d9,
            #2563eb
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .icon-button {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(
            124,
            58,
            237,
            0.06
          );
          color: #5b21b6;
          font-size: 22px;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            background 0.2s ease;
        }

        .icon-button:hover {
          transform: translateY(-1px);
          background: rgba(
            124,
            58,
            237,
            0.11
          );
        }

        .home-screen {
          position: relative;
          z-index: 2;
          width: min(
            760px,
            calc(100% - 32px)
          );
          margin: 0 auto;
          padding:
            52px 0
            170px;
          text-align: center;
        }

        .hero-logo {
          display: flex;
          justify-content: center;
          margin-bottom: 18px;
        }

        .hero-orion-mark {
          position: relative;
          display: grid;
          place-items: center;
          width: 78px;
          height: 78px;
          border-radius: 50%;
          color: #6d28d9;
          font-size: 47px;
          background: rgba(
            124,
            58,
            237,
            0.055
          );
          box-shadow:
            0 0 18px
              rgba(124, 58, 237, 0.28),
            0 0 45px
              rgba(59, 130, 246, 0.12),
            inset 0 0 18px
              rgba(124, 58, 237, 0.08);
        }

        .hero-orion-mark::before {
          content: "";
          position: absolute;
          inset: -7px;
          border: 1px solid
            rgba(124, 58, 237, 0.18);
          border-radius: 50%;
        }

        .namaste-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 13px;
          border-radius: 999px;
          background: rgba(
            124,
            58,
            237,
            0.07
          );
          border: 1px solid
            rgba(124, 58, 237, 0.1);
          color: #6d28d9;
          font-size: 12px;
          font-weight: 700;
        }

        .hero-title {
          margin:
            16px 0
            7px;
          font-size: clamp(
            28px,
            5vw,
            42px
          );
          line-height: 1.12;
          letter-spacing: -0.035em;
          font-weight: 800;
          background: linear-gradient(
            90deg,
            #18131f,
            #5b21b6,
            #2563eb
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .hero-subtitle {
          margin: 0;
          color: #68606f;
          font-size: 15px;
        }

        .powered-credit {
          margin:
            9px 0
            30px;
          color: #8b8491;
          font-size: 11px;
          letter-spacing: 0.04em;
        }

        .home-actions {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 27px;
        }

        .home-action-card {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 78px;
          padding: 15px;
          text-align: left;
          border-radius: 17px;
          border: 1px solid
            rgba(124, 58, 237, 0.11);
          background: rgba(
            255,
            255,
            255,
            0.86
          );
          box-shadow:
            0 8px 28px
              rgba(70, 45, 100, 0.07);
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease;}
            .home-action-card:hover {
          transform: translateY(-2px);
          border-color: rgba(
            124,
            58,
            237,
            0.22
          );
          box-shadow:
            0 12px 34px
              rgba(70, 45, 100, 0.11);
        }

        .action-icon {
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          width: 41px;
          height: 41px;
          border-radius: 13px;
          background: rgba(
            124,
            58,
            237,
            0.08
          );
          font-size: 19px;
        }

        .action-content {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .action-content strong {
          color: #29212f;
          font-size: 13px;
        }

        .action-content small {
          color: #827a89;
          font-size: 10px;
          line-height: 1.4;
        }

        .action-arrow {
          margin-left: auto;
          color: #7c3aed;
          font-size: 18px;
        }

        .section-label {
          margin-bottom: 10px;
          color: #918a99;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .mode-section {
          margin-bottom: 24px;
        }

        .mode-row {
          display: flex;
          justify-content: center;
          gap: 7px;
          flex-wrap: wrap;
        }

        .mode-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 999px;
          background: #f7f5f9;
          color: #766f7e;
          font-size: 11px;
          font-weight: 650;
          cursor: pointer;
          transition:
            background 0.2s ease,
            color 0.2s ease,
            transform 0.2s ease;
        }

        .mode-button.active {
          background: #eee7fb;
          color: #6d28d9;
          box-shadow:
            0 0 0 1px
              rgba(124, 58, 237, 0.1);
        }

        .mode-button:hover {
          transform: translateY(-1px);
        }

        .quick-section {
          margin-top: 4px;
        }

        .quick-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 9px;
        }

        .quick-question {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          padding: 11px 12px;
          text-align: left;
          border: 1px solid
            rgba(120, 100, 145, 0.09);
          border-radius: 13px;
          background: rgba(
            255,
            255,
            255,
            0.75
          );
          color: #5e5666;
          font-size: 11px;
          cursor: pointer;
          transition:
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .quick-question:hover {
          border-color: rgba(
            124,
            58,
            237,
            0.18
          );
          background: #faf8fd;
        }

        .quick-star {
          color: #7c3aed;
          font-size: 13px;
        }

        .chat-screen {
          position: relative;
          z-index: 2;
          width: min(
            900px,
            calc(100% - 28px)
          );
          height: calc(
            100vh - 150px
          );
          margin: 0 auto;
          padding-bottom: 8px;
        }.chat-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding:
            17px 3px
            10px;
        }

        .chat-mode {
          color: #806f91;
          font-size: 10px;
          font-weight: 700;
        }

        .chat-heading h2 {
          margin: 3px 0 0;
          color: #28202f;
          font-size: 19px;
          letter-spacing: -0.02em;
        }

        .stop-button {
          padding: 7px 12px;
          border-radius: 9px;
          background: #f3eefa;
          color: #6d28d9;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin:
            2px 0
            8px;
          padding: 8px 11px;
          border: 1px solid
            rgba(124, 58, 237, 0.12);
          border-radius: 12px;
          background: #fff;
        }

        .search-bar span {
          color: #806f91;
        }

        .search-bar input {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: none;
          color: #29212f;
          background: transparent;
          font-size: 12px;
        }

        .search-bar button {
          padding: 0 3px;
          color: #827a89;
          background: transparent;
          font-size: 19px;
          cursor: pointer;
        }

        .messages-container {
          height: calc(
            100% - 61px
          );
          overflow-y: auto;
          padding:
            8px 5px
            90px;
          scroll-behavior: auto;
          scrollbar-width: thin;
          scrollbar-color:
            rgba(124, 58, 237, 0.18)
            transparent;
        }

        .messages-container::-webkit-scrollbar {
          width: 5px;
        }

        .messages-container::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(
            124,
            58,
            237,
            0.18
          );
        }

        .message-row {
          display: flex;
          gap: 10px;
          width: 100%;
          margin:
            0 0
            24px;
        }

        .assistant-row {
          justify-content: flex-start;
        }

        .user-row {
          justify-content: flex-end;
        }

        .assistant-avatar {
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          width: 29px;
          height: 29px;
          margin-top: 2px;
          border-radius: 50%;
          color: #7c3aed;
          background: #f2edfa;
          box-shadow:
            0 0 12px
              rgba(124, 58, 237, 0.14);
          font-size: 16px;
        }

        .message-content {
          max-width: min(
            760px,
            86%
          );
        }

        .user-row
          .message-content {
          padding:
            10px 14px;
          border-radius:
            17px 17px 5px 17px;
          background: #f1eafb;
          color: #31253c;
        }

        .message-text {
          color: #29212f;
          font-size: 14px;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .user-row
          .message-text {
          color: #31253c;
        }

        .message-text p {
          margin:
            0 0
            9px;
        }

        .message-text p:last-child {
          margin-bottom: 0;
        }

        .message-text h2,
        .message-text h3,
        .message-text h4 {
          margin:
            14px 0
            7px;
          color: #352542;
          line-height: 1.3;
        }

        .message-text h2 {
          font-size: 20px;
        }

        .message-text h3 {
          font-size: 17px;
        }

        .message-text h4 {
          font-size: 15px;
        }

        .message-text li {
          margin:
            5px 0
            5px 18px;
          padding-left: 2px;
        }

        .message-text code {
          padding:
            2px 5px;
          border-radius: 5px;
          background: #f1edf5;
          color: #5b21b6;
          font-size: 0.9em;
        }.message-text pre {
          margin:
            11px 0;
          padding: 12px;
          overflow-x: auto;
          border-radius: 10px;
          background: #211a29;
        }

        .message-text pre code {
          padding: 0;
          background: transparent;
          color: #f5f0fa;
          font-size: 12px;
        }

        .thinking-area {
          display: flex;
          align-items: center;
          gap: 9px;
          padding-top: 3px;
          color: #80768b;
          font-size: 12px;
        }

        .typing-dots {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .typing-dots i {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #8b5cf6;
          animation: typingDot
            1.1s infinite ease-in-out;
        }

        .typing-dots i:nth-child(2) {
          animation-delay: 0.15s;
        }

        .typing-dots i:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes typingDot {
          0%,
          60%,
          100% {
            transform: translateY(0);
            opacity: 0.4;
          }

          30% {
            transform: translateY(-4px);
            opacity: 1;
          }
        }

        .empty-chat {
          min-height: 60%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .empty-orion {
          display: grid;
          place-items: center;
          width: 55px;
          height: 55px;
          margin-bottom: 13px;
          border-radius: 50%;
          color: #7c3aed;
          background: #f4effb;
          box-shadow:
            0 0 22px
              rgba(124, 58, 237, 0.16);
          font-size: 31px;
        }

        .empty-chat h3 {
          margin: 0 0 5px;
          color: #33283c;
          font-size: 17px;
        }

        .empty-chat p {
          margin: 0;
          color: #918895;
          font-size: 12px;
        }

        .composer-area {
          position: fixed;
          z-index: 20;
          left: 50%;
          bottom: 13px;
          width: min(
            760px,
            calc(100% - 28px)
          );
          transform: translateX(-50%);
        }

        .error-message {
          margin-bottom: 7px;
          padding:
            7px 11px;
          border-radius: 9px;
          background: #fff3f5;
          color: #b4234d;
          font-size: 11px;
          text-align: center;
        }

        .composer-shell {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          min-height: 54px;
          padding:
            7px 8px
            7px 10px;
          border: 1px solid
            rgba(124, 58, 237, 0.15);
          border-radius: 17px;
          background: rgba(
            255,
            255,
            255,
            0.94
          );
          box-shadow:
            0 10px 35px
              rgba(70, 45, 100, 0.12),
            0 0 22px
              rgba(124, 58, 237, 0.06);
          backdrop-filter: blur(16px);
        }

        .composer-shell textarea {
          flex: 1;
          min-width: 0;
          max-height: 120px;
          resize: none;
          padding:
            8px 3px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #29212f;
          font-size: 13px;
          line-height: 1.5;
        }

        .composer-shell textarea::placeholder {
          color: #a29aa9;
        }

        .composer-icon,
        .send-button {
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border-radius: 12px;
          cursor: pointer;
        }

        .composer-icon {
          background: #f4effa;
          color: #6d28d9;
          font-size: 17px;
        }

        .composer-icon.listening {
          background: #ede4fb;
          box-shadow:
            0 0 0 4px
              rgba(124, 58, 237, 0.08);
        }

        .composer-icon:disabled,
        .send-button:disabled {
          opacity: 0.42;
          cursor: not-allowed;
        }

        .send-button {
          background: #6d28d9;
          color: white;
          font-size: 21px;
          box-shadow:
            0 5px 15px
              rgba(109, 40, 217, 0.22);
        }

        .composer-credit {
          margin-top: 5px;
          color: #9a929f;
          font-size: 9px;
          text-align: center;
          letter-spacing: 0.03em;
        }

        @media (max-width: 620px) {
          .topbar {
            height: 62px;
            padding: 0 15px;
          }

          .home-screen {
            width: calc(
              100% - 24px
            );
            padding-top: 37px;
          }

          .hero-orion-mark {
            width: 68px;
            height: 68px;
            font-size: 40px;
          }

          .hero-title {
            font-size: 30px;
          }

          .home-actions {
            grid-template-columns:
              1fr;
          }

          .quick-grid {
            grid-template-columns:
              1fr;
          }

          .mode-row {
            gap: 5px;
          }

          .mode-button {
            padding:
              7px 10px;
            font-size: 10px;
          }

          .chat-screen {
            width: calc(
              100% - 18px
            );
            height: calc(
              100vh - 138px
            );
          }

          .messages-container {
            padding:
              5px 1px
              95px;
          }

          .message-content {
            max-width: 88%;
          }

          .message-text {
            font-size: 13px;
          }

          .composer-area {
            width: calc(
              100% - 18px
            );
            bottom: 8px;
          }

          .composer-shell {
            min-height: 51px;
            border-radius: 15px;
          }

          .composer-icon,
          .send-button {
            width: 36px;
            height: 36px;
          }
        }

        @media (max-height: 700px) {
          .home-screen {
            padding-top: 25px;
          }

          .hero-logo {
            margin-bottom: 11px;
          }

          .powered-credit {
            margin-bottom: 18px;
          }

          .home-actions {
            margin-bottom: 18px;
          }

          .mode-section {
            margin-bottom: 16px;
          }
        }
      `}</style>
    </main>
  );
}
       
      
