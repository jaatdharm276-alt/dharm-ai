
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
  { id: "study", icon: "📚", title: "Padhai", description: "Notes, answers, study plan" },
  { id: "work", icon: "💼", title: "Job / Work", description: "Resume, email, applications" },
  { id: "business", icon: "🚀", title: "Business", description: "Ideas, planning, marketing" },
  { id: "content", icon: "✍️", title: "Content", description: "Posts, scripts, captions" },
];

const taskInstructions = {
  study: "You are ORION AI in STUDY TASK MODE. Help the user finish the actual study task, not just discuss it. Explain in simple Hindi/Hinglish unless the user requests another language. Give a complete, well-structured answer, notes, examples, and step-by-step working when useful. Never invent facts; mention uncertainty when needed.",
  work: "You are ORION AI in JOB AND WORK TASK MODE. Produce a ready-to-use deliverable such as a resume section, professional email, application, cover letter, work plan, or interview answer. Ask only essential follow-up questions; if details are missing, use clear placeholders rather than blocking progress. Use a professional tone appropriate to the task.",
  business: "You are ORION AI in BUSINESS TASK MODE. Give practical, actionable deliverables such as a business plan, customer offer, marketing plan, budget outline, sales message, or next-step checklist. Be realistic about costs and risks, avoid guaranteed earnings claims, and clearly label estimates.",
  content: "You are ORION AI in CONTENT CREATION TASK MODE. Create complete, ready-to-publish content suited to the requested platform and audience. Include a strong opening, clear structure, and useful variations when appropriate. Match the requested language, tone, length, and format.",
};

function renderInline(text) {
  return String(text || "").split(/(\*\*.*?\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function formatText(text) {
  // HTML line breaks ko safe text newlines mein badlein.
  const normalized = String(text || "").replace(/<br\s*\/?\s*>/gi, "\n");
  const lines = normalized.split("\n");
  const output = [];
  let code = false;
  let codeLines = [];
  let i = 0;

  const isTableRow = (line) => /^\s*\|.*\|\s*$/.test(line);
  const isTableDivider = (line) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
  const cellsFrom = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*```/.test(line)) {
      if (code) output.push(<pre className="codeBlock" key={`code-${i}`}><code>{codeLines.join("\n")}</code></pre>);
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

    if (isTableRow(line) && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      const headers = cellsFrom(line);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(cellsFrom(lines[i]));
        i += 1;
      }
      output.push(
        <div className="tableWrap" key={`table-${i}`}>
          <table className="answerTable">
            <thead><tr>{headers.map((cell, index) => <th key={index}>{renderInline(cell)}</th>)}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{headers.map((_, cellIndex) => <td key={cellIndex}>{renderInline(row[cellIndex] || "")}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      output.push(<div className="spaceLine" key={`space-${i}`} />);
      i += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const Tag = heading[1].length === 1 ? "h2" : heading[1].length === 2 ? "h3" : "h4";
      output.push(<Tag key={i}>{renderInline(heading[2])}</Tag>);
      i += 1;
      continue;
    }

    const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      output.push(<div className="textBullet" key={i}><span>•</span><span>{renderInline(bullet[1])}</span></div>);
      i += 1;
      continue;
    }

    const numbered = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (numbered) {
      output.push(<div className="numberedLine" key={i}><span>{numbered[1]}.</span><span>{renderInline(numbered[2])}</span></div>);
      i += 1;
      continue;
    }

    output.push(<p key={i}>{renderInline(line)}</p>);
    i += 1;
  }

  if (code && codeLines.length) {
    output.push(<pre className="codeBlock" key="unfinished-code"><code>{codeLines.join("\n")}</code></pre>);
  }
  return output;
}

function extractReplyFromJson(data) {
  if (typeof data?.reply === "string") return data.reply;
  if (typeof data?.text === "string") return data.text;
  if (typeof data?.choices?.[0]?.message?.content === "string") return data.choices[0].message.content;
  if (typeof data?.choices?.[0]?.delta?.content === "string") return data.choices[0].delta.content;

  const parts = data?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) return parts.map((p) => p?.text || "").join("");

  return "";
}

function parseServerResponse(raw) {
  const trimmed = String(raw || "").trim();

  if (!trimmed) {
    return { reply: "", error: "API se khaali response mila." };
  }

  try {
    const json = JSON.parse(trimmed);
    if (json?.error) return { reply: "", error: String(json.error) };
    return { reply: extractReplyFromJson(json), error: "" };
  } catch {
    // JSON nahi hai to SSE format check karein.
  }

  if (trimmed.includes("data:")) {
    let reply = "";
    const events = trimmed.split(/\r?\n\r?\n/);

    for (const event of events) {
      const payload = event.split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .filter(Boolean)
        .join("\n");

      if (!payload || payload === "[DONE]") continue;

      try {
        const packet = JSON.parse(payload);

        if (packet?.error) {
          return {
            reply: "",
            error: String(packet.error?.message || packet.error),
          };
        }

        const piece = extractReplyFromJson(packet);
        if (piece) reply += piece;
      } catch {
        // Khali ya non-JSON event ko ignore karein.
      }
    }

    return { reply, error: "" };
  }

  return {
    reply: "",
    error: "Server ka response samajh nahi aaya. /api/chat/route.js check karein.",
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
    if (!el || !shouldAutoScrollRef.current) return;

    const frame = requestAnimationFrame(() => {
      if (shouldAutoScrollRef.current && chatAreaRef.current) {
        chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [messages, loading]);

  useEffect(() => () => {
    abortControllerRef.current?.abort();
    recognitionRef.current?.stop();

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
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
    const message = String(text !== undefined ? text : input).trim();

    if (!message || loadingRef.current) return;

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
      { role: "user", content: message },
      { role: "assistant", content: "", pending: true },
    ]);

    const updateAssistant = (content, pending = false) => {
      if (requestId !== requestIdRef.current) return;

      setMessages((old) => {
        const updated = [...old];
        let index = updated.length - 1;

        while (index >= 0 && updated[index].role !== "assistant") index--;

        if (index >= 0) {
          updated[index] = { ...updated[index], content, pending };
        }

        return updated;
      });
    };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          taskMode: activeTaskMode,
          taskInstruction: taskInstructions[activeTaskMode] || "",
        }),
        signal: controller.signal,
      });

      const raw = await response.text();

      if (!response.ok) {
        let serverError = `Server error (${response.status})`;
        const parsedError = parseServerResponse(raw);

        if (parsedError.error) serverError = parsedError.error;
        else if (parsedError.reply) serverError = parsedError.reply;

        throw new Error(serverError);
      }

      const parsed = parseServerResponse(raw);
      if (parsed.error) throw new Error(parsed.error);

      const reply = String(parsed.reply || "").trim();

      if (!reply) {
        throw new Error("AI se khaali response mila. API route aur key check karein.");
      }

      const chunkSize = 3;
      const delay = 16;

      for (let i = 0; i < reply.length; i += chunkSize) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) break;

        updateAssistant(reply.slice(0, i + chunkSize), true);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      updateAssistant(reply, false);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      if (error?.name === "AbortError") {
        setMessages((old) => old.map((item, index) =>
          index === old.length - 1 && item.role === "assistant"
            ? { ...item, pending: false }
            : item
        ));
      } else {
        updateAssistant(`⚠️ ${error?.message || "Kuch galat ho gaya. Dobara try karein."}`, false);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        loadingRef.current = false;
        setLoading(false);
        abortControllerRef.current = null;
      }
    }
                                                                                      }
   
  function handleChatScroll() {
    const el = chatAreaRef.current;
    if (!el) return;

    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;

    shouldAutoScrollRef.current = distanceFromBottom < 140;
  }

  function startVoice() {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setNotice("Is browser mein voice input support nahi karta.");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setListening(true);
      setNotice("");
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setInput(transcript);
    };

    recognition.onerror = () => {
      setNotice("Voice input mein dikkat aayi. Dobara try karein.");
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setListening(false);
      recognitionRef.current = null;
      setNotice("Microphone shuru nahi ho saka.");
    }
  }

  function speak(text) {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setNotice("Text-to-speech is browser mein available nahi hai.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(String(text || ""));
    utterance.lang = "hi-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      setNotice("Jawab copy ho gaya!");
      setTimeout(() => setNotice(""), 2200);
    } catch {
      setNotice("Copy nahi hua. Text ko select karke copy karein.");
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
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  const hasMessages = messages.length > 0;

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
            <span className="brandName">ORION AI</span>
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
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          <button
            className="roundButton menuButton"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            title="Menu"
            aria-label="Menu"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
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
            <span>＋</span> New chat
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setShowComingSoon(true);
            }}
            className="menuItem"
          >
            <span>✧</span> More features
          </button>

          <div className="menuCredit">
            ORION AI · Powered by Dharm AI
          </div>
        </div>
      )}

      <section
        className={`chatArea ${hasMessages ? "chatAreaActive" : "chatAreaHome"}`}
        ref={chatAreaRef}
        onScroll={handleChatScroll}
      >
        {!hasMessages ? (
          <div className="homeScreen">
            <div className="heroLogo">
              <span className="heroLogoCore">✦</span>
              <span className="heroOrbit heroOrbitOne" />
              <span className="heroOrbit heroOrbitTwo" />
            </div>

            <div className="heroEyebrow">
              <span className="statusDot" />
              YOUR AI COMPANION
            </div>

            <h1 className="heroTitle">
              Hello, <span>Explorer.</span>
            </h1>

            <p className="heroDescription">
              Main ORION AI hoon. Aapke sawalon, ideas, padhai,
              kaam aur naye projects mein madad ke liye taiyar.
            </p>

            <div className="creditLine">
              ORION AI <span>·</span> Powered by Dharm AI
            </div>

            <div className="taskSection">
              <div className="sectionHeading">
                <span>Apna task chunein</span>
                <span className="sectionHint">OPTIONAL</span>
              </div>

              <div className="taskGrid">
                {taskModes.map((mode) => (
                  <button
                    type="button"
                    key={mode.id}
                    className={`taskModeCard ${
                      taskMode === mode.id ? "taskModeSelected" : ""
                    }`}
                    onClick={() => {
                      setTaskMode(mode.id);
                      focusComposer();
                    }}
                  >
                    <span className="taskIcon">{mode.icon}</span>
                    <span className="taskText">
                      <span className="taskTitle">{mode.title}</span>
                      <span className="taskDescription">
                        {mode.description}
                      </span>
                    </span>
                    <span className="taskArrow">↗</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="suggestionSection">
              <div className="sectionHeading">
                <span>Shuru karne ke liye</span>
              </div>

              <div className="suggestionGrid">
                {suggestions.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    className="suggestionCard"
                    onClick={() => {
                      setInput(item.prompt);
                      focusComposer();
                    }}
                  >
                    <span className="suggestionIcon">{item.icon}</span>
                    <span>{item.title}</span>
                    <span className="suggestionArrow">↗</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="messagesContainer">
            {messages.map((message, index) => (
              <article
                key={`${index}-${message.role}`}
                className={`messageRow ${
                  message.role === "user" ? "userMessageRow" : "assistantMessageRow"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="assistantAvatar">✦</div>
                )}

                <div className="messageMain">
                  <div className="messageLabel">
                    {message.role === "user" ? "You" : "ORION AI"}
                    {message.role === "assistant" && (
                      <span className="assistantBadge">AI</span>
                    )}
                  </div>

                  <div
                    className={`messageBubble ${
                      message.role === "user" ? "userBubble" : "assistantBubble"
                    }`}
                  >
                    {message.content ? (
                      <div className="messageContent">
                        {formatText(message.content)}
                        {message.pending && (
                          <span className="typingCursor" />
                        )}
                      </div>
                    ) : message.pending ? (
                      <div className="thinkingIndicator">
                        <span />
                        <span />
                        <span />
                        <small>ORION soch raha hai...</small>
                      </div>
                    ) : null}
                  </div>

                  {message.role === "assistant" && message.content && (
                    <div className="messageTools">
                      <button
                        type="button"
                        onClick={() => copyText(message.content)}
                        className="toolButton"
                      >
                        <span>▢</span> Copy
                      </button>

                      <button
                        type="button"
                        onClick={() => speak(message.content)}
                        className="toolButton"
                      >
                        <span>♫</span> Suno
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}

            {loading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="thinkingIndicator">
                <span />
                <span />
                <span />
                <small>ORION soch raha hai...</small>
              </div>
            )}
          </div>
        )}
      </section>
   
      <footer className="bottomArea">
        {notice && (
          <button
            type="button"
            className="noticeBar"
            onClick={() => setNotice("")}
          >
            {notice} <span>×</span>
          </button>
        )}

        <div className="composerOuter">
          {taskMode !== "chat" && !hasMessages && (
            <div className="activeTaskLabel">
              <span>
                {taskModes.find((item) => item.id === taskMode)?.icon}
              </span>
              {taskModes.find((item) => item.id === taskMode)?.title || "Task"}
              <button type="button" onClick={() => setTaskMode("chat")}>
                ×
              </button>
            </div>
          )}

          <form className="inputBox" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
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
                  onClick={() => setShowComingSoon(true)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
                <span className="inputHint">Shift + Enter for new line</span>
              </div>

              <div className="inputRightActions">
                <button
                  type="button"
                  className={`voiceButton ${listening ? "voiceButtonActive" : ""}`}
                  title={listening ? "Voice band karein" : "Voice input"}
                  aria-label="Voice input"
                  onClick={startVoice}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="9" y="3" width="6" height="12" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
                  </svg>
                </button>

                {loading ? (
                  <button
                    type="button"
                    className="sendButton stopButton"
                    onClick={stopGeneration}
                    title="Stop response"
                    aria-label="Stop response"
                  >
                    <span className="stopSquare" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="sendButton"
                    disabled={!input.trim()}
                    title="Send message"
                    aria-label="Send message"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="footerCaption">
          <span className="footerBrandDot">✦</span>
          ORION AI <span className="footerSeparator">·</span> Powered by Dharm AI
        </div>
        <div className="disclaimer">
          AI kabhi-kabhi galti kar sakta hai. Zaroori jaankari verify karein.
        </div>
      </footer>

      {showComingSoon && (
        <div
          className="modalBackdrop"
          onClick={() => setShowComingSoon(false)}
          role="presentation"
        >
          <div
            className="modalCard"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modalTitle"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modalClose"
              onClick={() => setShowComingSoon(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="modalIcon">✦</div>
            <h2 id="modalTitle">More features</h2>
            <p>
              ORION AI ke naye features par kaam chal raha hai.
              Filhaal aap chat, voice input, copy aur text-to-speech
              ka istemal kar sakte hain.
            </p>
            <button
              type="button"
              className="modalPrimary"
              onClick={() => setShowComingSoon(false)}
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
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
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
            radial-gradient(ellipse at 50% -20%, rgba(92, 180, 255, 0.17), transparent 48%),
            linear-gradient(145deg, #fbfdff 0%, #f3f8ff 52%, #fafdff 100%);
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
          box-shadow: 0 3px 18px rgba(37, 86, 145, 0.035);
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
          background: linear-gradient(140deg, #eff8ff, #dcecff);
          border: 1px solid #b6d9ff;
          color: #0876ec;
          box-shadow: 0 0 18px rgba(43, 142, 255, 0.17),
            inset 0 0 12px rgba(255, 255, 255, 0.9);
        }

        .logoStar {
          font-size: 27px;
          text-shadow: 0 0 12px rgba(20, 142, 255, 0.6);
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
          box-shadow: 0 0 16px rgba(32, 140, 255, 0.14);
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
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid #dce8f8;
          box-shadow: 0 15px 45px rgba(26, 68, 120, 0.15);
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
      `}</style>
    </main>
  );
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
          font-size: 42px;
          font-weight: 900;
          color: #ffffff;
          background: linear-gradient(135deg, #1687ff, #00d4ff);
          box-shadow: 0 0 30px rgba(0, 174, 255, 0.38);
          border: 1px solid rgba(255, 255, 255, 0.65);
        }

        .heroTitle {
          margin: 0;
          font-size: clamp(28px, 5vw, 42px);
          font-weight: 850;
          letter-spacing: -1px;
          color: #102d50;
        }

        .heroSubtitle {
          margin: 0;
          max-width: 480px;
          font-size: 15px;
          line-height: 1.7;
          color: #66809d;
        }

        .heroCredit {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #1687df;
        }

        .suggestionGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          width: 100%;
          max-width: 600px;
          margin-top: 10px;
        }

        .suggestionCard {
          padding: 16px;
          border: 1px solid #dceafa;
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.86);
          color: #244362;
          text-align: left;
          cursor: pointer;
          transition: 0.2s ease;
          font-size: 13px;
          line-height: 1.5;
        }

        .suggestionCard:hover {
          border-color: #55baff;
          box-shadow: 0 5px 22px rgba(0, 139, 255, 0.12);
          transform: translateY(-2px);
        }

        .suggestionTitle {
          display: block;
          margin-bottom: 5px;
          font-weight: 800;
          color: #126ec2;
        }

        .messageList {
          width: 100%;
          max-width: 850px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 22px;
          padding: 22px 16px 32px;
        }

        .messageRow {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          width: 100%;
        }

        .messageRow.user {
          justify-content: flex-end;
        }

        .messageAvatar {
          flex: 0 0 34px;
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 13px;
          font-weight: 900;
          background: linear-gradient(135deg, #167bff, #00c8ef);
          box-shadow: 0 3px 12px rgba(0, 135, 255, 0.18);
        }

        .messageContent {
          min-width: 0;
          max-width: calc(100% - 48px);
          font-size: 15px;
          line-height: 1.8;
          color: #263e58;
          overflow-wrap: anywhere;
        }

        .userBubble {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 18px 18px 5px 18px;
          background: linear-gradient(135deg, #e4f2ff, #dffaff);
          border: 1px solid #c9e7ff;
          color: #173d63;
          font-size: 14px;
          line-height: 1.7;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .assistantBubble {
          width: 100%;
          min-width: 0;
        }

        .assistantBubble p {
          margin: 0 0 13px;
        }

        .assistantBubble h1,
        .assistantBubble h2,
        .assistantBubble h3 {
          color: #124f89;
          line-height: 1.4;
          margin: 22px 0 10px;
          font-weight: 800;
        }

        .assistantBubble h1 {
          font-size: 23px;
        }

        .assistantBubble h2 {
          font-size: 20px;
        }

        .assistantBubble h3 {
          font-size: 17px;
        }

        .assistantBubble ul,
        .assistantBubble ol {
          padding-left: 24px;
          margin: 8px 0 16px;
        }

        .assistantBubble li {
          margin: 5px 0;
          padding-left: 3px;
        }

        .assistantBubble strong {
          color: #124f89;
          font-weight: 800;
        }

        .assistantBubble blockquote {
          margin: 12px 0;
          padding: 10px 15px;
          border-left: 3px solid #21a8f5;
          background: #f0f8ff;
          border-radius: 0 10px 10px 0;
          color: #456784;
        }

        .assistantBubble pre {
          max-width: 100%;
          overflow-x: auto;
          padding: 15px;
          border-radius: 12px;
          background: #10243c;
          color: #e3f4ff;
          font-size: 13px;
          line-height: 1.6;
          white-space: pre;
        }

        .assistantBubble code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          overflow-wrap: anywhere;
        }

        .assistantBubble :not(pre) > code {
          padding: 2px 5px;
          border-radius: 5px;
          background: #eaf4ff;
          color: #075caa;
          font-size: 0.9em;
        }

        .spaceLine {
          height: 10px;
        }

        .messageActions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .actionButton {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 10px;
          border: 1px solid #dceafa;
          border-radius: 9px;
          background: #ffffff;
          color: #4d6b89;
          font-size: 12px;
          cursor: pointer;
        }

        .actionButton:hover {
          border-color: #72c5ff;
          color: #0879d5;
        }

        .typingIndicator {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 10px 0;
        }

        .typingDot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #168de0;
          animation: typingPulse 1.2s infinite ease-in-out;
        }

        .typingDot:nth-child(2) {
          animation-delay: 0.15s;
        }

        .typingDot:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes typingPulse {
          0%, 60%, 100% {
            opacity: 0.35;
            transform: translateY(0);
          }
          30% {
            opacity: 1;
            transform: translateY(-4px);
          }
        }

        .inputArea {
          flex-shrink: 0;
          padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
          background: rgba(255, 255, 255, 0.94);
          border-top: 1px solid #e1edf8;
          backdrop-filter: blur(16px);
        }

        .inputInner {
          max-width: 850px;
          margin: 0 auto;
        }

        .inputBox {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          padding: 9px;
          border: 1px solid #cfe3f7;
          border-radius: 20px;
          background: #ffffff;
          box-shadow: 0 4px 20px rgba(24, 109, 185, 0.07);
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .inputBox:focus-within {
          border-color: #5cb9f7;
          box-shadow: 0 0 0 3px rgba(65, 173, 255, 0.1);
        }

        .messageInput {
          flex: 1;
          min-width: 0;
          max-height: 180px;
          resize: none;
          padding: 10px 8px;
          border: 0;
          outline: none;
          background: transparent;
          color: #183652;
          font-family: inherit;
          font-size: 15px;
          line-height: 1.6;
        }

        .messageInput::placeholder {
          color: #8ba2b9;
        }

        .sendButton {
          flex: 0 0 42px;
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #1685ff, #00bde8);
          color: #ffffff;
          font-size: 19px;
          cursor: pointer;
          box-shadow: 0 3px 12px rgba(0, 137, 255, 0.2);
        }

        .sendButton:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }

        .inputDisclaimer {
          margin: 8px 0 0;
          text-align: center;
          color: #91a4b8;
          font-size: 10px;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(10, 31, 54, 0.4);
          backdrop-filter: blur(5px);
        }

        .modalCard {
          width: 100%;
          max-width: 420px;
          padding: 24px;
          border: 1px solid #dceafa;
          border-radius: 22px;
          background: #ffffff;
          box-shadow: 0 20px 70px rgba(12, 53, 91, 0.2);
        }

        .modalTitle {
          margin: 0 0 10px;
          color: #173b5d;
          font-size: 20px;
          font-weight: 850;
        }

        .modalText {
          margin: 0 0 20px;
          color: #69819a;
          font-size: 14px;
          line-height: 1.7;
        }

        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .modalButton {
          padding: 10px 15px;
          border: 1px solid #d7e6f4;
          border-radius: 11px;
          background: #ffffff;
          color: #355573;
          font-weight: 700;
          cursor: pointer;
        }

        .modalButton.primary {
          border-color: #1687ed;
          background: linear-gradient(135deg, #1687ff, #00bde8);
          color: #ffffff;
        }

        .errorMessage {
          margin-top: 10px;
          padding: 10px 12px;
          border: 1px solid #ffd5d5;
          border-radius: 10px;
          background: #fff6f6;
          color: #b52d2d;
          font-size: 13px;
          line-height: 1.6;
        }

        @media (max-width: 600px) {
          .header {
            padding: 10px 12px;
          }

          .brandTitle {
            font-size: 16px;
          }

          .brandSubtitle {
            font-size: 10px;
          }

          .heroLogo {
            width: 76px;
            height: 76px;
            border-radius: 24px;
            font-size: 34px;
          }

          .heroTitle {
            font-size: 29px;
          }

          .suggestionGrid {
            gap: 9px;
          }

          .suggestionCard {
            padding: 12px;
            font-size: 12px;
          }

          .messageList {
            padding: 18px 12px 26px;
            gap: 18px;
          }

          .messageContent {
            font-size: 14px;
          }

          .userBubble {
            font-size: 14px;
          }

          .inputArea {
            padding-left: 10px;
            padding-right: 10px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </main>
  );
            }       
