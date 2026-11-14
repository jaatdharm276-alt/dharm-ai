"use client";

import OrionMemoryPanel from "./orion-memory-panel";
import { normalizeMemories } from "../lib/orion-memory.mjs";
import { extractSources } from "../lib/orion-sources.mjs";
import { escapeHtml } from "../lib/orion-html.mjs";
import { formatChatTranscript } from "../lib/orion-export.mjs";

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
    )
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
}

function formatMessage(content) {
  const source = getText(content);
  if (!source.trim()) return "";
  const lines = source.split("\n");
  const output = [];
  let inCode = false, codeLines = [], listType = null, tableRows = [];
  const closeList = () => { if (listType) output.push(listType === "ol" ? "</ol>" : "</ul>"); listType = null; };
  const closeTable = () => {
    if (!tableRows.length) return;
    const rows = tableRows.filter((row) => row.trim());
    const cells = (row) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
    if (rows.length) {
      const header = cells(rows[0]);
      const bodyRows = rows.slice(1).filter((row) => !/^\|?\s*:?-{3,}/.test(row));
      output.push('<div class="response-table-wrap"><table class="response-table"><thead><tr>' + header.map((cell) => '<th>' + renderInline(cell) + '</th>').join("") + '</tr></thead><tbody>' + bodyRows.map((row) => '<tr>' + cells(row).map((cell) => '<td>' + renderInline(cell) + '</td>').join("") + '</tr>').join("") + '</tbody></table></div>');
    }
    tableRows = [];
  };
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex];
    const line = rawLine.trim();
    if (line.startsWith(String.fromCharCode(96).repeat(3))) {
      closeList(); closeTable();
      if (inCode) { output.push('<div class="response-code-card"><div class="response-code-label">CODE</div><pre><code>' + escapeHtml(codeLines.join("\n")) + '</code></pre></div>'); codeLines = []; }
      inCode = !inCode; continue;
    }
    if (inCode) { codeLines.push(rawLine); continue; }
    if (!line) { closeList(); closeTable(); continue; }
    if (line.includes("|") && /^\|?[\s:|-]+\|?$/.test((lines[lineIndex + 1] || "").trim())) { closeList(); tableRows.push(line, lines[++lineIndex].trim()); continue; }
    if (tableRows.length && line.includes("|")) { tableRows.push(line); continue; }
    closeTable();
    if (line.startsWith("### ")) { closeList(); output.push('<h4 class="response-heading response-heading-violet">' + renderInline(line.slice(4)) + '</h4>'); continue; }
    if (line.startsWith("## ")) { closeList(); output.push('<h3 class="response-heading response-heading-blue">' + renderInline(line.slice(3)) + '</h3>'); continue; }
    if (line.startsWith("# ")) { closeList(); output.push('<h2 class="response-heading response-heading-main">' + renderInline(line.slice(2)) + '</h2>'); continue; }
    if (line.startsWith("> ")) { closeList(); output.push('<blockquote class="response-callout">' + renderInline(line.slice(2)) + '</blockquote>'); continue; }
    if (/^(---|___|\*\*\*)$/.test(line)) { closeList(); output.push('<hr class="response-divider" />'); continue; }
    const taskItem = /^[-*] \[([ xX])\] \s*(.*)$/.exec(line);
    if (taskItem) {
      if (listType !== "ul") { closeList(); output.push('<ul class="response-list response-task-list">'); listType = "ul"; }
      const checked = taskItem[1].toLowerCase() === "x";
      output.push('<li class="response-task-item"><span class="response-task-check' + (checked ? ' checked' : '') + '">' + (checked ? '✓' : '') + '</span>' + renderInline(taskItem[2]) + '</li>');
      continue;
    }
    const unordered = /^[-*]\s+/.test(line), ordered = /^\d+\.\s+/.test(line);
    if (unordered || ordered) {
      const nextType = ordered ? "ol" : "ul";
      if (listType !== nextType) { closeList(); output.push(nextType === "ol" ? '<ol class="response-list response-list-numbered">' : '<ul class="response-list">'); listType = nextType; }
      output.push('<li>' + renderInline(line.replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, "")) + '</li>'); continue;
    }
    closeList(); output.push('<p>' + renderInline(line) + '</p>');
  }
  closeList(); closeTable();
  if (inCode && codeLines.length) output.push('<div class="response-code-card"><div class="response-code-label">CODE</div><pre><code>' + escapeHtml(codeLines.join("\n")) + '</code></pre></div>');
  return output.join("");
}
function Home() {
  const [messages, setMessages] = useState([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [memories, setMemories] = useState([]);
  const [memoryReady, setMemoryReady] = useState(false);
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
    try {
      const saved = window.localStorage.getItem("orion-ai-chat-history-v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed.slice(-100).filter((item) =>
            item &&
            typeof item.id === "string" &&
            (item.role === "user" || item.role === "assistant") &&
            typeof item.content === "string"
          ));
        }
      }
    } catch (storageError) {
      console.warn("ORION history could not be restored:", storageError);
    } finally {
      setHistoryReady(true);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("orion-ai-memory-v1");
      if (saved) setMemories(normalizeMemories(JSON.parse(saved)));
    } catch (storageError) {
      console.warn("ORION memory could not be restored:", storageError);
    } finally {
      setMemoryReady(true);
    }
  }, []);

  useEffect(() => {
    if (!memoryReady) return;
    try {
      window.localStorage.setItem("orion-ai-memory-v1", JSON.stringify(normalizeMemories(memories)));
    } catch (storageError) {
      console.warn("ORION memory could not be saved:", storageError);
    }
  }, [memories, memoryReady]);

  useEffect(() => {
    if (!historyReady) return;
    try {
      window.localStorage.setItem(
        "orion-ai-chat-history-v1",
        JSON.stringify(messages.slice(-100))
      );
    } catch (storageError) {
      console.warn("ORION history could not be saved:", storageError);
    }
  }, [messages, historyReady]);

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

  const downloadChat = useCallback(() => {
    const transcript = formatChatTranscript(messages);
    if (!transcript) return;

    const blob = new Blob(["\\uFEFF", transcript], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orion-ai-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [messages]);

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
        activity: [],
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
        const endpoint =
          taskMode === "agent"
            ? "/api/agent"
            : "/api/chat";

        const response = await fetch(
          endpoint,
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
              memories: normalizeMemories(memories),
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

        const updateActivity = (activity) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, activity: [...(message.activity || []), activity].slice(-8) }
                : message
            )
          );
        };

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

              if (parsed?.orion_status) {
                updateActivity(parsed.orion_status);
              }

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
      memories,
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
  <>
    <style>{styles}</style>

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
          <OrionMemoryPanel memories={memories} onChange={setMemories} />
          {hasMessages && (
            <button
              className="top-button"
              onClick={downloadChat}
              type="button"
              aria-label="Download chat"
              title="Download chat"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v3h16v-3" />
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

      {!hasMessages ? (
        <section className="home-screen home-dashboard">
          <div className="dashboard-hero">
            <div className="hero-orbit"><span>✦</span></div>
            <p className="namaste">🙏 NAMASTE, WELCOME</p>
            <h1>Your ideas, <span>in motion.</span></h1>
            <p className="tagline">Ask anything. Build anything. ORION is ready.</p>
            <p className="credit">Powered by <strong>Dharm AI</strong> · Created by Dharmraj jat</p>
          </div>

          <form className="composer dashboard-composer" onSubmit={handleSubmit}>
            <span className="composer-spark">✧</span>
            <textarea
              ref={composerRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask ORION anything…"
              rows={1}
              disabled={loading}
            />
            <button type="button" className={listening ? "icon-button listening" : "icon-button"} onClick={startVoice} disabled={loading} aria-label="Voice input">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></svg>
            </button>
            <button type="submit" className="send-button" disabled={!input.trim() || loading} aria-label="Send message">↑</button>
          </form>
          <p className="composer-credit">Press Enter to send · Shift + Enter for a new line</p>

          <div className="dashboard-section-heading">
            <div><span className="section-kicker">EXPLORE ORION</span><h2>What would you like to do?</h2></div>
            <span className="online-pill"><i /> Ready</span>
          </div>

          <div className="feature-grid">
            <button type="button" className="feature-tile tile-search" onClick={() => { setTaskMode("chat"); composerRef.current?.focus(); }}>
              <span className="tile-icon">⌕</span><strong>Ask anything</strong><small>Answers, ideas & explanations</small><span className="tile-arrow">↗</span>
            </button>
            <button type="button" className="feature-tile tile-agent" onClick={() => { setTaskMode("agent"); handleHomeAction({prompt:"Help me plan and execute a useful task step by step."}); }}>
              <span className="tile-icon">✧</span><strong>Agent mode</strong><small>Plan, tools & task execution</small><span className="tile-arrow">↗</span>
            </button>
            <button type="button" className="feature-tile tile-memory" onClick={() => document.querySelector('[aria-label="Manage ORION memory"]')?.click()}>
              <span className="tile-icon">▱</span><strong>Smart memory</strong><small>Saved notes & useful context</small><span className="tile-arrow">↗</span>
            </button>
            <button type="button" className="feature-tile tile-study" onClick={() => { setTaskMode("study"); composerRef.current?.focus(); }}>
              <span className="tile-icon">⌘</span><strong>Study & learn</strong><small>Simple step-by-step learning</small><span className="tile-arrow">↗</span>
            </button>
            <button type="button" className="feature-tile tile-create" onClick={() => { setTaskMode("content"); composerRef.current?.focus(); }}>
              <span className="tile-icon">✎</span><strong>Create content</strong><small>Writing, ideas & drafts</small><span className="tile-arrow">↗</span>
            </button>
            <button type="button" className="feature-tile tile-work" onClick={() => { setTaskMode("work"); composerRef.current?.focus(); }}>
              <span className="tile-icon">⌁</span><strong>Get work done</strong><small>Plans, code & productivity</small><span className="tile-arrow">↗</span>
            </button>
          </div>

          <div className="dashboard-bottom">
            <div className="quick-prompts">
              <div className="dashboard-section-heading compact"><div><span className="section-kicker">GET STARTED</span><h2>Try asking</h2></div></div>
              <div className="suggestions">
                {["Explain AI in simple words","Give me a business idea","Help me write a project plan","Summarize the Bhagavad Gita"].map((suggestion) => (
                  <button key={suggestion} type="button" className="suggestion-button" onClick={() => handleSuggestion(suggestion)}><span>✦</span>{suggestion}</button>
                ))}
              </div>
            </div>
            <div className="mode-panel">
              <span className="section-kicker">RESPONSE MODE</span>
              <div className="mode-row">
                {TASK_MODES.map((mode) => (
                  <button key={mode.id} type="button" className={taskMode === mode.id ? "mode-button active" : "mode-button"} onClick={() => setTaskMode(mode.id)}>
                    <span>{mode.icon}</span>{mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="dashboard-footer"><span>✦ ORION AI</span><span>Intelligent companion · <strong>Powered by Dharm AI</strong></span></div>
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
                        {taskMode === "agent" && message.activity?.length > 0 && (
                          <div className="activity-feed" aria-live="polite">
                            {message.activity.map((item, index) => (
                              <div className="activity-item" key={`${item.timestamp}-${index}`}>
                                <span className={item.stage === "complete" ? "activity-mark complete" : "activity-mark"} />
                                <span>{item.detail}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {message.content ? (
                          <>
                          <div
                            dangerouslySetInnerHTML={{
                              __html:
                                formatMessage(
                                  message.content
                                ),
                            }}
                          />
                          {message.role === "assistant" && extractSources(message.content).length > 0 && (
                            <section className="source-results" aria-label="Search sources">
                              <div className="source-results-heading">
                                <span className="source-results-icon">↗</span>
                                <div><strong>Sources & references</strong><small>Links included in this answer</small></div>
                                <span className="source-count">{extractSources(message.content).length}</span>
                              </div>
                              <div className="source-results-grid">
                                {extractSources(message.content).map((source) => (
                                  <a className="source-result-card" href={source.url} target="_blank" rel="noopener noreferrer" key={source.url}>
                                    <span className="source-domain">{source.domain}</span>
                                    <strong>{source.title}</strong>
                                    <span className="source-open">Open source ↗</span>
                                  </a>
                                ))}
                              </div>
                            </section>
                          )}
                          </>
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
            {searchOpen && hasMessages && (
              <div id="orion-chat-search" className="search-panel search-panel-bottom">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search this chat..."
                  aria-label="Search this chat"
                  autoFocus
                />
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
            {hasMessages && (
              <div className="chat-search-actions">
                <button
                  type="button"
                  className="chat-search-button"
                  onClick={() => setSearchOpen((value) => !value)}
                  aria-expanded={searchOpen}
                  aria-controls="orion-chat-search"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="11" cy="11" r="6.5" />
                    <path d="m16 16 5 5" />
                  </svg>
                  <span>{searchOpen ? "Close search" : "Search chat"}</span>
                </button>
              </div>
            )}
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
</>
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
  .search-panel-bottom {
    flex: 0 0 auto;
    width: 100%;
    margin: 0 auto 8px;
  }
  .chat-search-actions {
    display: flex;
    justify-content: flex-end;
    width: min(760px, 100%);
    margin: 7px auto 0;
    padding: 0 3px;
  }
  .chat-search-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 38px;
    padding: 0 13px;
    border: 1px solid #cfe3f8;
    border-radius: 12px;
    background: #f1f8ff;
    color: #176db5;
    font-size: 13px;
    font-weight: 650;
    box-shadow: 0 3px 12px rgba(25, 112, 180, .08);
  }
  .chat-search-button svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .chat-search-button:focus-visible {
    outline: 3px solid rgba(31, 130, 220, .25);
    outline-offset: 2px;
  }

  .search-panel input {
    width: 100%;
    padding: 12px 15px;
    border: 1px solid rgba(30, 30, 60, 0.12);
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
  }  .activity-feed {
    display: flex;
    flex-direction: column;
    gap: 7px;
    margin: 0 0 12px;
    padding: 10px 12px;
    border: 1px solid rgba(124, 58, 237, 0.12);
    border-radius: 12px;
    background: rgba(248, 245, 255, 0.78);
    color: #746b80;
    font-size: 11px;
    line-height: 1.45;
  }

  .activity-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .activity-mark {
    width: 7px;
    height: 7px;
    flex: 0 0 7px;
    margin-top: 4px;
    border-radius: 50%;
    background: #9b7be0;
    box-shadow: 0 0 8px rgba(124, 58, 237, 0.28);
  }

  .activity-mark.complete {
    background: #26996a;
    box-shadow: 0 0 8px rgba(38, 153, 106, 0.22);
  }

  .thinking {
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

  /* ORION visual response system v1 */
  .brand-text { color:#123a78; text-shadow:0 0 18px rgba(39,145,255,.24); }
  .brand-orbit,.hero-logo { color:#087eea; background:linear-gradient(135deg,#e9f6ff,#f1edff); box-shadow:0 0 30px rgba(24,137,255,.2); }
  .hero h1 span { color:#087eea; text-shadow:0 0 22px rgba(24,137,255,.2); }
  .action-card,.composer { border-color:rgba(35,125,220,.16); box-shadow:0 10px 34px rgba(21,82,150,.08); }
  .mode-button.active { color:#075fb9; border-color:rgba(15,126,235,.34); background:linear-gradient(135deg,#eaf6ff,#f4f0ff); }
  .send-button { background:linear-gradient(135deg,#087fe8,#6552db); box-shadow:0 5px 16px rgba(20,111,220,.22); }
  .icon-button { color:#0875d1; background:#edf6ff; }
  .assistant-avatar { color:#087eea; background:linear-gradient(135deg,#e7f5ff,#f2edff); }
  .message-content { color:#25344c; }
  .message-content .response-heading { display:flex; align-items:center; gap:9px; margin:20px 0 10px; padding:9px 12px; border-radius:12px; font-size:1.02em; line-height:1.4; font-weight:800; }
  .response-heading-main { color:#0758a6; background:linear-gradient(90deg,#e8f5ff,#f5f2ff); border-left:4px solid #1388ed; }
  .response-heading-blue { color:#096bbd; background:#edf7ff; border-left:4px solid #28a0ef; }
  .response-heading-violet { color:#6840b5; background:#f5f0ff; border-left:4px solid #9470e8; }
  .response-list { margin:8px 0 13px; padding-left:23px; }
  .response-list li { margin:6px 0; padding-left:3px; }
  .response-list li::marker { color:#1685df; font-weight:800; }
  .response-list-numbered li::marker { color:#7047ca; }
  .response-callout { margin:12px 0; padding:12px 14px; border-left:4px solid #13a0c9; border-radius:8px 13px 13px 8px; background:linear-gradient(100deg,#eaf8ff,#f3f0ff); color:#245276; }
  .response-table-wrap { width:100%; overflow-x:auto; margin:13px 0; border:1px solid #d9eaff; border-radius:12px; }
  .response-table { width:100%; border-collapse:collapse; min-width:280px; font-size:.9em; }
  .response-table th { padding:10px; text-align:left; color:#075ca8; background:#eaf5ff; }
  .response-table td { padding:9px 10px; border-top:1px solid #e5edf7; }
  .response-table tr:nth-child(even) td { background:#fafcff; }
  .response-code-card { margin:13px 0; overflow:hidden; border:1px solid #d7e6f8; border-radius:13px; background:#f6f9ff; }
  .response-code-label { padding:6px 12px; color:#176ab7; background:#e9f3ff; font-size:10px; font-weight:800; letter-spacing:.12em; }
  .message-content .response-code-card pre { margin:0; border-radius:0; background:#f6f9ff; color:#25344c; }
  .message-content code { color:#6945b6; background:#f1edfb; }
  .message-content a { color:#087bc9; text-decoration:underline; text-decoration-color:rgba(8,123,201,.35); text-underline-offset:3px; overflow-wrap:anywhere; }
  .message-content a:hover { color:#6545c5; text-decoration-color:currentColor; }
  .response-divider { height:1px; margin:17px 0; border:0; background:linear-gradient(90deg,transparent,#cbdff2,transparent); }
  .response-task-list { list-style:none; padding-left:2px; }
  .response-task-item { display:flex; align-items:flex-start; gap:9px; }
  .response-task-check { width:17px; height:17px; flex:0 0 17px; display:inline-grid; place-items:center; margin-top:2px; border:1.5px solid #9bb6d1; border-radius:5px; color:white; font-size:11px; }
  .response-task-check.checked { border-color:#1ca66b; background:#1ca66b; }
  .activity-feed { border-color:#d8eaff; background:linear-gradient(100deg,#f0f8ff,#f8f5ff); color:#52677f; }
  .thinking span { background:#1688e8; }
  @media (max-width:640px) {
    .home-screen { width:min(100% - 22px,560px); padding-top:30px; }
    .home-actions { gap:9px; margin-top:24px; }
    .action-card { padding:12px 10px; gap:9px; border-radius:15px; }
    .chat-screen { height:calc(100dvh - 62px); width:calc(100% - 12px); padding-top:10px; }
    .message-content { max-width:92%; font-size:14px; }
    .message-content .response-heading { margin-top:16px; padding:8px 10px; }
  }


  /* ORION search results cards v1 */
  .source-results { margin:16px 0 4px; padding:13px; border:1px solid #d9e9f8; border-radius:16px; background:linear-gradient(145deg,#f8fcff,#fbf9ff); }
  .source-results-heading { display:flex; align-items:center; gap:9px; margin-bottom:11px; }
  .source-results-icon { width:30px; height:30px; display:grid; place-items:center; border-radius:10px; background:#e8f4ff; color:#087bc9; font-size:17px; font-weight:800; }
  .source-results-heading div { display:flex; flex:1; flex-direction:column; gap:2px; }
  .source-results-heading strong { color:#173b63; font-size:12px; }
  .source-results-heading small { color:#8293a8; font-size:10px; }
  .source-count { min-width:22px; height:22px; display:grid; place-items:center; border-radius:999px; background:#eaf4ff; color:#187ac2; font-size:10px; font-weight:800; }
  .source-results-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
  .source-result-card { min-width:0; display:flex; flex-direction:column; gap:5px; padding:10px 11px; border:1px solid #e0ebf6; border-radius:12px; background:#fff; text-decoration:none!important; transition:border-color .18s ease,transform .18s ease,box-shadow .18s ease; }
  .source-result-card:hover { border-color:#acd3f3; transform:translateY(-1px); box-shadow:0 6px 16px rgba(30,105,170,.08); }
  .source-domain { overflow:hidden; color:#1680c9; font-size:9px; font-weight:800; letter-spacing:.04em; text-overflow:ellipsis; white-space:nowrap; }
  .source-result-card strong { display:-webkit-box; overflow:hidden; color:#263d59; font-size:11px; line-height:1.4; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
  .source-open { color:#8295aa; font-size:9px; }
  @media(max-width:480px) { .source-results { padding:10px; } .source-results-grid { grid-template-columns:1fr; } .source-result-card { padding:9px 10px; } }

  /* ORION dashboard v2 - responsive glass interface */
  .orion-app { background: radial-gradient(ellipse at 50% -10%,rgba(28,145,255,.13),transparent 44%),radial-gradient(ellipse at 100% 45%,rgba(134,83,255,.08),transparent 36%),#f7fbff; }
  .home-dashboard { width:min(1000px,calc(100% - 36px)); padding:36px 0 28px; }
  .dashboard-hero { text-align:center; padding:8px 12px 20px; }
  .hero-orbit { width:76px;height:76px;margin:0 auto 15px;display:grid;place-items:center;border-radius:26px;background:linear-gradient(145deg,#e5f5ff,#eeeaff);border:1px solid rgba(35,143,242,.22);box-shadow:0 0 0 7px rgba(40,145,245,.045),0 12px 34px rgba(45,117,208,.16); }
  .hero-orbit span { font-size:43px;color:#147de0;text-shadow:0 0 22px rgba(26,145,255,.55); }
  .dashboard-hero .namaste { color:#1879c8;font-size:11px;font-weight:800;letter-spacing:.18em; }
  .dashboard-hero h1 { margin:5px 0 0;font-size:clamp(32px,6vw,54px);letter-spacing:-.055em;color:#122c52; }
  .dashboard-hero h1 span { color:#1689e8;background:linear-gradient(90deg,#0788e9,#7955e8);background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent; }
  .dashboard-hero .tagline { margin:10px 0 5px;color:#5d718b;font-size:15px; }
  .dashboard-hero .credit { color:#75869b;font-size:11px; }
  .dashboard-hero .credit strong { color:#087acb; }
  .dashboard-composer { width:min(760px,100%);margin:12px auto 0;padding:10px 11px 10px 15px;border:1px solid #cfe4f8;border-radius:22px;background:rgba(255,255,255,.94);box-shadow:0 12px 36px rgba(27,104,177,.12),0 0 0 5px rgba(42,145,229,.035); }
  .composer-spark { align-self:center;color:#278de2;font-size:22px; }
  .dashboard-composer textarea { font-size:15px; }
  .dashboard-composer .send-button { border-radius:15px; }
  .dashboard-section-heading { display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:34px 2px 14px; }
  .dashboard-section-heading h2 { margin:4px 0 0;color:#17365c;font-size:19px;letter-spacing:-.025em; }
  .section-kicker { color:#2784c9;font-size:9px;font-weight:850;letter-spacing:.17em; }
  .online-pill { display:flex;align-items:center;gap:7px;padding:7px 11px;border:1px solid #d4efdf;border-radius:999px;background:#f0fff5;color:#25814d;font-size:10px;font-weight:750; }
  .online-pill i { width:7px;height:7px;border-radius:50%;background:#24bd70;box-shadow:0 0 9px #54db92; }
  .feature-grid { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px; }
  .feature-tile { position:relative;min-height:132px;display:flex;flex-direction:column;align-items:flex-start;gap:7px;padding:16px;text-align:left;border:1px solid #deebf7;border-radius:19px;background:rgba(255,255,255,.9);box-shadow:0 7px 22px rgba(28,78,132,.055);transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease; }
  .feature-tile:hover { transform:translateY(-3px);box-shadow:0 13px 28px rgba(31,99,167,.12);border-color:#b7d9f5; }
  .tile-icon { width:37px;height:37px;display:grid;place-items:center;border-radius:12px;background:#eaf5ff;color:#1685df;font-size:23px;font-weight:800; }
  .feature-tile strong { color:#19385d;font-size:14px; }
  .feature-tile small { color:#78899d;font-size:10px;line-height:1.4; }
  .tile-arrow { position:absolute;right:14px;top:16px;color:#8aa9c7;font-size:17px; }
  .tile-agent .tile-icon { color:#7654df;background:#f1edff; }
  .tile-memory .tile-icon { color:#0d9b91;background:#e8faf7; }
  .tile-study .tile-icon { color:#b87912;background:#fff6e5; }
  .tile-create .tile-icon { color:#d25c9a;background:#fff0f7; }
  .tile-work .tile-icon { color:#27885a;background:#eaf9ef; }
  .dashboard-bottom { display:grid;grid-template-columns:1.15fr .85fr;gap:14px;margin-top:18px; }
  .quick-prompts,.mode-panel { min-width:0;padding:14px 15px;border:1px solid #e0ebf6;border-radius:18px;background:rgba(255,255,255,.76); }
  .dashboard-section-heading.compact { margin:0 0 10px; }
  .dashboard-section-heading.compact h2 { font-size:15px; }
  .quick-prompts .suggestions { justify-content:flex-start;margin:0;gap:7px; }
  .quick-prompts .suggestion-button { padding:7px 10px;border-color:#e0eafa;background:#fafdff;font-size:10px; }
  .mode-panel .mode-row { justify-content:flex-start;margin:10px 0 0;gap:6px; }
  .mode-panel .mode-button { padding:7px 10px;font-size:10px; }
  .dashboard-footer { display:flex;justify-content:space-between;gap:12px;margin:24px 3px 0;padding-top:14px;border-top:1px solid #e2edf7;color:#8a9bad;font-size:10px; }
  .dashboard-footer span:first-child { color:#147acb;font-weight:850;letter-spacing:.12em; }
  .dashboard-footer strong { color:#287bb7; }
  @media(max-width:700px) {
    .home-dashboard { width:calc(100% - 24px);padding:25px 0 22px; }
    .dashboard-hero { padding-bottom:12px; }
    .hero-orbit { width:64px;height:64px;border-radius:22px; }
    .hero-orbit span { font-size:36px; }
    .dashboard-hero h1 { font-size:34px; }
    .dashboard-hero .tagline { font-size:12px; }
    .dashboard-composer { border-radius:18px; }
    .dashboard-section-heading { margin-top:26px; }
    .dashboard-section-heading h2 { font-size:17px; }
    .feature-grid { grid-template-columns:repeat(2,minmax(0,1fr));gap:9px; }
    .feature-tile { min-height:120px;padding:13px;border-radius:16px; }
    .feature-tile strong { font-size:13px; }
    .feature-tile small { font-size:9px; }
    .dashboard-bottom { grid-template-columns:1fr;gap:10px;margin-top:12px; }
    .quick-prompts,.mode-panel { padding:12px; }
    .dashboard-footer { flex-direction:column;align-items:center;text-align:center;margin-top:18px; }
  }
  @media(max-width:360px) {
    .home-dashboard { width:calc(100% - 18px); }
    .feature-grid { gap:7px; }
    .feature-tile { padding:11px; }
    .dashboard-hero h1 { font-size:30px; }
  }

`;
export default Home; 
