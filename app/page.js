"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/* =========================
   ORION AI SUGGESTIONS
========================= */

const suggestions = [
  {
    icon: "✧",
    title: "Email likho",
    prompt:
      "Mere liye ek professional email likho.",
  },
  {
    icon: "◇",
    title: "Business ideas",
    prompt:
      "Mujhe practical business ideas batao.",
  },
  {
    icon: "⌂",
    title: "Padhai mein help",
    prompt:
      "Mujhe kisi topic ko aasan bhasha mein samjhao.",
  },
  {
    icon: "</>",
    title: "Coding help",
    prompt:
      "Mujhe coding mein step-by-step help karo.",
  },
  {
    icon: "◷",
    title: "Study plan",
    prompt:
      "Mere liye ek daily study plan banao.",
  },
];

/* =========================
   TASK MODES
========================= */

const taskModes = [
  {
    id: "chat",
    icon: "✦",
    title: "Chat",
    description:
      "Normal intelligent chat",
  },
  {
    id: "agent",
    icon: "⚡",
    title: "Agent",
    description:
      "Plan, reason, execute",
  },
  {
    id: "study",
    icon: "📚",
    title: "Padhai",
    description:
      "Notes, answers, study plan",
  },
  {
    id: "work",
    icon: "💼",
    title: "Job / Work",
    description:
      "Resume, email, applications",
  },
  {
    id: "business",
    icon: "🚀",
    title: "Business",
    description:
      "Ideas, planning, marketing",
  },
  {
    id: "content",
    icon: "✍️",
    title: "Content",
    description:
      "Posts, scripts, captions",
  },
];

/* =========================
   TASK INSTRUCTIONS
========================= */

const taskInstructions = {
  chat:
    "You are ORION AI in normal chat mode. Understand the user's intent first and answer naturally, clearly and accurately.",

  agent:
    "You are ORION AI in AGENT MODE. Break complex requests into useful steps internally, solve as much as possible, and clearly distinguish completed actions from suggestions. Never claim to have used a website, browser, tool, API, source or external data unless it was actually used.",

  study:
    "You are ORION AI in STUDY TASK MODE. Explain in simple Hindi/Hinglish, provide structured notes, examples and step-by-step working when useful. Never invent facts.",

  work:
    "You are ORION AI in JOB AND WORK TASK MODE. Produce ready-to-use resumes, emails, applications, cover letters, plans or interview answers. Use placeholders when essential details are missing.",

  business:
    "You are ORION AI in BUSINESS TASK MODE. Give practical plans, offers, marketing ideas, budgets and next steps. Clearly label estimates, assumptions and risks.",

  content:
    "You are ORION AI in CONTENT CREATION TASK MODE. Create ready-to-publish content matching the requested platform, audience, language, tone and length.",
};

/* =========================
   INLINE MARKDOWN
========================= */

function renderInline(text) {
  return String(text || "")
    .split(
      /(\*\*.*?\*\*|\*[^*]+\*)/g
    )
    .map((part, index) => {
      if (
        part.startsWith("**") &&
        part.endsWith("**") &&
        part.length > 4
      ) {
        return (
          <strong key={index}>
            {part.slice(2, -2)}
          </strong>
        );
      }

      if (
        part.startsWith("*") &&
        part.endsWith("*") &&
        part.length > 2
      ) {
        return (
          <em key={index}>
            {part.slice(1, -1)}
          </em>
        );
      }

      return part;
    });
}

/* =========================
   MESSAGE FORMATTER
========================= */

function formatText(text) {
  const lines = String(text || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .split("\n");

  const output = [];

  let codeMode = false;
  let codeLines = [];
  let index = 0;

  const isTableRow = (line) =>
    /^\s*\|.*\|\s*$/.test(line);

  const isTableDivider = (line) =>
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(
      line
    );

  const getCells = (line) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());

  while (index < lines.length) {
    const line = lines[index];

    /* Code block */

    if (/^\s*```/.test(line)) {
      if (codeMode) {
        output.push(
          <pre
            className="codeBlock"
            key={`code-${index}`}
          >
            <code>
              {codeLines.join("\n")}
            </code>
          </pre>
        );
      }

      codeMode = !codeMode;
      codeLines = [];
      index++;
      continue;
    }

    if (codeMode) {
      codeLines.push(line);
      index++;
      continue;
    }

    /* Markdown table */

    if (
      isTableRow(line) &&
      index + 1 < lines.length &&
      isTableDivider(lines[index + 1])
    ) {
      const headers = getCells(line);
      const rows = [];

      index += 2;

      while (
        index < lines.length &&
        isTableRow(lines[index])
      ) {
        rows.push(
          getCells(lines[index])
        );

        index++;
      }

      output.push(
        <div
          className="tableWrap"
          key={`table-${index}`}
        >
          <table className="answerTable">
            <thead>
              <tr>
                {headers.map(
                  (cell, cellIndex) => (
                    <th key={cellIndex}>
                      {renderInline(cell)}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {rows.map(
                (row, rowIndex) => (
                  <tr key={rowIndex}>
                    {headers.map(
                      (_, cellIndex) => (
                        <td key={cellIndex}>
                          {renderInline(
                            row[cellIndex] || ""
                          )}
                        </td>
                      )
                    )}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      );

      continue;
    }

    const trimmed = line.trim();

    /* Empty line */

    if (!trimmed) {
      output.push(
        <div
          className="spaceLine"
          key={`space-${index}`}
        />
      );

      index++;
      continue;
    }

    /* Heading */

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
        <Tag key={index}>
          {renderInline(heading[2])}
        </Tag>
      );

      index++;
      continue;
    }

    /* Bullet */

    const bullet = trimmed.match(
      /^[-*•]\s+(.*)$/
    );

    if (bullet) {
      output.push(
        <div
          className="textBullet"
          key={index}
        >
          <span>•</span>
          <span>
            {renderInline(bullet[1])}
          </span>
        </div>
      );

      index++;
      continue;
    }

    /* Numbered list */

    const numbered = trimmed.match(
      /^(\d+)[.)]\s+(.*)$/
    );

    if (numbered) {
      output.push(
        <div
          className="numberedLine"
          key={index}
        >
          <span>
            {numbered[1]}.
          </span>

          <span>
            {renderInline(numbered[2])}
          </span>
        </div>
      );

      index++;
      continue;
    }

    /* Normal paragraph */

    output.push(
      <p key={index}>
        {renderInline(line)}
      </p>
    );

    index++;
  }

  /* Unclosed code block */

  if (codeMode && codeLines.length) {
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

/* =========================
   STREAM PACKET TEXT
========================= */

function extractText(packet) {
  if (!packet) return "";

  if (typeof packet === "string") {
    return packet;
  }

  if (
    typeof packet.reply === "string"
  ) {
    return packet.reply;
  }

  if (
    typeof packet.text === "string"
  ) {
    return packet.text;
  }

  if (
    typeof packet.choices?.[0]
      ?.delta?.content === "string"
  ) {
    return packet.choices[0]
      .delta.content;
  }

  if (
    typeof packet.choices?.[0]
      ?.message?.content === "string"
  ) {
    return packet.choices[0]
      .message.content;
  }

  const parts =
    packet.candidates?.[0]
      ?.content?.parts;

  if (Array.isArray(parts)) {
    return parts
      .map(
        (part) =>
          part?.text || ""
      )
      .join("");
  }

  return "";
}

/* =========================
   MAIN COMPONENT
========================= */

export default function Home() {  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [showComingSoon, setShowComingSoon] =
    useState(false);

  const [notice, setNotice] =
    useState("");

  const [taskMode, setTaskMode] =
    useState("chat");

  const [statusText, setStatusText] =
    useState("");

  const chatAreaRef = useRef(null);
  const inputRef = useRef(null);

  const recognitionRef = useRef(null);
  const abortRef = useRef(null);

  const requestIdRef = useRef(0);
  const loadingRef = useRef(false);

  /*
   * Jab user manually upar scroll kare,
   * ORION usko forcefully neeche nahi bhejega.
   */
  const shouldAutoScrollRef =
    useRef(true);

  /* =========================
     LOADING SYNC
  ========================= */

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  /* =========================
     SMART AUTO SCROLL
  ========================= */

  useEffect(() => {
    const element =
      chatAreaRef.current;

    if (
      !element ||
      !shouldAutoScrollRef.current
    ) {
      return;
    }

    const frame =
      requestAnimationFrame(() => {
        if (
          shouldAutoScrollRef.current &&
          chatAreaRef.current
        ) {
          chatAreaRef.current.scrollTop =
            chatAreaRef.current
              .scrollHeight;
        }
      });

    return () =>
      cancelAnimationFrame(frame);
  }, [messages, statusText]);

  /* =========================
     CLEANUP
  ========================= */

  useEffect(() => {
    return () => {
      abortRef.current?.abort();

      recognitionRef.current?.stop();

      if (
        typeof window !== "undefined" &&
        window.speechSynthesis
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /* =========================
     NEW CHAT
  ========================= */

  const newChat = useCallback(() => {
    abortRef.current?.abort();

    requestIdRef.current += 1;

    loadingRef.current = false;

    setMessages([]);
    setInput("");
    setLoading(false);
    setNotice("");
    setStatusText("");

    setTaskMode("chat");
    setMenuOpen(false);

    shouldAutoScrollRef.current =
      true;
  }, []);

  /* =========================
     STOP GENERATION
  ========================= */

  const stopGeneration =
    useCallback(() => {
      abortRef.current?.abort();
    }, []);

  /* =========================
     UPDATE LAST ASSISTANT
  ========================= */

  function updateLastAssistant(
    content,
    pending = true,
    requestId
  ) {
    if (
      requestId !==
      requestIdRef.current
    ) {
      return;
    }

    setMessages((old) => {
      const updated = [...old];

      const lastIndex =
        updated.length - 1;

      if (
        lastIndex >= 0 &&
        updated[lastIndex].role ===
          "assistant"
      ) {
        updated[lastIndex] = {
          ...updated[lastIndex],
          content,
          pending,
        };
      }

      return updated;
    });
  }

  /* =========================
     HANDLE CHAT SCROLL
  ========================= */

  function handleChatScroll() {
    const element =
      chatAreaRef.current;

    if (!element) return;

    const distanceFromBottom =
      element.scrollHeight -
      element.scrollTop -
      element.clientHeight;

    /*
     * 140px ke andar ho to auto-scroll
     * continue rahega.
     *
     * User agar upar chala gaya,
     * auto-scroll ruk jayega.
     */
    shouldAutoScrollRef.current =
      distanceFromBottom < 140;
  }

  /* =========================
     FOCUS INPUT
  ========================= */

  function focusComposer() {
    inputRef.current?.focus();
  }

  /* =========================
     BASIC HANDLERS
  ========================= */

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

  /* =========================
     ACTIVE TASK
  ========================= */

  const activeTask =
    taskModes.find(
      (mode) =>
        mode.id === taskMode
    ) || taskModes[0];

  const hasMessages =
    messages.length > 0;
      /* =========================
     SEND MESSAGE
  ========================= */

  async function sendMessage(text) {
    const message = String(
      text !== undefined
        ? text
        : input
    ).trim();

    if (
      !message ||
      loadingRef.current
    ) {
      return;
    }

    const activeTaskMode =
      taskMode;

    const requestId =
      ++requestIdRef.current;

    const controller =
      new AbortController();

    abortRef.current =
      controller;

    loadingRef.current = true;

    shouldAutoScrollRef.current =
      true;

    setInput("");
    setNotice("");
    setMenuOpen(false);
    setLoading(true);

    setStatusText(
      activeTaskMode === "agent"
        ? "Request ko samajh raha hoon aur plan bana raha hoon..."
        : "Aapke request ko samajh raha hoon..."
    );

    /*
     * Current conversation ki history
     * API ko bhej rahe hain.
     */
    const history = messages
      .filter(
        (item) =>
          item.role === "user" ||
          item.role === "assistant"
      )
      .filter(
        (item) =>
          String(
            item.content || ""
          ).trim()
      )
      .slice(-14)
      .map((item) => ({
        role: item.role,
        content: String(
          item.content || ""
        ),
      }));

    /*
     * User message + temporary
     * assistant message.
     */
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

    try {
      const response =
        await fetch(
          "/api/chat",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              message,
              taskMode:
                activeTaskMode,

              taskInstruction:
                taskInstructions[
                  activeTaskMode
                ] || "",

              messages: [
                ...history,

                {
                  role: "user",
                  content: message,
                },
              ],
            }),

            signal:
              controller.signal,
          }
        );

      if (!response.ok) {
        let errorMessage =
          `Server error (${response.status})`;

        try {
          const errorData =
            await response.json();

          if (
            errorData?.error
          ) {
            errorMessage =
              String(
                errorData.error
              );
          }
        } catch {
          // Error JSON nahi mila.
        }

        throw new Error(
          errorMessage
        );
      }

      if (!response.body) {
        throw new Error(
          "API ne streaming response nahi diya."
        );
      }

      setStatusText(
        activeTaskMode === "agent"
          ? "Answer prepare ho raha hai..."
          : "ORION jawab taiyar kar raha hai..."
      );

      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder(
          "utf-8"
        );

      let buffer = "";
      let fullReply = "";

      /*
       * SSE stream ke individual
       * events process karne ka function.
       */
      const processEvent =
        (rawEvent) => {
          const event =
            String(
              rawEvent || ""
            ).trim();

          if (!event) {
            return;
          }

          const dataLines =
            event
              .split(/\r?\n/)
              .filter((line) =>
                line.startsWith(
                  "data:"
                )
              )
              .map((line) =>
                line
                  .slice(5)
                  .trim()
              );

          if (
            !dataLines.length
          ) {
            return;
          }

          const payload =
            dataLines.join(
              "\n"
            );

          if (
            !payload ||
            payload === "[DONE]"
          ) {
            return;
          }

          let piece = "";

          try {
            const packet =
              JSON.parse(
                payload
              );

            if (
              packet?.error
            ) {
              throw new Error(
                String(
                  packet.error
                    ?.message ||
                    packet.error
                )
              );
            }

            piece =
              extractText(
                packet
              );
          } catch (error) {
            /*
             * Agar JSON nahi hai,
             * to raw text chunk use karenge.
             */
            if (
              !payload.startsWith(
                "{"
              )
            ) {
              piece =
                payload;
            } else if (
              error instanceof
                Error &&
              error.message
            ) {
              throw error;
            }
          }

          if (!piece) {
            return;
          }

          fullReply += piece;

          updateLastAssistant(
            fullReply,
            true,
            requestId
          );
        };

      /*
       * REAL STREAM READER
       */
      while (true) {
        if (
          controller.signal
            .aborted ||
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

        buffer +=
          decoder.decode(
            value,
            {
              stream: true,
            }
          );

        /*
         * SSE events blank line se
         * separate hote hain.
         */
        const events =
          buffer.split(
            /\r?\n\r?\n/
          );

        /*
         * Last incomplete event
         * buffer mein rakhenge.
         */
        buffer =
          events.pop() || "";

        for (
          const event of events
        ) {
          if (
            controller.signal
              .aborted ||
            requestId !==
              requestIdRef.current
          ) {
            break;
          }

          processEvent(event);
        }
      }

      /*
       * Decoder ka remaining data.
       */
      buffer +=
        decoder.decode();

      if (
        buffer.trim() &&
        !controller.signal
          .aborted &&
        requestId ===
          requestIdRef.current
      ) {
        processEvent(buffer);
      }

      /*
       * Agar response plain text
       * format mein aaya ho.
       */
      if (
        !fullReply.trim() &&
        buffer.trim()
      ) {
        const fallback =
          buffer.trim();

        if (
          fallback &&
          fallback !== "[DONE]"
        ) {
          try {const packet =
              JSON.parse(
                fallback
              );

            fullReply =
              extractText(
                packet
              );
          } catch {
            fullReply =
              fallback;
          }
        }
      }

      if (
        controller.signal
          .aborted ||
        requestId !==
          requestIdRef.current
      ) {
        return;
      }

      if (
        !fullReply.trim()
      ) {
        throw new Error(
          "AI se khaali response mila. API key aur route check karein."
        );
      }

      /*
       * Final answer ko pending
       * state se hata denge.
       */
      updateLastAssistant(
        fullReply,
        false,
        requestId
      );

      setStatusText("");

    } catch (error) {

      if (
        requestId !==
        requestIdRef.current
      ) {
        return;
      }

      /*
       * User ne Stop dabaya.
       */
      if (
        error?.name ===
          "AbortError" ||
        controller.signal.aborted
      ) {
        setMessages(
          (old) =>
            old.map(
              (
                item,
                index
              ) =>
                index ===
                  old.length - 1 &&
                item.role ===
                  "assistant"
                  ? {
                      ...item,
                      pending:
                        false,
                    }
                  : item
            )
        );

        setStatusText("");

      } else {

        updateLastAssistant(
          `⚠️ ${
            error?.message ||
            "Kuch galat ho gaya. Dobara try karein."
          }`,
          false,
          requestId
        );

        setStatusText("");
      }

    } finally {

      if (
        requestId ===
        requestIdRef.current
      ) {
        loadingRef.current =
          false;

        setLoading(false);

        abortRef.current =
          null;

        setStatusText("");
      }
    }
  }  /* =========================
     VOICE INPUT
  ========================= */

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

    /*
     * Agar already listening hai,
     * button dobara dabane par stop.
     */
    if (recognitionRef.current) {
      recognitionRef.current.stop();

      recognitionRef.current =
        null;

      setListening(false);

      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang =
      "hi-IN";

    recognition.continuous =
      false;

    recognition.interimResults =
      true;

    recognition.onstart =
      () => {
        setListening(true);
        setNotice("");
      };

    recognition.onresult =
      (event) => {
        let transcript = "";

        for (
          let i =
            event.resultIndex;
          i <
            event.results.length;
          i++
        ) {
          transcript +=
            event.results[i][0]
              .transcript;
        }

        setInput(
          transcript
        );
      };

    recognition.onerror =
      () => {
        setListening(false);

        recognitionRef.current =
          null;

        setNotice(
          "Voice input mein dikkat aayi. Dobara try karein."
        );
      };

    recognition.onend =
      () => {
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

  /* =========================
     TEXT TO SPEECH
  ========================= */

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

    utterance.lang =
      "hi-IN";

    utterance.rate =
      0.95;

    utterance.pitch = 1;

    window.speechSynthesis.speak(
      utterance
    );
  }

  /* =========================
     COPY ANSWER
  ========================= */

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(
        String(text || "")
      );

      setNotice(
        "Jawab copy ho gaya!"
      );

      setTimeout(() => {
        setNotice("");
      }, 2200);

    } catch {
      setNotice(
        "Copy nahi hua. Text ko select karke copy karein."
      );
    }
  }

  /* =========================
     SUBMIT
  ========================= */

  function handleSubmit(event) {
    event?.preventDefault();

    sendMessage();
  }

  /* =========================
     ENTER KEY
  ========================= */

  function handleKeyDown(event) {
    /*
     * Enter = Send
     * Shift + Enter = New line
     */
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  }

  /* =========================
     CLOSE NOTICE
  ========================= */

  function closeNotice() {
    setNotice("");
  }

  /* =========================
     SELECT TASK
  ========================= */

  function selectTask(mode) {
    setTaskMode(mode);
    setMenuOpen(false);

    /*
     * User task select kare to
     * input automatically focus.
     */
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  /* =========================
     QUICK PROMPT
  ========================= */

  function useSuggestion(prompt) {
    setInput(prompt);

    requestAnimationFrame(()=> {
      inputRef.current?.focus();
    });
  }

  /* =========================
     MODAL
  ========================= */

  function openComingSoon() {
    setMenuOpen(false);
    setShowComingSoon(true);
  }

  function closeComingSoon() {
    setShowComingSoon(false);
  }

  /* =========================
     SAFE MESSAGE TEXT
  ========================= */

  const lastMessage =
    messages[
      messages.length - 1
    ];

  const isGenerating =
    loading &&
    lastMessage?.role ===
      "assistant";  return (
    <main className="page">

      {/* =========================
          AMBIENT BACKGROUND
      ========================= */}

      <div className="ambientGlow ambientGlowOne" />
      <div className="ambientGlow ambientGlowTwo" />

      {/* =========================
          HEADER
      ========================= */}

      <header className="header">

        <button
          type="button"
          className="brandButton"
          onClick={newChat}
          aria-label="ORION AI home"
        >
          <span className="logoMark">
            <span className="logoStar">
              ✦
            </span>
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

          {/* New Chat */}

          <button
            type="button"
            className="roundButton"
            onClick={newChat}
            title="New chat"
            aria-label="New chat"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>

          {/* Menu */}

          <button
            type="button"
            className="roundButton"
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
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
          </button>

        </div>
      </header>

      {/* =========================
          MENU
      ========================= */}

      {menuOpen && (
        <div className="menuPanel">

          <button
            type="button"
            className="menuItem"
            onClick={newChat}
          >
            <span>＋</span>
            <span>New chat</span>
          </button>

          <button
            type="button"
            className="menuItem"
            onClick={openComingSoon}
          >
            <span>✧</span>
            <span>More features</span>
          </button>

          <div className="menuCredit">
            ORION AI · Powered by Dharm AI
          </div>

        </div>
      )}

      {/* =========================
          CHAT AREA
      ========================= */}

      <section
        ref={chatAreaRef}
        className={`chatArea ${
          hasMessages
            ? "chatAreaActive"
            : "chatAreaHome"
        }`}
        onScroll={handleChatScroll}
      >

        {/* =========================
            HOME SCREEN
        ========================= */}

        {!hasMessages ? (

          <div className="homeScreen">

            {/* ORION LOGO */}

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

            {/* STATUS */}

            <div className="heroEyebrow">

              <span className="statusDot" />

              YOUR AI COMPANION

            </div>

            {/* TITLE */}

            <h1 className="heroTitle">
              Hello,{" "}
              <span>Explorer.</span>
            </h1>

            {/* DESCRIPTION */}

            <p className="heroDescription">
              Main ORION AI hoon.
              Aapke sawalon, ideas,
              padhai, kaam aur naye
              projects mein madad ke
              liye taiyar.
            </p>

            {/* CREATOR CREDIT */}

            <div className="creditLine">
              ORION AI
              <span>·</span>
            <strong>
                Powered by Dharm AI
              </strong>
            </div>

            {/* =========================
                TASK MODES
            ========================= */}

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
                      onClick={() =>
                        selectTask(
                          mode.id
                        )
                      }
                    >

                      <span className="taskIcon">
                        {mode.icon}
                      </span>

                      <span className="taskText">

                        <span className="taskTitle">
                          {mode.title}
                        </span>

                        <span className="taskDescription">
                          {mode.description}
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

            {/* =========================
                QUICK SUGGESTIONS
            ========================= */}

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
                      type="button"
                      key={item.title}
                      className="suggestionCard"
                      onClick={() =>
                        useSuggestion(
                          item.prompt
                        )
                      }
                    >

                      <span className="suggestionIcon">
                        {item.icon}
                      </span>

                      <span className="suggestionTitleText">
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

          /* =========================
             MESSAGES
          ========================= */

          <div className="messagesContainer">

            {messages.map(
              (message, index) => (

                <article
                  key={`${message.role}-${index}`}
                  className={`messageRow ${
                    message.role ===
                    "user"
                      ? "userMessageRow"
                      : "assistantMessageRow"
                  }`}
                >

                  {/* ORION AVATAR */}

                  {message.role ===
                    "assistant" && (
                    <div className="assistantAvatar">
                      ✦
                    </div>
                  )}

                  <div className="messageMain">

                    {/* LABEL */}

                    <div className="messageLabel">

                      {message.role ===
                      "user"
                        ? "You"
                        : "ORION AI"}

                      {message.role ===
                        "assistant" && (
                        <span className="assistantBadge">
                          AI
                        </span>
                      )}

                    </div>

                    {/* MESSAGE */}

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

                    {/* =========================
                        ANSWER ACTIONS
                    ========================= */}

                    {message.role ===
                      "assistant" &&
                      message.content && (
                        <div className="messageTools">

                          <button
                            type="button"
                            className="toolButton"
                            onClick={() =>
                              copyText(
                                message.content
                              )
                            }
                          >
                            <span>
                              ▢
                            </span>
                            Copy
                          </button>

                          <button
                            type="button"
                            className="toolButton"
                            onClick={() =>
                              speak(
                                message.content
                              )
                            }
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

            {/* GENERATION STATUS */}

            {loading && (
              <div className="generationStatus">

                <div className="statusSpinner">
                  <span />
                  <span />
                  <span />
                </div>

                <span>
                  {statusText ||
                    "ORION jawab taiyar kar raha hai..."}
                </span>

              </div>
            )}

          </div>
        )}

      </section>
      {/* =========================
          BOTTOM COMPOSER
      ========================= */}

      <footer className="bottomArea">

        {/* =========================
            NOTICE
        ========================= */}

        {notice && (
          <button
            type="button"
            className="noticeBar"
            onClick={closeNotice}
          >
            <span>{notice}</span>
            <span>×</span>
          </button>
        )}

        {/* =========================
            ACTIVE TASK
        ========================= */}

        <div className="composerOuter">

          {taskMode !== "chat" &&
            !hasMessages && (
              <div className="activeTaskLabel">

                <span>
                  {activeTask.icon}
                </span>

                <span>
                  {activeTask.title}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setTaskMode("chat")
                  }
                  aria-label="Remove task"
                >
                  ×
                </button>

              </div>
            )}

          {/* =========================
              INPUT BOX
          ========================= */}

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
              onKeyDown={
                handleKeyDown
              }
              placeholder={
                taskMode === "agent"
                  ? "ORION Agent ko task dein..."
                  : "ORION se kuch bhi poochhein..."
              }
              rows={1}
              aria-label="Message"
            />

            {/* =========================
                INPUT ACTIONS
            ========================= */}

            <div className="inputActions">

              {/* LEFT */}

              <div className="inputLeftActions">

                <button
                  type="button"
                  className="inputIconButton"
                  onClick={
                    openComingSoon
                  }
                  title="More features"
                  aria-label="More features"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                </button>

                <span className="inputHint">
                  Shift + Enter for new line
                </span>

              </div>

              {/* RIGHT */}

              <div className="inputRightActions">

                {/* MICROPHONE */}

                <button
                  type="button"
                  className={`voiceButton ${
                    listening
                      ? "voiceButtonActive"
                      : ""
                  }`}
                  onClick={
                    startVoice
                  }
                  title={
                    listening
                      ? "Voice band karein"
                      : "Voice input"
                  }
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

                {/* =========================
                    STOP / SEND
                ========================= */}

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
                      <path d="M12 19V5" />
                      <path d="M5 12l7-7 7 7" />
                    </svg>
                  </button>

                )}

              </div>

            </div>

          </form>

        </div>

        {/* =========================
            CLEAN CREATOR CREDIT
            NO DISCLAIMER
        ========================= */}

        <div className="footerCredit">

          <span className="footerStar">
            ✦
          </span>

          <span>
            ORION AI
          </span>

          <span className="footerSeparator">
            ·
          </span>

          <strong>
            Powered by Dharm AI
          </strong>

        </div>

      </footer>

      {/* =========================
          COMING SOON MODAL
      ========================= */}

      {showComingSoon && (
        <div
          className="modalBackdrop"
          onClick={
            closeComingSoon
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
              onClick={
                closeComingSoon
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
              ORION AI ke naye
              features par kaam
              chal raha hai.
              Filhaal aap chat,
              Agent mode, voice
              input, copy aur
              text-to-speech ka
              istemal kar sakte hain.
            </p>

            <button
              type="button"
              className="modalPrimary"
              onClick={
                closeComingSoon
              }
            >
              Samajh gaya
            </button>

          </div>

        </div>
      )}
    {/* =========================
        ORION AI GLOBAL STYLES
    ========================= */}

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
        font-family:
          Inter,
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
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
        width: 100%;
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

      /* =========================
         HEADER
      ========================= */

      .header {
        height: 76px;
        flex: 0 0 76px;

        width: 100%;

        display: flex;
        align-items: center;
        justify-content: space-between;

        gap: 12px;
        padding: 0 24px;

        background:
          rgba(255, 255, 255, 0.9);

        border-bottom:
          1px solid #e4edf9;

        backdrop-filter:
          blur(18px);

        position: relative;
        z-index: 20;

        box-shadow:
          0 3px 18px
          rgba(37, 86, 145, 0.035);
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

        background:
          linear-gradient(
            140deg,
            #eff8ff,
            #dcecff
          );

        border:
          1px solid #b6d9ff;

        color: #0876ec;

        box-shadow:
          0 0 18px
          rgba(43, 142, 255, 0.17),

          inset 0 0 12px
          rgba(255, 255, 255, 0.9);
      }

      .logoStar {
        font-size: 27px;

        text-shadow:
          0 0 12px
          rgba(20, 142, 255, 0.6);
      }

      .brandText {
        display: flex;
        flex-direction: column;
        gap: 3px;

        min-width: 0;
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

        border:
          1px solid #dce8f7;

        border-radius: 13px;

        background: #fff;
        color: #35618e;

        cursor: pointer;

        transition:
          0.2s ease;
      }

      .roundButton:hover {
        color: #0879ed;

        border-color:
          #8dc5ff;

        box-shadow:
          0 0 16px
          rgba(32, 140, 255, 0.14);

        transform:
          translateY(-1px);
      }

      .roundButton svg,
      .inputIconButton svg,
      .voiceButton svg,
      .sendButton svg {
        width: 20px;
        height: 20px;

        fill: none;

        stroke:
          currentColor;

        stroke-width: 1.8;

        stroke-linecap: round;
        stroke-linejoin: round;
      }

      /* =========================
         MENU
      ========================= */

      .menuPanel {
        position: absolute;

        top: 66px;
        right: 22px;

        z-index: 50;

        width: 230px;

        padding: 9px;

        border-radius: 17px;

        background:
          rgba(255, 255, 255, 0.98);

        border:
          1px solid #dce8f8;

        box-shadow:
          0 15px 45px
          rgba(26, 68, 120, 0.15);
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

        background:
          transparent;

        color: #294668;

        cursor: pointer;

        transition:
          0.18s ease;
      }

      .menuItem:hover {
        background: #eff7ff;
        color: #0879ed;
      }

      .menuCredit {
        border-top:
          1px solid #e7eef8;

        margin-top: 6px;

        padding:
          12px 7px 5px;

        color: #8192aa;

        font-size: 10px;

        text-align: center;
      }

      /* =========================
         CHAT AREA
      ========================= */

      .chatArea {
        flex: 1 1 auto;

        min-height: 0;

        overflow-y: auto;
        overflow-x: hidden;

        overscroll-behavior:
          contain;

        scrollbar-width:
          thin;

        scrollbar-color:
          #c5d9ef
          transparent;

        position: relative;
        z-index: 1;

        scroll-behavior:
          auto;
      }

      .chatArea::-webkit-scrollbar {
        width: 6px;
      }

      .chatArea::-webkit-scrollbar-thumb {
        background:
          #c5d9ef;

        border-radius:
          8px;
      }

      .homeScreen {
        min-height: 100%;

        display: flex;
        flex-direction: column;

        align-items: center;
        justify-content: center;

        text-align: center;

        padding:
          32px 18px;

        gap: 18px;
      }

      /* =========================
         HERO
      ========================= */

      .heroLogo {
        width: 92px;
        height: 92px;

        position: relative;

        display: grid;
        place-items: center;

        border-radius: 28px;

        color: #fff;

        background:
          linear-gradient(
            135deg,
            #1687ff,
            #00d4ff
          );

        box-shadow:
          0 0 30px
          rgba(0, 174, 255, 0.38);

        border:
          1px solid
          rgba(255, 255, 255, 0.65);

        animation:
          heroPulse 3.5s
          ease-in-out infinite;
      }

      .heroLogoCore {
        position: relative;
        z-index: 2;

        font-size: 42px;
        font-weight: 900;

        text-shadow:
          0 0 18px
          rgba(255, 255, 255, 0.75);
      }

      .heroOrbit {
        position: absolute;

        border:
          1px solid
          rgba(255, 255, 255, 0.45);

        border-radius: 50%;

        pointer-events: none;
      }

      .heroOrbitOne {
        width: 116px;
        height: 52px;

        transform:
          rotate(28deg);
      }

      .heroOrbitTwo {
        width: 52px;
        height: 116px;

        transform:
          rotate(28deg);
      }

      @keyframes heroPulse {
        0%,
        100% {
          box-shadow:
            0 0 25px
            rgba(0, 174, 255, 0.3);
        }

        50% {
          box-shadow:
            0 0 42px
            rgba(0, 174, 255, 0.5);
        }
      }

      .heroEyebrow {
        display: inline-flex;

        align-items: center;

        gap: 7px;

        color: #5e7895;

        font-size: 10px;

        font-weight: 800;

        letter-spacing:
          1.8px;
      }

      .statusDot {
        width: 7px;
        height: 7px;

        border-radius: 50%;

        background:
          #16b97a;

        box-shadow:
          0 0 9px
          rgba(22, 185, 122, 0.6);
      }

      .heroTitle {
        margin: 0;

        font-size:
          clamp(28px, 5vw, 42px);

        font-weight: 850;

        letter-spacing:
          -1px;

        color: #102d50;
      }

      .heroTitle span {
        color: #1384ef;

        text-shadow:
          0 0 16px
          rgba(19, 132, 239, 0.12);
      }

      .heroDescription {
        max-width: 560px;

        margin: 0;

        color: #66809d;

        font-size: 14px;

        line-height: 1.7;
      }

      .creditLine {
        display: inline-flex;

        align-items: center;

        gap: 7px;

        color: #1687df;

        font-size: 11px;

        font-weight: 800;

        letter-spacing:
          0.5px;
      }

      .creditLine strong {
        color: #0d67b7;
      }

      /* =========================
         TASKS
      ========================= */

      .taskSection,
      .suggestionSection {
        width: 100%;
        max-width: 700px;
      }

      .sectionHeading {
        display: flex;

        align-items: center;
        justify-content: space-between;

        margin-bottom: 9px;

        color: #56718f;

        font-size: 11px;
        font-weight: 800;

        letter-spacing:
          0.7px;
      }

      .sectionHint {
        color: #9aaabd;

        font-size: 9px;

        letter-spacing:
          1px;
      }

      .taskGrid {
        display: grid;

        grid-template-columns:
          repeat(
            3,
            minmax(0, 1fr)
          );

        gap: 9px;
      }

      .taskModeCard {
        min-width: 0;

        display: flex;

        align-items: center;

        gap: 8px;

        padding: 10px;

        border:
          1px solid #dceafa;

        border-radius: 14px;

        background:
          rgba(
            255,
            255,
            255,
            0.84
          );

        color: #244362;

        text-align: left;

        cursor: pointer;

        transition:
          0.2s ease;
      }

      .taskModeCard:hover,
      .taskModeSelected {
        border-color:
          #69bdff;

        background:
          #f7fcff;

        box-shadow:
          0 5px 20px
          rgba(
            0,
            139,
            255,
            0.1
          );

        transform:
          translateY(-1px);
      }

      .taskIcon {
        width: 30px;
        height: 30px;

        flex: 0 0 30px;

        display: grid;
        place-items: center;

        border-radius: 9px;

        background:
          #eef7ff;

        font-size: 15px;
      }

      .taskText {
        min-width: 0;

        display: flex;
        flex-direction: column;

        gap: 2px;
      }

      .taskTitle {
        color: #245078;

        font-size: 11px;

        font-weight: 800;
      }

      .taskDescription {
        color: #8196ac;

        font-size: 9px;

        line-height: 1.35;

        white-space: nowrap;
        overflow: hidden;
        text-overflow:
          ellipsis;
      }

      .taskArrow {
        margin-left: auto;

        color: #8da5bc;

        font-size: 14px;
      }

      /* =========================
         SUGGESTIONS
      ========================= */

      .suggestionGrid {
        display: grid;

        grid-template-columns:
          repeat(
            3,
            minmax(0, 1fr)
          );

        gap: 8px;
      }

      .suggestionCard {
        min-width: 0;

        display: flex;

        align-items: center;

        gap: 7px;

        padding:
          9px 10px;

        border:
          1px solid #dceafa;

        border-radius: 12px;

        background:
          rgba(
            255,
            255,
            255,
            0.86
          );

        color: #355574;

        text-align: left;

        cursor: pointer;

        transition:
          0.2s ease;

        font-size: 11px;
      }

      .suggestionCard:hover {
        border-color:
          #55baff;

        box-shadow:
          0 5px 22px
          rgba(
            0,
            139,
            255,
            0.12
          );

        transform:
          translateY(-1px);
      }

      .suggestionIcon {
        color: #1687df;

        font-weight: 900;
      }

      .suggestionTitleText {
        min-width: 0;

        overflow: hidden;

        white-space: nowrap;

        text-overflow:
          ellipsis;
      }

      .suggestionArrow {
        margin-left: auto;

        color: #9aadc0;
      }    .messagesContainer {
      width: 100%;
      max-width: 920px;
      margin: 0 auto;
      padding: 26px 20px 18px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .messageRow {
      width: 100%;
      display: flex;
      animation: messageIn 0.22s ease;
    }

    .userMessageRow {
      justify-content: flex-end;
    }

    .assistantMessageRow {
      justify-content: flex-start;
    }

    .assistantAvatar {
      width: 34px;
      height: 34px;
      min-width: 34px;
      border-radius: 12px;
      margin-right: 10px;
      margin-top: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 900;
      color: #ffffff;
      background: linear-gradient(135deg, #1687ff, #7b4dff);
      box-shadow:
        0 6px 18px rgba(35, 123, 255, 0.22),
        0 0 18px rgba(96, 91, 255, 0.16);
      flex-shrink: 0;
    }

    .messageMain {
      min-width: 0;
      max-width: min(820px, calc(100% - 44px));
    }

    .userMessageRow .messageMain {
      max-width: min(760px, 88%);
    }

    .messageLabel {
      display: flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 7px;
      padding-left: 3px;
      font-size: 11px;
      line-height: 1;
      color: #7690a8;
      font-weight: 800;
      letter-spacing: 0.02em;
    }

    .assistantBadge {
      padding: 4px 7px;
      border-radius: 7px;
      color: #2b6fb0;
      background: #edf7ff;
      border: 1px solid #d9ecfb;
      font-size: 10px;
      font-weight: 900;
    }

    .messageBubble {
      border-radius: 18px;
      padding: 14px 16px;
      font-size: 15px;
      line-height: 1.72;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .userBubble {
      color: #183b5c;
      background: linear-gradient(135deg, #eef7ff, #f5f1ff);
      border: 1px solid #dceafa;
      border-bottom-right-radius: 6px;
      box-shadow: 0 5px 18px rgba(53, 104, 154, 0.07);
    }

    .assistantBubble {
      color: #243f58;
      background: #ffffff;
      border: 1px solid #e1edf6;
      border-top-left-radius: 6px;
      box-shadow: 0 6px 22px rgba(48, 91, 128, 0.06);
    }

    .assistantBubble p {
      margin: 0 0 10px;
    }

    .assistantBubble p:last-child {
      margin-bottom: 0;
    }

    .assistantBubble h1,
    .assistantBubble h2,
    .assistantBubble h3 {
      margin: 14px 0 8px;
      color: #173b5d;
      line-height: 1.3;
    }

    .assistantBubble h1 {
      font-size: 22px;
    }

    .assistantBubble h2 {
      font-size: 19px;
    }

    .assistantBubble h3 {
      font-size: 17px;
    }

    .assistantBubble strong {
      color: #163d61;
      font-weight: 800;
    }

    .assistantBubble em {
      color: #466681;
    }

    .textBullet {
      position: relative;
      padding-left: 19px;
      margin: 5px 0;
    }

    .textBullet::before {
      content: "•";
      position: absolute;
      left: 4px;
      top: 0;
      color: #397fd1;
      font-weight: 900;
    }

    .numberedLine {
      margin: 6px 0;
      padding-left: 2px;
    }

    .spaceLine {
      height: 6px;
    }

    .codeBlock {
      width: 100%;
      margin: 12px 0;
      padding: 13px;
      overflow-x: auto;
      border-radius: 12px;
      background: #f5f8fb;
      border: 1px solid #dce8f1;
      color: #26445f;
      font-family:
        ui-monospace,
        SFMono-Regular,
        Menlo,
        Monaco,
        Consolas,
        monospace;
      font-size: 12px;
      line-height: 1.65;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .tableWrap {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin: 12px 0;
      border-radius: 12px;
      border: 1px solid #dce9f4;
    }

    .answerTable {
      width: 100%;
      min-width: 560px;
      border-collapse: collapse;
      font-size: 12px;
    }

    .answerTable th,
    .answerTable td {
      min-width: 120px;
      padding: 9px 10px;
      border: 1px solid #cfe1f4;
      text-align: left;
      vertical-align: top;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    .answerTable th {
      background: #eef7ff;
      color: #244b70;
      font-weight: 800;
    }

    .answerTable td {
      background: #ffffff;
      color: #294766;
    }

    .typingCursor {
      display: inline-block;
      width: 7px;
      height: 17px;
      margin-left: 3px;
      vertical-align: -3px;
      border-radius: 2px;
      background: #3988d8;
      animation: cursorBlink 0.9s infinite;
    }

    .thinkingIndicator {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-height: 20px;
    }

    .thinkingIndicator span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #6596bd;
      animation: thinkingDot 1.1s infinite ease-in-out;
    }

    .thinkingIndicator span:nth-child(2) {
      animation-delay: 0.15s;
    }

    .thinkingIndicator span:nth-child(3) {
      animation-delay: 0.3s;
    }

    .messageTools {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 7px;
      padding-left: 2px;
    }

    .toolButton {
      width: 30px;
      height: 28px;
      border: 1px solid #dfebf4;
      border-radius: 8px;
      background: #ffffff;
      color: #6d879e;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 13px;
      transition:
        transform 0.16s ease,
        background 0.16s ease,
        color 0.16s ease;
    }

    .toolButton:hover {
      transform: translateY(-1px);
      background: #f1f8ff;
      color: #2879bd;
    }

    .generationStatus {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 auto 10px;
      width: fit-content;
      max-width: calc(100% - 32px);
      padding: 7px 11px;
      border-radius: 999px;
      color: #5e7c96;
      background: rgba(245, 250, 255, 0.95);
      border: 1px solid #dfeef8;
      font-size: 11px;
      font-weight: 700;
      box-shadow: 0 4px 14px rgba(58, 105, 143, 0.05);
    }

    .statusSpinner {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid #d8e9f6;
      border-top-color: #3988d8;
      animation: spin 0.8s linear infinite;
    }

    .bottomArea {
      flex-shrink: 0;
      width: 100%;
      padding: 8px 16px 12px;
      background:
        linear-gradient(
          to top,
          rgba(255, 255, 255, 1) 65%,
          rgba(255, 255, 255, 0.92) 100%
        );
    }

    .noticeBar {
      width: min(760px, 100%);
      margin: 0 auto 7px;
      padding: 7px 11px;
      border-radius: 10px;
      background: #f2f8fd;
      border: 1px solid #dcecf7;
      color: #58738a;
      font-size: 11px;
      line-height: 1.45;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .noticeClose {
      border: 0;
      background: transparent;
      color: #7893a9;
      cursor: pointer;
      font-size: 15px;
      padding: 0 2px;
    }

    .composerOuter {
      width: min(900px, 100%);
      margin: 0 auto;
    }

    .activeTaskLabel {
      display: flex;
      align-items: center;
      gap: 7px;
      margin: 0 0 6px 4px;
      color: #68839a;
      font-size: 11px;
      font-weight: 800;
    }

    .activeTaskDot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #4b91d0;
      box-shadow: 0 0 9px rgba(75, 145, 208, 0.45);
    }

    .inputBox {
      width: 100%;
      min-height: 58px;
      display: flex;
      align-items: flex-end;
      gap: 7px;
      padding: 8px;
      border: 1px solid #d7e6f1;
      border-radius: 18px;
      background: #ffffff;
      box-shadow:
        0 8px 30px rgba(40, 88, 127, 0.08),
        0 0 0 1px rgba(255, 255, 255, 0.9) inset;
      transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease;
    }

    .inputBox:focus-within {
      border-color: #a8cdea;
      box-shadow:
        0 8px 30px rgba(40, 88, 127, 0.09),
        0 0 0 3px rgba(69, 145, 211, 0.08);
    }

    .inputBox textarea {
      flex: 1;
      min-width: 0;
      max-height: 150px;
      min-height: 38px;
      resize: none;
      border: 0;
      outline: 0;
      background: transparent;
      color: #203e58;
      font-family: inherit;
      font-size: 15px;
      line-height: 1.5;
      padding: 8px 3px;
    }

    .inputBox textarea::placeholder {
      color: #9aafbf;
    }

    .inputActions {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 6px;
      width: 100%;
    }

    .inputLeftActions {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-shrink: 0;
    }

    .inputRightActions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .inputIconButton,
    .voiceButton,
    .sendButton,
    .stopButton {
      border: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition:
        transform 0.16s ease,
        box-shadow 0.16s ease,
        background 0.16s ease;
    }

    .inputIconButton {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: #f2f7fb;
      color: #658198;
      font-size: 17px;
      border: 1px solid #e0ebf3;
    }

    .inputIconButton:hover {
      background: #e9f4fc;
      color: #367fb9;
    }

    .inputHint {
      position: absolute;
      pointer-events: none;
      opacity: 0;
      font-size: 1px;
    }

    .voiceButton {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: #f0f6fb;
      color: #55748d;
      border: 1px solid #dce9f2;
      font-size: 17px;
    }

    .voiceButton:hover {
      transform: translateY(-1px);
      background: #e9f5ff;
      color: #287ab8;
    }

    .voiceButtonActive {
      background: #eaf4ff;
      color: #277fc4;
      box-shadow: 0 0 0 3px rgba(39, 127, 196, 0.08);
    }

    .sendButton {
      width: 40px;
      height: 40px;
      border-radius: 13px;
      color: #ffffff;
      background: linear-gradient(135deg, #318ee0, #7258e8);
      box-shadow: 0 6px 16px rgba(76, 111, 213, 0.2);
      font-size: 17px;
    }

    .sendButton:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 8px 19px rgba(76, 111, 213, 0.26);
    }

    .sendButton:disabled {
      opacity: 0.42;
      cursor: default;
      box-shadow: none;
    }

    .stopButton {
      width: 40px;
      height: 40px;
      border-radius: 13px;
      color: #ffffff;
      background: #536d83;
      box-shadow: 0 6px 16px rgba(67, 91, 110, 0.17);
    }

    .stopButton:hover {
      transform: translateY(-1px);
      background: #405b71;
    }

    .stopSquare {
      width: 13px;
      height: 13px;
      border-radius: 3px;
      background: #ffffff;
    }

    .footerCredit {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding-top: 8px;
      color: #8aa0b1;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.02em;
    }

    .footerStar {
      color: #5598d2;
      font-size: 10px;
    }

    .footerSeparator {
      color: #c3d2dd;
    }

    .modalBackdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(21, 48, 70, 0.28);
      backdrop-filter: blur(7px);
      -webkit-backdrop-filter: blur(7px);
      animation: fadeIn 0.18s ease;
    }

    .modalCard {
      width: min(390px, 100%);
      padding: 22px;
      border-radius: 22px;
      background: #ffffff;
      border: 1px solid #deebf4;
      box-shadow: 0 25px 80px rgba(27, 64, 92, 0.2);
      position: relative;
      text-align: center;
    }

    .modalClose {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: 9px;
      background: #f2f7fb;
      color: #70879a;
      cursor: pointer;
      font-size: 18px;
    }

    .modalIcon {
      width: 56px;
      height: 56px;
      margin: 3px auto 12px;
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 25px;
      background: linear-gradient(135deg, #2f91df, #7956e8);
      box-shadow: 0 10px 26px rgba(77, 113, 216, 0.2);
    }

    .modalCard h3 {
      margin: 0 0 7px;
      color: #1d405f;
      font-size: 20px;
    }

    .modalCard p {
      margin: 0 0 16px;
      color: #6d8497;
      font-size: 13px;
      line-height: 1.6;
    }

    .modalPrimary {
      width: 100%;
      height: 42px;
      border: 0;
      border-radius: 12px;
      cursor: pointer;
      color: #ffffff;
      font-weight: 800;
      background: linear-gradient(135deg, #318ee0, #7258e8);
    }

    @keyframes messageIn {
      from {
        opacity: 0;
        transform: translateY(5px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
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

    @keyframes thinkingDot {
      0%,
      60%,
      100% {
        transform: translateY(0);
        opacity: 0.45;
      }

      30% {
        transform: translateY(-3px);
        opacity: 1;
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }

      to {
        opacity: 1;
      }
    }

    @media (max-width: 760px) {
      .page {
        height: 100dvh;
      }

      .header {
        height: 58px;
        padding: 8px 10px;
      }

      .brandLogo {
        width: 35px;
        height: 35px;
        border-radius: 11px;
      }

      .brandName {
        font-size: 18px;
      }

      .brandTagline {
        font-size: 9px;
      }

      .headerButton {
        width: 34px;
        height: 34px;
        border-radius: 10px;
      }

      .chatArea {
        padding-bottom: 0;
      }

      .homeScreen {
        min-height: auto;
        padding: 24px 14px 18px;
      }

      .heroLogo {
        width: 70px;
        height: 70px;
        border-radius: 22px;
      }

      .heroTitle {
        font-size: 30px;
      }

      .heroDescription {
        font-size: 13px;
        max-width: 340px;
      }

      .heroCredit {
        font-size: 10px;
      }

      .taskGrid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 7px;
      }

      .taskModeCard {
        min-height: 73px;
        padding: 10px;
        border-radius: 13px;
      }

      .taskIcon {
        width: 28px;
        height: 28px;
        border-radius: 9px;
        font-size: 13px;
      }

      .taskText strong {
        font-size: 11px;
      }

      .taskText span {
        font-size: 8px;
      }

      .suggestionGrid {
        grid-template-columns: 1fr 1fr;
        gap: 7px;
      }

      .suggestionCard {
        min-height: 54px;
        padding: 8px 9px;
        border-radius: 12px;
        font-size: 10px;
      }

      .messagesContainer {
        padding: 18px 10px 12px;
        gap: 18px;
      }

      .messageMain {
        max-width: calc(100% - 42px);
      }

      .userMessageRow .messageMain {
        max-width: 92%;
      }

      .assistantAvatar {
        width: 31px;
        height: 31px;
        min-width: 31px;
        border-radius: 10px;
        margin-right: 8px;
        font-size: 14px;
      }

      .messageBubble {
        padding: 12px 13px;
        border-radius: 15px;
        font-size: 14px;
        line-height: 1.65;
      }

      .messageLabel {
        font-size: 10px;
      }

      .assistantBadge {
        padding: 3px 6px;
        font-size: 9px;
      }

      .assistantBubble h1 {
        font-size: 19px;
      }

      .assistantBubble h2 {
        font-size: 17px;
      }

      .assistantBubble h3 {
        font-size: 15px;
      }

      .codeBlock {
        font-size: 11px;
        padding: 10px;
      }

      .tableWrap {
        margin-left: -3px;
        width: calc(100% + 6px);
      }

      .answerTable {
        font-size: 11px;
        min-width: 520px;
      }

      .answerTable th,
      .answerTable td {
        min-width: 105px;
        padding: 7px 8px;
      }

      .messageTools {
        margin-top: 5px;
      }

      .toolButton {
        width: 28px;
        height: 26px;
      }

      .bottomArea {
        padding: 6px 9px 8px;
      }

      .noticeBar {
        margin-bottom: 5px;
        font-size: 10px;
      }

      .activeTaskLabel {
        margin-left: 3px;
        font-size: 10px;
      }

      .inputBox {
        min-height: 54px;
        padding: 6px;
        border-radius: 16px;
      }

      .inputBox textarea {
        font-size: 14px;
        min-height: 36px;
        padding: 7px 2px;
      }

      .inputIconButton {
        width: 32px;
        height: 32px;
      }

      .voiceButton,
      .sendButton,
      .stopButton {
        width: 36px;
        height: 36px;
        border-radius: 11px;
      }

      .voiceButton {
        font-size: 15px;
      }

      .sendButton {
        font-size: 15px;
      }

      .stopSquare {
        width: 12px;
        height: 12px;
      }

      .footerCredit {
        padding-top: 6px;
        font-size: 9px;
      }

      .menuPanel {
        top: 52px;
        right: 9px;
        width: min(270px, calc(100vw - 18px));
      }
    }

    @media (max-width: 420px) {
      .brandTagline {
        display: none;
      }

      .heroTitle {
        font-size: 27px;
      }

      .heroLogo {
        width: 64px;
        height: 64px;
      }

      .taskGrid {
        grid-template-columns: 1fr 1fr;
      }

      .suggestionGrid {
        grid-template-columns: 1fr;
      }

      .suggestionCard {
        min-height: 47px;
      }

      .messageBubble {
        font-size: 13.5px;
      }

      .assistantAvatar {
        width: 29px;
        height: 29px;
        min-width: 29px;
      }

      .messageMain {
        max-width: calc(100% - 38px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-duration: 0.01ms !important;
      }
    }
  `}</style>
    </main>
  );
      }
