"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const suggestions = [
  { icon: "✧", title: "Email likho", prompt: "Mere liye ek professional email likho." },
  { icon: "◇", title: "Business ideas", prompt: "Mujhe kuch practical business ideas batao." },
  { icon: "⌂", title: "Padhai mein help", prompt: "Mujhe kisi topic ko aasan bhasha mein samjhao." },
  { icon: "</>", title: "Coding help", prompt: "Mujhe coding mein step-by-step help karo." },
  { icon: "◷", title: "Study plan", prompt: "Mere liye ek daily study plan banao." },
];

const taskModes = [
  {
    id: "study",
    icon: "📚",
    title: "Padhai",
    description: "Notes, answers, study plan",
  },
  {
    id: "work",
    icon: "💼",
    title: "Job / Work",
    description: "Resume, email, applications",
  },
  {
    id: "business",
    icon: "🚀",
    title: "Business",
    description: "Ideas, planning, marketing",
  },
  {
    id: "content",
    icon: "✍️",
    title: "Content",
    description: "Posts, scripts, captions",
  },
  {
    id: "agent",
    icon: "🧠",
    title: "Agent / AGI",
    description: "Plan, execute, verify tasks",
  },
];

const taskInstructions = {
  study:
    "You are ORION AI in STUDY TASK MODE. Help the user finish the actual study task, not just discuss it. Explain in simple Hindi/Hinglish unless the user requests another language. Give a complete, well-structured answer, notes, examples, and step-by-step working when useful. Never invent facts; mention uncertainty when needed.",

  work:
    "You are ORION AI in JOB AND WORK TASK MODE. Produce a ready-to-use deliverable such as a resume section, professional email, application, cover letter, work plan, or interview answer. Ask only essential follow-up questions; if details are missing, use clear placeholders rather than blocking progress. Use a professional tone appropriate to the task.",

  business:
    "You are ORION AI in BUSINESS TASK MODE. Give practical, actionable deliverables such as a business plan, customer offer, marketing plan, budget outline, sales message, or next-step checklist. Be realistic about costs and risks, avoid guaranteed earnings claims, and clearly label estimates.",

  content:
    "You are ORION AI in CONTENT CREATION TASK MODE. Create complete, ready-to-publish content suited to the requested platform and audience. Include a strong opening, clear structure, and useful variations when appropriate. Match the requested language, tone, length, and format.",

  agent:
    "You are ORION AI in AGENT TASK MODE. Treat the request as a real task to complete. First understand the goal and constraints, then make a short plan, execute the useful parts available to you, verify the result, and clearly report what was completed, what remains, and any assumptions. Do not claim to have used tools, opened websites, changed files, or completed external actions unless that actually happened. Prefer concrete deliverables over discussion.",
};

function renderInline(text) {
  return String(text || "")
    .split(/(\*\*.*?\*\*|\*[^*]+\*)/g)
    .map((part, i) => {
      if (
        part.startsWith("**") &&
        part.endsWith("**") &&
        part.length > 4
      ) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }

      if (
        part.startsWith("*") &&
        part.endsWith("*") &&
        part.length > 2
      ) {
        return <em key={i}>{part.slice(1, -1)}</em>;
      }

      return part;
    });
}

function formatText(text) {
  const normalized = String(text || "").replace(
    /<br\s*\/?\s*>/gi,
    "\n"
  );

  const lines = normalized.split("\n");
  const output = [];

  let code = false;
  let codeLines = [];
  let i = 0;

  const isTableRow = (line) =>
    /^\s*\|.*\|\s*$/.test(line);

  const isTableDivider = (line) =>
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(
      line
    );

  const cellsFrom = (line) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*```/.test(line)) {
      if (code) {
        output.push(
          <pre
            className="codeBlock"
            key={`code-${i}`}
          >
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
      }

      code = !code;
      codeLines = [];
      i += 1;
      continue;
    }

    if (code) {
      codeLines.push(line);
      i += 1;
      continue;
    }

    if (
      isTableRow(line) &&
      i + 1 < lines.length &&
      isTableDivider(lines[i + 1])
    ) {
      const headers = cellsFrom(line);

      i += 2;

      const rows = [];

      while (
        i < lines.length &&
        isTableRow(lines[i])
      ) {
        rows.push(cellsFrom(lines[i]));
        i += 1;
      }

      output.push(
        <div
          className="tableWrap"
          key={`table-${i}`}
        >
          <table className="answerTable">
            <thead>
              <tr>
                {headers.map((cell, index) => (
                  <th key={index}>
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {headers.map((_, cellIndex) => (
                    <td key={cellIndex}>
                      {renderInline(
                        row[cellIndex] || ""
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      output.push(
        <div
          className="spaceLine"
          key={`space-${i}`}
        />
      );

      i += 1;
      continue;
    }

    const heading = trimmed.match(
      /^(#{1,6})\s+(.*)$/
    );

    if (heading) {
      const Tag =
        heading[1].length === 1
          ? "h2"
          : heading[1].length === 2
          ? "h3"
          : "h4";

      output.push(
        <Tag key={i}>
          {renderInline(heading[2])}
        </Tag>
      );

      i += 1;
      continue;
    }

    const bullet = trimmed.match(
      /^[-*•]\s+(.*)$/
    );

    if (bullet) {
      output.push(
        <div
          className="textBullet"
          key={i}
        >
          <span>•</span>
          <span>
            {renderInline(bullet[1])}
          </span>
        </div>
      );

      i += 1;
      continue;
    }

    const numbered = trimmed.match(
      /^(\d+)[.)]\s+(.*)$/
    );

    if (numbered) {
      output.push(
        <div
          className="numberedLine"
          key={i}
        >
          <span>{numbered[1]}.</span>
          <span>
            {renderInline(numbered[2])}
          </span>
        </div>
      );

      i += 1;
      continue;
    }

    output.push(
      <p key={i}>
        {renderInline(line)}
      </p>
    );

    i += 1;
  }

  if (code && codeLines.length) {
    output.push(
      <pre
        className="codeBlock"
        key="unfinished-code"
      >
        <code>
          {codeLines.join("\n")}
        </code>
      </pre>
    );
  }

  return output;
}

function extractReplyFromJson(data) {
  if (typeof data?.reply === "string") {
    return data.reply;
  }

  if (typeof data?.text === "string") {
    return data.text;
  }

  if (
    typeof data?.choices?.[0]?.message?.content ===
    "string"
  ) {
    return data.choices[0].message.content;
  }

  if (
    typeof data?.choices?.[0]?.delta?.content ===
    "string"
  ) {
    return data.choices[0].delta.content;
  }

  const parts =
    data?.candidates?.[0]?.content?.parts;

  if (Array.isArray(parts)) {
    return parts
      .map((p) => p?.text || "")
      .join("");
  }

  return "";
}

function parseServerResponse(raw) {
  const trimmed = String(raw || "").trim();

  if (!trimmed) {
    return {
      reply: "",
      error: "API se khaali response mila.",
    };
  }

  try {
    const json = JSON.parse(trimmed);

    if (json?.error) {
      return {
        reply: "",
        error: String(json.error),
      };
    }

    return {
      reply: extractReplyFromJson(json),
      error: "",
    };
  } catch {
    // JSON nahi hai to SSE format check karein.
  }

  if (trimmed.includes("data:")) {
    let reply = "";

    const events = trimmed.split(
      /\r?\n\r?\n/
    );

    for (const event of events) {
      const payload = event
        .split(/\r?\n/)
        .filter((line) =>
          line.startsWith("data:")
        )
        .map((line) =>
          line.slice(5).trim()
        )
        .filter(Boolean)
        .join("\n");

      if (
        !payload ||
        payload === "[DONE]"
      ) {
        continue;
      }

      try {
        const packet = JSON.parse(payload);

        if (packet?.error) {
          return {
            reply: "",
            error: String(
              packet.error?.message ||
              packet.error
            ),
          };
        }

        const piece =
          extractReplyFromJson(packet);

        if (piece) {
          reply += piece;
        }
      } catch {
        // Non-JSON event ignore karein.
      }
    }

    return {
      reply,
      error: "",
    };
  }

  return {
    reply: "",
    error:
      "Server ka response samajh nahi aaya. /api/chat/route.js check karein.",
  };
        }
export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [taskMode, setTaskMode] = useState("chat");

  const chatAreaRef = useRef(null);
  const inputRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const recognitionRef = useRef(null);
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const loadingRef = useRef(false);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    const el = chatAreaRef.current;

    if (!el || !shouldAutoScrollRef.current) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      const node = chatAreaRef.current;

      if (!node || !shouldAutoScrollRef.current) {
        return;
      }

      node.scrollTop = node.scrollHeight;
    });

    return () => cancelAnimationFrame(frame);
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      recognitionRef.current?.stop();

      if (
        typeof window !== "undefined" &&
        window.speechSynthesis
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const newChat = useCallback(() => {
    abortControllerRef.current?.abort();

    requestIdRef.current += 1;
    loadingRef.current = false;

    setMessages([]);
    setInput("");
    setLoading(false);
    setNotice("");
    setMenuOpen(false);
    setTaskMode("chat");

    shouldAutoScrollRef.current = true;
  }, []);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  async function sendMessage(text) {
    const message = String(
      text !== undefined ? text : input
    ).trim();

    if (!message || loadingRef.current) {
      return;
    }

    const activeTaskMode = taskMode;
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    abortControllerRef.current = controller;
    loadingRef.current = true;

    shouldAutoScrollRef.current = true;

    setNotice("");
    setInput("");
    setMenuOpen(false);
    setTaskMode("chat");
    setLoading(true);

    setMessages((old) => [
      ...old,
      {
        role: "user",
        content: message,
      },
      {
        role: "assistant",
        content: "",
        pending: true,
      },
    ]);

    const updateAssistant = (
      content,
      pending = false
    ) => {
      if (
        requestId !== requestIdRef.current
      ) {
        return;
      }

      setMessages((old) => {
        const updated = [...old];

        let index = updated.length - 1;

        while (
          index >= 0 &&
          updated[index].role !== "assistant"
        ) {
          index--;
        }

        if (index >= 0) {
          updated[index] = {
            ...updated[index],
            content,
            pending,
          };
        }

        return updated;
      });
    };

    try {
      const conversationHistory = [
        ...messages
          .filter(
            (item) =>
              item.role === "user" ||
              item.role === "assistant"
          )
          .slice(-14),

        {
          role: "user",
          content: message,
        },
      ];

      const response = await fetch(
        "/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            message,

            messages: conversationHistory,

            taskMode: activeTaskMode,

            taskInstruction:
              taskInstructions[
                activeTaskMode
              ] || "",
          }),

          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const rawError =
          await response.text();

        let serverError =
          `Server error (${response.status})`;

        const parsedError =
          parseServerResponse(rawError);

        if (parsedError.error) {
          serverError =
            parsedError.error;
        } else if (parsedError.reply) {
          serverError =
            parsedError.reply;
        }

        throw new Error(serverError);
      }

      const reader =
        response.body?.getReader();

      const decoder =
        new TextDecoder("utf-8");

      let buffer = "";
      let fullReply = "";
      let gotStructuredData = false;

      const appendPiece = (piece) => {
        const textPiece =
          String(piece || "");

        if (!textPiece) {
          return;
        }

        fullReply += textPiece;

        updateAssistant(
          fullReply,
          true
        );
      };

      const processEvent = (event) => {
        const lines = String(event || "")
          .split(/\r?\n/);

        const dataLines = lines
          .filter((line) =>
            line.startsWith("data:")
          )
          .map((line) =>
            line.slice(5).trim()
          );

        if (!dataLines.length) {
          return;
        }

        const payload =
          dataLines.join("\n");

        if (
          !payload ||
          payload === "[DONE]"
        ) {
          return;
        }

        try {
          const packet =
            JSON.parse(payload);

          gotStructuredData = true;

          if (packet?.error) {
            throw new Error(
              String(
                packet.error?.message ||
                packet.error
              )
            );
          }

          const piece =
            extractReplyFromJson(packet);

          if (piece) {
            appendPiece(piece);
          }
        } catch (error) {
          if (
            error?.message &&
            /API|quota|server|error/i.test(
              error.message
            )
          ) {
            throw error;
          }

          appendPiece(payload);
        }
      };

      if (reader) {
        while (true) {
          if (
            controller.signal.aborted ||
            requestId !==
              requestIdRef.current
          ) {
            break;
          }

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

          const events =
            buffer.split(
              /\r?\n\r?\n/
            );

          buffer =
            events.pop() || "";

          for (const event of events) {
            processEvent(event);
          }
        }

        buffer += decoder.decode();

        if (buffer.trim()) {
          if (/^data:/m.test(buffer)) {
            processEvent(buffer);
          } else if (
            !gotStructuredData
          ) {
            const parsed =
              parseServerResponse(
                buffer
              );

            if (parsed.error) {
              throw new Error(
                parsed.error
              );
            }

            if (parsed.reply) {
              appendPiece(
                parsed.reply
              );
            }
          }
        }
      } else {
        const raw =
          await response.text();

        const parsed =
          parseServerResponse(raw);

        if (parsed.error) {
          throw new Error(
            parsed.error
          );
        }

        appendPiece(parsed.reply);
      }

      if (!fullReply.trim()) {
        throw new Error(
          "AI se khaali response mila. API route aur key check karein."
        );
      }

      updateAssistant(
        fullReply,
        false
      );
    } catch (error) {
      if (
        requestId !==
        requestIdRef.current
      ) {
        return;
      }

      if (
        error?.name === "AbortError"
      ) {
        setMessages((old) =>
          old.map(
            (item, index) =>
              index ===
                old.length - 1 &&
              item.role ===
                "assistant"
                ? {
                    ...item,
                    pending: false,
                  }
                : item
          )
        );
      } else {
        updateAssistant(
          `⚠️ ${
            error?.message ||
            "Kuch galat ho gaya. Dobara try karein."
          }`,
          false
        );
      }
    } finally {
      if (
        requestId ===
        requestIdRef.current
      ) {
        loadingRef.current = false;
        setLoading(false);
        abortControllerRef.current =
          null;
      }
    }
  }

  function handleChatScroll() {
    const el =
      chatAreaRef.current;

    if (!el) {
      return;
    }

    const distanceFromBottom =
      el.scrollHeight -
      el.scrollTop -
      el.clientHeight;

    shouldAutoScrollRef.current =
      distanceFromBottom < 140;
  }

  function startVoice() {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setNotice(
        "Is browser mein voice input support nahi karta."
      );

      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current =
        null;

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
      setNotice("");
    };

    recognition.onresult = (
      event
    ) => {
      let transcript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        transcript +=
          event.results[i][0]
            .transcript;
      }

      setInput(transcript);
    };

    recognition.onerror = () => {
      setNotice(
        "Voice input mein dikkat aayi. Dobara try karein."
      );

      setListening(false);
      recognitionRef.current =
        null;
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current =
        null;
    };

    recognitionRef.current =
      recognition;

    try {
      recognition.start();
    } catch {
      setListening(false);
      recognitionRef.current =
        null;

      setNotice(
        "Microphone shuru nahi ho saka."
      );
    }
  }

  function speak(text) {
    if (
      typeof window ===
        "undefined" ||
      !window.speechSynthesis
    ) {
      setNotice(
        "Text-to-speech is browser mein available nahi hai."
      );

      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        String(text || "")
      );

    utterance.lang = "hi-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1;

    window.speechSynthesis.speak(
      utterance
    );
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(
        String(text || "")
      );

      setNotice(
        "Jawab copy ho gaya!"
      );

      setTimeout(
        () => setNotice(""),
        2200
      );
    } catch {
      setNotice(
        "Copy nahi hua. Text ko select karke copy karein."
      );
    }
  }

  function focusComposer() {
    inputRef.current?.focus();
  }

  function handleSubmit(event) {
    event?.preventDefault();
    sendMessage();
  }

  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  }

  const hasMessages =
    messages.length > 0;

  return (
        <main className="page">
      <div className="ambientGlow ambientGlowOne" />
      <div className="ambientGlow ambientGlowTwo" />

      <header className="header">
        <button
          className="brandButton"
          onClick={newChat}
          type="button"
          aria-label="ORION AI home"
        >
          <span className="logoMark">
            <span className="logoStar">✦</span>
          </span>

          <span className="brandText">
            <span className="brandName">
              ORION AI
            </span>

            <span className="brandSubtitle">
              Your Intelligent Companion
            </span>
          </span>
        </button>

        <div className="headerActions">
          <button
            className="roundButton"
            type="button"
            onClick={newChat}
            title="New chat"
            aria-label="New chat"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          <button
            className="roundButton menuButton"
            type="button"
            onClick={() =>
              setMenuOpen(
                (open) => !open
              )
            }
            title="Menu"
            aria-label="Menu"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="menuPanel">
          <button
            type="button"
            onClick={newChat}
            className="menuItem"
          >
            <span>＋</span>
            New chat
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setShowComingSoon(true);
            }}
            className="menuItem"
          >
            <span>✧</span>
            More features
          </button>

          <div className="menuCredit">
            ORION AI · Powered by Dharm AI
          </div>
        </div>
      )}

      <section
        className={`chatArea ${
          hasMessages
            ? "chatAreaActive"
            : "chatAreaHome"
        }`}
        ref={chatAreaRef}
        onScroll={handleChatScroll}
      >
        {!hasMessages ? (
          <div className="homeScreen">
            <div className="heroLogo">
              <span className="heroLogoCore">
                ✦
              </span>

              <span
                className="heroOrbit heroOrbitOne"
              />

              <span
                className="heroOrbit heroOrbitTwo"
              />
            </div>

            <div className="heroEyebrow">
              <span className="statusDot" />
              YOUR AI COMPANION
            </div>

            <h1 className="heroTitle">
              Hello, <span>Explorer.</span>
            </h1>

            <p className="heroDescription">
              Main ORION AI hoon. Aapke sawalon,
              ideas, padhai, kaam aur naye
              projects mein madad ke liye taiyar.
            </p>

            <div className="creditLine">
              ORION AI
              <span>·</span>
              Powered by Dharm AI
            </div>

            <div className="taskSection">
              <div className="sectionHeading">
                <span>
                  Apna task chunein
                </span>

                <span className="sectionHint">
                  OPTIONAL
                </span>
              </div>

              <div className="taskGrid">
                {taskModes.map(
                  (mode) => (
                    <button
                      type="button"
                      key={mode.id}
                      className={`taskModeCard ${
                        taskMode ===
                        mode.id
                          ? "taskModeSelected"
                          : ""
                      }`}
                      onClick={() => {
                        setTaskMode(
                          mode.id
                        );
                        focusComposer();
                      }}
                    >
                      <span className="taskIcon">
                        {mode.icon}
                      </span>

                      <span className="taskText">
                        <span className="taskTitle">
                          {mode.title}
                        </span>

                        <span className="taskDescription">
                          {
                            mode.description
                          }
                        </span>
                      </span>

                      <span className="taskArrow">
                        ↗
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="suggestionSection">
              <div className="sectionHeading">
                <span>
                  Shuru karne ke liye
                </span>
              </div>

              <div className="suggestionGrid">
                {suggestions.map(
                  (item) => (
                    <button
                      key={item.title}
                      type="button"
                      className="suggestionCard"
                      onClick={() => {
                        setInput(
                          item.prompt
                        );
                        focusComposer();
                      }}
                    >
                      <span className="suggestionIcon">
                        {item.icon}
                      </span>

                      <span>
                        {item.title}
                      </span>

                      <span className="suggestionArrow">
                        ↗
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="messagesContainer">
            {messages.map(
              (message, index) => (
                <article
                  key={`${index}-${message.role}`}
                  className={`messageRow ${
                    message.role ===
                    "user"
                      ? "userMessageRow"
                      : "assistantMessageRow"
                  }`}
                >
                  {message.role ===
                    "assistant" && (
                    <div className="assistantAvatar">
                      ✦
                    </div>
                  )}

                  <div className="messageMain">
                    <div className="messageLabel">
                      {message.role ===
                      "user"
                        ? "You"
                        : "ORION AI"}

                      {message.role ===
                        "assistant" && (
                        <span className="assistantBadge">
                          {message.pending
                            ? "THINKING"
                            : "AI"}
                        </span>
                      )}
                    </div>

                    <div
                      className={`messageBubble ${
                        message.role ===
                        "user"
                          ? "userBubble"
                          : "assistantBubble"
                      }`}
                    >
                      {message.content ? (
                        <div className="messageContent">
                          {formatText(
                            message.content
                          )}

                          {message.pending && (
                            <span className="typingCursor" />
                          )}
                        </div>
                      ) : message.pending ? (
                        <div className="thinkingIndicator">
                          <span />
                          <span />
                          <span />

                          <small>
                            ORION soch raha hai...
                          </small>
                        </div>
                      ) : null}
                    </div>

                    {message.role ===
                      "assistant" &&
                      message.content && (
                        <div className="messageTools">
                          <button
                            type="button"
                            onClick={() =>
                              copyText(
                                message.content
                              )
                            }
                            className="toolButton"
                          >
                            <span>
                              ▢
                            </span>
                            Copy
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              speak(
                                message.content
                              )
                            }
                            className="toolButton"
                          >
                            <span>
                              ♫
                            </span>
                            Suno
                          </button>
                        </div>
                      )}
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>

      <footer className="bottomArea">
        {notice && (
          <button
            type="button"
            className="noticeBar"
            onClick={() =>
              setNotice("")
            }
          >
            {notice}
            <span>×</span>
          </button>
        )}

        <div className="composerOuter">
          {taskMode !== "chat" &&
            !hasMessages && (
              <div className="activeTaskLabel">
                <span>
                  {
                    taskModes.find(
                      (item) =>
                        item.id ===
                        taskMode
                    )?.icon
                  }
                </span>

                {
                  taskModes.find(
                    (item) =>
                      item.id ===
                      taskMode
                  )?.title
                }

                <button
                  type="button"
                  onClick={() =>
                    setTaskMode("chat")
                  }
                >
                  ×
                </button>
              </div>
            )}

          <form
            className="inputBox"
            onSubmit={handleSubmit}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) =>
                setInput(
                  event.target.value
                )
              }
              onKeyDown={handleKeyDown}
              placeholder="ORION se kuch bhi poochhein..."
              rows={1}
              aria-label="Message"
            />

            <div className="inputActions">
              <div className="inputLeftActions">
                <button
                  type="button"
                  className="inputIconButton"
                  title="More features"
                  aria-label="More features"
                  onClick={() =>
                    setShowComingSoon(true)
                  }
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>

                <span className="inputHint">
                  Shift + Enter for new line
                </span>
              </div>

              <div className="inputRightActions">
                <button
                  type="button"
                  className={`voiceButton ${
                    listening
                      ? "voiceButtonActive"
                      : ""
                  }`}
                  title={
                    listening
                      ? "Voice band karein"
                      : "Voice input"
                  }
                  aria-label="Voice input"
                  onClick={startVoice}
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

                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
                  </svg>
                </button>

                {loading ? (
                  <button
                    type="button"
                    className="sendButton stopButton"
                    onClick={
                      stopGeneration
                    }
                    title="Stop response"
                    aria-label="Stop response"
                  >
                    <span className="stopSquare" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="sendButton"
                    disabled={
                      !input.trim()
                    }
                    title="Send message"
                    aria-label="Send message"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="footerCaption">
          <span className="footerBrandDot">
            ✦
          </span>

          ORION AI
          <span className="footerSeparator">
            ·
          </span>

          Powered by Dharm AI
        </div>

        <div className="disclaimer">
          AI kabhi-kabhi galti kar sakta hai.
          Zaroori jaankari verify karein.
        </div>
      </footer>

      {showComingSoon && (
        <div
          className="modalBackdrop"
          onClick={() =>
            setShowComingSoon(false)
          }
          role="presentation"
        >
          <div
            className="modalCard"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modalTitle"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="modalClose"
              onClick={() =>
                setShowComingSoon(false)
              }
              aria-label="Close"
            >
              ×
            </button>

            <div className="modalIcon">
              ✦
            </div>

            <h2 id="modalTitle">
              More features
            </h2>

            <p>
              ORION AI ke naye features par
              kaam chal raha hai. Filhaal aap
              chat, voice input, copy aur
              text-to-speech ka istemal kar
              sakte hain.
            </p>

            <button
              type="button"
              className="modalPrimary"
              onClick={() =>
                setShowComingSoon(false)
              }
            >
              Samajh gaya
            </button>
          </div>
        </div>
      )}
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          min-height: 100%;
          background: #f6f9ff;
          color: #172c4c;
          font-family: Inter, ui-sans-serif,
            system-ui, -apple-system,
            BlinkMacSystemFont,
            "Segoe UI", sans-serif;
        }

        body {
          overflow: hidden;
        }

        button,
        textarea {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        .page {
          height: 100dvh;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
          isolation: isolate;
          background:
            radial-gradient(
              ellipse at 50% -20%,
              rgba(92, 180, 255, 0.17),
              transparent 48%
            ),
            linear-gradient(
              145deg,
              #fbfdff 0%,
              #f3f8ff 52%,
              #fafdff 100%
            );
          color: #172c4c;
        }

        .ambientGlow {
          position: absolute;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          filter: blur(85px);
          pointer-events: none;
          z-index: -1;
          opacity: 0.28;
        }

        .ambientGlowOne {
          background: #70baff;
          top: 20%;
          left: -230px;
        }

        .ambientGlowTwo {
          background: #72e6f5;
          right: -240px;
          bottom: 12%;
        }

        .header {
          height: 76px;
          flex: 0 0 76px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 24px;
          background: rgba(255, 255, 255, 0.88);
          border-bottom: 1px solid #e4edf9;
          backdrop-filter: blur(18px);
          position: relative;
          z-index: 10;
          box-shadow: 0 3px 18px rgba(
            37, 86, 145, 0.035
          );
        }

        .brandButton {
          display: flex;
          align-items: center;
          gap: 11px;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          padding: 0;
          text-align: left;
          min-width: 0;
        }

        .logoMark {
          width: 43px;
          height: 43px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: linear-gradient(
            140deg,
            #eff8ff,
            #dcecff
          );
          border: 1px solid #b6d9ff;
          color: #0876ec;
          box-shadow:
            0 0 18px rgba(
              43,
              142,
              255,
              0.17
            ),
            inset 0 0 12px rgba(
              255,
              255,
              255,
              0.9
            );
        }

        .logoStar {
          font-size: 27px;
          text-shadow: 0 0 12px rgba(
            20,
            142,
            255,
            0.6
          );
        }

        .brandText {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .brandName {
          color: #123b70;
          font-size: 17px;
          font-weight: 850;
          letter-spacing: 1.6px;
        }

        .brandSubtitle {
          color: #7387a4;
          font-size: 10px;
          letter-spacing: 0.25px;
        }

        .headerActions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .roundButton {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border: 1px solid #dce8f7;
          border-radius: 13px;
          background: #fff;
          color: #35618e;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .roundButton:hover {
          color: #0879ed;
          border-color: #8dc5ff;
          box-shadow: 0 0 16px rgba(
            32,
            140,
            255,
            0.14
          );
          transform: translateY(-1px);
        }

        .roundButton svg,
        .inputIconButton svg,
        .voiceButton svg,
        .sendButton svg {
          width: 20px;
          height: 20px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .menuPanel {
          position: absolute;
          top: 66px;
          right: 22px;
          z-index: 30;
          width: 230px;
          padding: 9px;
          border-radius: 17px;
          background: rgba(
            255,
            255,
            255,
            0.98
          );
          border: 1px solid #dce8f8;
          box-shadow: 0 15px 45px rgba(
            26,
            68,
            120,
            0.15
          );
        }

        .menuItem {
          width: 100%;
          padding: 12px;
          border: 0;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: left;
          background: transparent;
          color: #294668;
          cursor: pointer;
        }

        .menuItem:hover {
          background: #eff7ff;
          color: #0879ed;
        }

        .menuCredit {
          border-top: 1px solid #e7eef8;
          margin-top: 6px;
          padding: 12px 7px 5px;
          color: #8192aa;
          font-size: 10px;
          text-align: center;
        }

        .chatArea {
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: #c5d9ef transparent;
          position: relative;
          z-index: 1;
          scroll-behavior: auto;
        }

        .chatArea::-webkit-scrollbar {
          width: 6px;
        }

        .chatArea::-webkit-scrollbar-thumb {
          background: #c5d9ef;
          border-radius: 8px;
        }

        .homeScreen {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 32px 18px;
          gap: 20px;
        }

        .heroLogo {
          width: 92px;
          height: 92px;
          border-radius: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          font-size: 42px;
          font-weight: 900;
          color: #fff;
          background: linear-gradient(
            135deg,
            #1687ff,
            #00d4ff
          );
          box-shadow: 0 0 30px rgba(
            0,
            174,
            255,
            0.38
          );
          border: 1px solid rgba(
            255,
            255,
            255,
            0.65
          );
        }

        .heroLogoCore {
          position: relative;
          z-index: 1;
          text-shadow: 0 0 18px rgba(
            255,
            255,
            255,
            0.7
          );
        }

        .heroOrbit {
          position: absolute;
          width: 105px;
          height: 105px;
          border: 1px solid rgba(
            22,
            135,
            255,
            0.25
          );
          border-radius: 50%;
          pointer-events: none;
        }

        .heroOrbitOne {
          transform: rotate(30deg)
            scaleX(1.45);
        }

        .heroOrbitTwo {
          transform: rotate(-30deg)
            scaleX(1.45);
        }

        .heroEyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #6f87a2;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .statusDot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #20c477;
          box-shadow: 0 0 9px rgba(
            32,
            196,
            119,
            0.45
          );
        }

        .heroTitle {
          margin: 0;
          font-size: clamp(
            28px,
            5vw,
            42px
          );
          font-weight: 850;
          letter-spacing: -1px;
          color: #102d50;
        }

        .heroTitle span {
          color: #1687df;
        }

        .heroDescription {
          max-width: 520px;
          margin: 0;
          color: #66809d;
          font-size: 14px;
          line-height: 1.7;
        }

        .creditLine {
          color: #1687df;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .creditLine span {
          margin: 0 4px;
          color: #a0b0c2;
        }

        .taskSection,
        .suggestionSection {
          width: 100%;
          max-width: 600px;
        }

        .sectionHeading {
          width: 100%;
          max-width: 600px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #476684;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.4px;
          margin-bottom: 10px;
        }

        .sectionHint {
          color: #9aaabd;
          font-size: 9px;
        }

        .taskGrid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 10px;
          width: 100%;
        }

        .taskModeCard {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 13px;
          border: 1px solid #dceafa;
          border-radius: 14px;
          background: rgba(
            255,
            255,
            255,
            0.88
          );
          color: #244362;
          text-align: left;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .taskModeCard:hover,
        .taskModeSelected {
          border-color: #72c5ff;
          box-shadow: 0 5px 20px rgba(
            0,
            139,
            255,
            0.1
          );
        }

        .taskIcon {
          font-size: 19px;
        }

        .taskText {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .taskTitle {
          font-size: 12px;
          font-weight: 800;
        }

        .taskDescription {
          color: #7a8fa8;
          font-size: 10px;
        }

        .taskArrow {
          margin-left: auto;
          color: #6c8baa;
        }

        .suggestionGrid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 12px;
          width: 100%;
        }

        .suggestionCard {
          padding: 16px;
          border: 1px solid #dceafa;
          border-radius: 17px;
          background: rgba(
            255,
            255,
            255,
            0.86
          );
          color: #244362;
          text-align: left;
          cursor: pointer;
          transition: 0.2s ease;
          font-size: 13px;
          line-height: 1.5;
        }

        .suggestionCard:hover {
          border-color: #55baff;
          box-shadow: 0 5px 22px rgba(
            0,
            139,
            255,
            0.12
          );
          transform: translateY(-2px);
        }

        .suggestionIcon {
          margin-right: 8px;
          color: #1687df;
        }

        .suggestionArrow {
          float: right;
          color: #7c94ad;
        }
                .messages {
          width: 100%;
          max-width: 850px;
          margin: 0 auto;
          padding: 28px 18px 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .messageRow {
          display: flex;
          width: 100%;
          gap: 11px;
        }

        .messageRow.user {
          justify-content: flex-end;
        }

        .messageRow.assistant {
          justify-content: flex-start;
        }

        .messageAvatar {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: linear-gradient(
            135deg,
            #1687ff,
            #00cce8
          );
          color: white;
          font-size: 15px;
          box-shadow: 0 0 14px rgba(
            0,
            160,
            255,
            0.2
          );
        }

        .messageContent {
          max-width: min(
            760px,
            calc(100% - 48px)
          );
          min-width: 0;
        }

        .messageLabel {
          margin-bottom: 5px;
          color: #8195ad;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.7px;
        }

        .messageBubble {
          padding: 13px 15px;
          border-radius: 16px;
          line-height: 1.65;
          font-size: 14px;
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .messageRow.assistant
          .messageBubble {
          background: rgba(
            255,
            255,
            255,
            0.92
          );
          border: 1px solid #e0ebf7;
          color: #294766;
          border-top-left-radius: 5px;
        }

        .messageRow.user
          .messageBubble {
          background: linear-gradient(
            135deg,
            #1687ff,
            #159de7
          );
          color: #fff;
          border-top-right-radius: 5px;
          box-shadow: 0 5px 18px rgba(
            20,
            132,
            231,
            0.16
          );
        }

        .messageBubble h1,
        .messageBubble h2,
        .messageBubble h3 {
          margin: 13px 0 7px;
          color: inherit;
          line-height: 1.3;
        }

        .messageBubble h1 {
          font-size: 20px;
        }

        .messageBubble h2 {
          font-size: 17px;
        }

        .messageBubble h3 {
          font-size: 15px;
        }

        .messageBubble p {
          margin: 5px 0;
        }

        .messageBubble ul,
        .messageBubble ol {
          margin: 7px 0;
          padding-left: 22px;
        }

        .messageBubble li {
          margin: 4px 0;
        }

        .messageBubble strong {
          font-weight: 800;
        }

        .messageTools {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 7px;
        }

        .toolButton {
          border: 0;
          background: transparent;
          color: #8297ae;
          font-size: 10px;
          padding: 4px 6px;
          border-radius: 7px;
          cursor: pointer;
        }

        .toolButton:hover {
          color: #1687df;
          background: #edf7ff;
        }

        .typingCursor {
          display: inline-block;
          width: 5px;
          height: 16px;
          margin-left: 3px;
          vertical-align: -2px;
          border-radius: 3px;
          background: #1687df;
          animation: cursorBlink 0.85s
            ease-in-out infinite;
        }

        @keyframes cursorBlink {
          0%,
          45% {
            opacity: 1;
          }

          46%,
          100% {
            opacity: 0;
          }
        }

        .thinking {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 0;
        }

        .thinkingDot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #55aef2;
          animation: thinkingPulse 1.2s
            ease-in-out infinite;
        }

        .thinkingDot:nth-child(2) {
          animation-delay: 0.15s;
        }

        .thinkingDot:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes thinkingPulse {
          0%,
          60%,
          100% {
            opacity0.35;
            transform: translateY(0);
          }

          30% {
            opacity: 1;
            transform: translateY(-3px);
          }
        }

        .composer {
          flex: 0 0 auto;
          width: 100%;
          padding: 10px 18px 13px;
          background: rgba(
            255,
            255,
            255,
            0.9
          );
          border-top: 1px solid #e1ebf6;
          backdrop-filter: blur(18px);
          position: relative;
          z-index: 5;
        }

        .notice {
          width: 100%;
          max-width: 850px;
          margin: 0 auto 7px;
          min-height: 17px;
          color: #7890aa;
          text-align: center;
          font-size: 9px;
        }

        .notice.error {
          color: #d35e5e;
        }

        .inputBox {
          width: 100%;
          max-width: 850px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px;
          border: 1px solid #d9e7f5;
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 6px 25px rgba(
            32,
            79,
            126,
            0.08
          );
        }

        .inputBox:focus-within {
          border-color: #79c4ff;
          box-shadow:
            0 6px 25px rgba(
              32,
              79,
              126,
              0.08
            ),
            0 0 0 3px rgba(
              57,
              164,
              255,
              0.08
            );
        }

        .inputBox textarea {
          width: 100%;
          min-height: 46px;
          max-height: 150px;
          resize: none;
          border: 0;
          outline: 0;
          background: transparent;
          color: #203f60;
          padding: 7px 8px;
          font-size: 14px;
          line-height: 1.5;
        }

        .inputBox textarea::placeholder {
          color: #9aacbf;
        }

        .inputActions {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .leftActions,
        .rightActions {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .inputIconButton,
        .voiceButton,
        .sendButton {
          display: grid;
          place-items: center;
          border: 0;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .inputIconButton {
          width: 35px;
          height: 35px;
          border-radius: 10px;
          background: #f0f6fc;
          color: #5d7a98;
        }

        .inputIconButton:hover {
          background: #e4f2ff;
          color: #1687df;
        }

        .voiceButton {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: #edf7ff;
          color: #1687df;
        }

        .voiceButton:hover {
          background: #dff1ff;
          transform: translateY(-1px);
        }

        .voiceButton.listening {
          background: #e3f8ee;
          color: #15975c;
          box-shadow: 0 0 0 4px
            rgba(
              21,
              151,
              92,
              0.08
            );
        }

        .sendButton {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(
            135deg,
            #1687ff,
            #00bde8
          );
          color: #fff;
          box-shadow: 0 4px 14px rgba(
            22,
            135,
            255,
            0.2
          );
        }

        .sendButton:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(
            22,
            135,
            255,
            0.28
          );
        }

        .sendButton:disabled,
        .voiceButton:disabled,
        .inputIconButton:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }

        .activeTask {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          border-radius: 8px;
          background: #edf7ff;
          color: #4b7195;
          font-size: 9px;
          font-weight: 700;
        }

        .footerCredit {
          max-width: 850px;
          margin: 6px auto 0;
          text-align: center;
          color: #91a2b5;
          font-size: 8px;
          letter-spacing: 0.25px;
        }

        .footerCredit strong {
          color: #1687df;
          font-weight: 800;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(
            13,
            39,
            68,
            0.24
          );
          backdrop-filter: blur(5px);
        }

        .modal {
          width: min(
            500px,
            100%
          );
          max-height: 85dvh;
          overflow-y: auto;
          padding: 23px;
          border: 1px solid #dbe8f6;
          border-radius: 23px;
          background: #fff;
          box-shadow: 0 25px 70px rgba(
            18,
            57,
            96,
            0.22
          );
        }

        .modalHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
        }

        .modalTitle {
          margin: 0;
          color: #173b63;
          font-size: 19px;
          font-weight: 850;
        }

        .modalClose {
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 10px;
          background: #f0f6fc;
          color: #62809d;
          cursor: pointer;
        }

        .featureList {
          display: grid;
          gap: 9px;
        }

        .featureItem {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          border: 1px solid #e3edf7;
          border-radius: 13px;
          background: #fafdff;
        }

        .featureIcon {
          font-size: 19px;
        }

        .featureText {
          flex: 1;
        }

        .featureTitle {
          margin-bottom: 3px;
          color: #315577;
          font-size: 12px;
          font-weight: 800;
        }

        .featureDescription {
          color: #8195aa;
          font-size: 10px;
          line-height: 1.5;
        }

        .comingSoon {
          margin-top: 16px;
          padding: 12px;
          border-radius: 12px;
          background: #eef8ff;
          color: #31709f;
          text-align: center;
          font-size: 10px;
          font-weight: 700;
        }

        @media (max-width: 700px) {
          .header {
            height: 66px;
            flex-basis: 66px;
            padding: 0 13px;
          }

          .logoMark {
            width: 38px;
            height: 38px;
            border-radius: 12px;
          }

          .brandName {
            font-size: 15px;
          }

          .brandSubtitle {
            font-size: 9px;
          }

          .headerActions {
            gap: 6px;
          }

          .roundButton {
            width: 36px;
            height: 36px;
            border-radius: 11px;
          }

          .homeScreen {
            justify-content: flex-start;
            padding: 28px 13px 22px;
            gap: 16px;
          }

          .heroLogo {
            width: 76px;
            height: 76px;
            border-radius: 23px;
            font-size: 34px;
          }

          .heroOrbit {
            width: 87px;
            height: 87px;
          }

          .heroTitle {
            font-size: 30px;
          }

          .heroDescription {
            font-size: 12px;
            line-height: 1.6;
          }

          .taskGrid,
          .suggestionGrid {
            grid-template-columns: 1fr;
          }

          .taskModeCard {
            padding: 11px;
          }

          .messages {
            padding: 20px 11px 18px;
          }

          .messageBubble {
            font-size: 13px;
          }

          .messageContent {
            max-width: calc(
              100% - 43px
            );
          }

          .composer {
            padding: 7px 9px 10px;
          }

          .inputBox {
            padding: 8px;
            border-radius: 16px;
          }

          .inputBox textarea {
            min-height: 43px;
            font-size: 13px;
          }

          .footerCredit {
            font-size: 7px;
          }

          .menuPanel {
            top: 60px;
            right: 10px;
            width: 220px;
          }
        }

        @media (max-width: 390px) {
          .brandSubtitle {
            display: none;
          }

          .heroTitle {
            font-size: 27px;
          }

          .heroDescription {
            max-width: 330px;
          }

          .messageAvatar {
            width: 31px;
            height: 31px;
            flex-basis: 31px;
          }

          .messageContent {
            max-width: calc(
              100% - 40px
            );
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms
              !important;
            animation-iteration-count: 1
              !important;
            scroll-behavior: auto
              !important;
            transition-duration: 0.01ms
              !important;
          }
        }
      `}</style>
    </main>
  );
}
