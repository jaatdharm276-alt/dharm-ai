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
            <span className="brandSubtitle">Your Intelligent Companion</span>
          </span>
        </button>

        <div className="headerActions">
          <button className="roundButton" type="button" onClick={newChat} title="New chat" aria-label="New chat">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          <button
            className="roundButton menuButton"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            title="Menu"
            aria-label="Menu"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="menuPanel">
          <button type="button" onClick={newChat} className="menuItem">
            <span>＋</span> New chat
          </button>
          <button
            type="button"
            onClick={() => { setMenuOpen(false); setShowComingSoon(true); }}
            className="menuItem"
          >
            <span>✧</span> More features
          </button>
          <div className="menuCredit">Powered by Dharm AI</div>
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

            <div className="heroEyebrow"><span className="statusDot" /> YOUR AI COMPANION</div>
            <h1 className="heroTitle">Hello, <span>Explorer.</span></h1>
            <p className="heroDescription">
              Main ORION AI hoon. Aapke sawalon, ideas, padhai,
              kaam aur naye projects mein madad ke liye taiyar.
            </p>
            <div className="creditLine">Powered by Dharm AI</div>

            <div className="taskSection">
              <div className="sectionHeading">
                <span>Apna task chunein</span><span className="sectionHint">OPTIONAL</span>
              </div>
              <div className="taskGrid">
                {taskModes.map((mode) => (
                  <button
                    type="button"
                    key={mode.id}
                    className={`taskModeCard ${taskMode === mode.id ? "taskModeSelected" : ""}`}
                    onClick={() => { setTaskMode(mode.id); focusComposer(); }}
                  >
                    <span className="taskIcon">{mode.icon}</span>
                    <span className="taskText">
                      <span className="taskTitle">{mode.title}</span>
                      <span className="taskDescription">{mode.description}</span>
                    </span>
                    <span className="taskArrow">↗</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="suggestionSection">
              <div className="sectionHeading"><span>Shuru karne ke liye</span></div>
              <div className="suggestionGrid">
                {suggestions.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    className="suggestionCard"
                    onClick={() => { setInput(item.prompt); focusComposer(); }}
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
                className={`messageRow ${message.role === "user" ? "userMessageRow" : "assistantMessageRow"}`}
              >
                {message.role === "assistant" && <div className="assistantAvatar">✦</div>}
                <div className="messageMain">
                  <div className="messageLabel">
                    {message.role === "user" ? "You" : "ORION AI"}
                    {message.role === "assistant" && <span className="assistantBadge">AI</span>}
                  </div>
                  <div className={`messageBubble ${message.role === "user" ? "userBubble" : "assistantBubble"}`}>
                    {message.content ? (
                      <div className="messageContent">
                        {formatText(message.content)}
                        {message.pending && <span className="typingCursor" />}
                      </div>
                    ) : message.pending ? (
                      <div className="thinkingIndicator">
                        <span /><span /><span /><small>ORION soch raha hai...</small>
                      </div>
                    ) : null}
                  </div>
                  {message.role === "assistant" && message.content && (
                    <div className="messageTools">
                      <button type="button" onClick={() => copyText(message.content)} className="toolButton"><span>▢</span> Copy</button>
                      <button type="button" onClick={() => speak(message.content)} className="toolButton"><span>♫</span> Suno</button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="bottomArea">
        {notice && (
          <button type="button" className="noticeBar" onClick={() => setNotice("")}>
            {notice} <span>×</span>
          </button>
        )}

        <div className="composerOuter">
          {taskMode !== "chat" && !hasMessages && (
            <div className="activeTaskLabel">
              <span>{taskModes.find((item) => item.id === taskMode)?.icon}</span>
              {taskModes.find((item) => item.id === taskMode)?.title || "Task"}
              <button type="button" onClick={() => setTaskMode("chat")}>×</button>
            </div>
          )}

          <form className="inputBox" onSubmit={handleSubmit}>
            <button
              type="button"
              className="inputIconButton"
              title="More features"
              aria-label="More features"
              onClick={() => setShowComingSoon(true)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ORION se kuch bhi poochhein..."
              rows={1}
              aria-label="Message"
            />

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
              <button type="button" className="sendButton stopButton" onClick={stopGeneration} title="Stop response" aria-label="Stop response">
                <span className="stopSquare" />
              </button>
            ) : (
              <button type="submit" className="sendButton" disabled={!input.trim()} title="Send message" aria-label="Send message">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
              </button>
            )}
          </form>
        </div>

        <div className="footerCaption">Powered by Dharm AI</div>
      </footer>

      {showComingSoon && (
        <div className="modalBackdrop" onClick={() => setShowComingSoon(false)} role="presentation">
          <div className="modalCard" role="dialog" aria-modal="true" aria-labelledby="modalTitle" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modalClose" onClick={() => setShowComingSoon(false)} aria-label="Close">×</button>
            <div className="modalIcon">✦</div>
            <h2 id="modalTitle">More features</h2>
            <p>ORION AI ke naye features par kaam chal raha hai. Filhaal aap chat, voice input, copy aur text-to-speech ka istemal kar sakte hain.</p>
            <button type="button" className="modalPrimary" onClick={() => setShowComingSoon(false)}>Samajh gaya</button>
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
          background: #f8fbff;
          color: #19365b;
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
          width: 100%;
          height: 100dvh;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
          isolation: isolate;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(92, 180, 255, 0.12), transparent 42%),
            linear-gradient(145deg, #ffffff 0%, #f5f9ff 55%, #ffffff 100%);
          color: #19365b;
        }

        .ambientGlow {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          z-index: -1;
          opacity: 0.23;
        }

        .ambientGlowOne {
          background: #71baff;
          top: 15%;
          left: -230px;
        }

        .ambientGlowTwo {
          background: #6be2f4;
          right: -230px;
          bottom: 12%;
        }

        .header {
          flex-shrink: 0;
          min-height: 88px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 22px;
          border-bottom: 1px solid rgba(76, 145, 220, 0.17);
          background: rgba(255, 255, 255, 0.91);
          box-shadow: 0 4px 24px rgba(60, 130, 210, 0.07);
          position: relative;
          z-index: 5;
          backdrop-filter: blur(18px);
        }

        .brandButton {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 14px;
          border: 0;
          background: transparent;
          color: inherit;
          text-align: left;
          padding: 0;
          cursor: pointer;
        }

        .logoMark {
          width: 64px;
          height: 64px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 20px;
          border: 1px solid #b9dafa;
          background: linear-gradient(145deg, #ffffff, #eaf5ff);
          box-shadow: 0 0 0 1px rgba(81, 167, 255, 0.09),
            0 0 22px rgba(65, 160, 255, 0.18),
            inset 0 0 14px rgba(90, 172, 255, 0.09);
        }

        .logoStar {
          font-size: 34px;
          color: #087be8;
          text-shadow: 0 0 10px rgba(30, 142, 255, 0.65);
        }

        .brandText {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        .brandName {
          font-size: 25px;
          font-weight: 850;
          letter-spacing: 2px;
          color: #174777;
        }

        .brandSubtitle {
          color: #7b8da5;
          font-size: 14px;
          letter-spacing: 0.3px;
        }

        .headerActions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .roundButton,
        .inputIconButton,
        .voiceButton,
        .sendButton {
          flex-shrink: 0;
          display: grid;
          place-items: center;
          cursor: pointer;
          color: #27649c;
          border: 1px solid #c8dff5;
          background: linear-gradient(145deg, #ffffff, #f1f8ff);
          box-shadow: 0 0 0 1px rgba(65, 150, 235, 0.04),
            0 0 14px rgba(70, 155, 240, 0.11),
            inset 0 0 8px rgba(255, 255, 255, 0.9);
          transition: transform 0.18s ease, box-shadow 0.18s ease,
            border-color 0.18s ease;
        }

        .roundButton:hover,
        .inputIconButton:hover,
        .voiceButton:hover,
        .sendButton:not(:disabled):hover {
          transform: translateY(-1px);
          border-color: #70b8ff;
          box-shadow: 0 0 18px rgba(45, 151, 255, 0.24);
        }

        .roundButton {
          width: 58px;
          height: 58px;
          border-radius: 20px;
        }

        .roundButton svg,
        .inputIconButton svg,
        .voiceButton svg,
        .sendButton svg {
          width: 25px;
          height: 25px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.9;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .menuPanel {
          position: absolute;
          top: 78px;
          right: 20px;
          width: min(260px, calc(100vw - 32px));
          padding: 10px;
          border: 1px solid #c7e0fa;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 12px 35px rgba(36, 100, 165, 0.18),
            0 0 15px rgba(70, 160, 255, 0.12);
          z-index: 20;
        }

        .menuItem {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border: 0;
          border-radius: 12px;
          background: transparent;
          color: #24496f;
          text-align: left;
          cursor: pointer;
        }

        .menuItem:hover {
          background: #edf7ff;
        }

        .menuItem span {
          color: #087be8;
          font-size: 20px;
        }

        .menuCredit {
          padding: 10px 8px 4px;
          border-top: 1px solid #e3eef9;
          margin-top: 5px;
          text-align: center;
          color: #7a8da5;
          font-size: 11px;
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
          width: min(100%, 860px);
          min-height: 100%;
          margin: 0 auto;
          padding: 24px 24px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .heroLogo {
          width: 70px;
          height: 70px;
          position: relative;
          display: grid;
          place-items: center;
          border-radius: 23px;
          border: 1px solid #b8daf9;
          background: linear-gradient(145deg, #ffffff, #edf7ff);
          box-shadow: 0 0 0 1px rgba(68, 157, 247, 0.08),
            0 0 28px rgba(60, 156, 255, 0.19),
            inset 0 0 14px rgba(70, 160, 255, 0.08);
          margin-bottom: 12px;
        }

        .heroLogoCore {
          color: #087be8;
          font-size: 38px;
          text-shadow: 0 0 14px rgba(26, 143, 255, 0.6);
        }

        .heroOrbit {
          position: absolute;
          border: 1px solid rgba(39, 143, 237, 0.58);
          border-radius: 50%;
          pointer-events: none;
        }

        .heroOrbitOne {
          width: 52px;
          height: 20px;
          transform: rotate(-32deg);
        }

        .heroOrbitTwo {
          width: 22px;
          height: 52px;
          transform: rotate(38deg);
          opacity: 0.6;
        }

        .heroEyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 2px;
          color: #6b88a9;
          font-size: 10px;
          font-weight: 750;
          letter-spacing: 2px;
        }

        .statusDot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #21b8e9;
          box-shadow: 0 0 9px rgba(33, 184, 233, 0.65);
        }

        .heroTitle {
          margin: 8px 0 0;
          color: #183c65;
          text-align: center;
          font-size: clamp(30px, 5vw, 43px);
          line-height: 1.18;
          letter-spacing: 0.4px;
          font-weight: 850;
        }

        .heroTitle span {
          background: linear-gradient(90deg, #1679d5, #64b8ff);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .heroDescription {
          max-width: 490px;
          margin: 10px auto 0;
          color: #71849c;
          font-size: 14px;
          line-height: 1.65;
          text-align: center;
        }

        .creditLine {
          margin-top: 6px;
          color: #8a9bb0;
          font-size: 11px;
          letter-spacing: 0.5px;
          text-align: center;
        }

        .taskSection,
        .suggestionSection {
          width: 100%;
          margin-top: 24px;
        }

        .sectionHeading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 11px;
          color: #617b98;
          font-size: 12px;
          font-weight: 750;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .sectionHint {
          color: #9aadc2;
          font-size: 9px;
          letter-spacing: 1px;
        }

        .taskGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .taskModeCard {
          min-width: 0;
          min-height: 74px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 14px;
          border-radius: 18px;
          border: 1px solid #d4e6f8;
          background: rgba(255, 255, 255, 0.86);
          color: #24496f;
          text-align: left;
          cursor: pointer;
          box-shadow: 0 0 0 1px rgba(61, 149, 235, 0.035),
            0 0 15px rgba(72, 156, 234, 0.08),
            inset 0 0 10px rgba(255, 255, 255, 0.9);
          transition: transform 0.18s ease, border-color 0.18s ease,
            box-shadow 0.18s ease;
        }

        .taskModeCard:hover,
        .taskModeSelected {
          border-color: #78bdff;
          box-shadow: 0 0 0 1px rgba(63, 157, 250, 0.14),
            0 0 20px rgba(56, 153, 255, 0.19);
          transform: translateY(-1px);
        }

        .taskIcon,
        .suggestionIcon {
          flex-shrink: 0;
          display: grid;
          place-items: center;
          color: #1684e5;
          background: linear-gradient(145deg, #ffffff, #edf7ff);
          border: 1px solid #c4e0fb;
          box-shadow: 0 0 13px rgba(50, 147, 240, 0.12);
        }

        .taskIcon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          font-size: 20px;
        }

        .taskText {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .taskTitle {
          color: #244b73;
          font-size: 13px;
          font-weight: 750;
        }

        .taskDescription {
          color: #8497ad;
          font-size: 10px;
          line-height: 1.35;
        }

        .taskArrow,
        .suggestionArrow {
          flex-shrink: 0;
          color: #73a8db;
          font-size: 14px;
        }

        .suggestionSection {
          margin-top: 22px;
        }

        .suggestionGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .suggestionCard {
          min-width: 0;
          min-height: 55px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 12px;
          border: 1px solid #dce9f7;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.82);
          color: #365879;
          font-size: 12px;
          text-align: left;
          cursor: pointer;
          box-shadow: 0 0 14px rgba(63, 145, 220, 0.07);
          transition: transform 0.18s ease, border-color 0.18s ease,
            box-shadow 0.18s ease;
        }

        .suggestionCard:hover {
          transform: translateY(-1px);
          border-color: #8bc8ff;
          box-shadow: 0 0 17px rgba(63, 151, 244, 0.17);
        }

        .suggestionIcon {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          font-size: 15px;
              }
                     .messagesContainer {
          width: min(100%, 850px);
          margin: 0 auto;
          padding: 24px 24px 28px;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .messageRow {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          min-width: 0;
        }

        .userMessageRow {
          justify-content: flex-end;
        }

        .assistantAvatar {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          color: #087be8;
          border: 1px solid #c1def9;
          border-radius: 12px;
          background: #f1f8ff;
          box-shadow: 0 0 13px rgba(56, 153, 255, 0.15);
        }

        .messageMain {
          min-width: 0;
          max-width: calc(100% - 45px);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .userMessageRow .messageMain {
          align-items: flex-end;
          max-width: 88%;
        }

        .messageLabel {
          display: flex;
          align-items: center;
          gap: 7px;
          margin: 0 0 6px 4px;
          color: #6e86a1;
          font-size: 11px;
          font-weight: 750;
        }

        .assistantBadge {
          padding: 2px 5px;
          color: #1682de;
          border: 1px solid #d0e8ff;
          border-radius: 5px;
          font-size: 9px;
        }

        .messageBubble {
          max-width: 100%;
          min-width: 0;
          padding: 13px 15px;
          border-radius: 17px;
          overflow-wrap: anywhere;
          line-height: 1.7;
          font-size: 14px;
        }

        .userBubble {
          color: #183e67;
          background: linear-gradient(145deg, #eaf5ff, #f5faff);
          border: 1px solid #c9e3fb;
          border-top-right-radius: 5px;
          box-shadow: 0 0 15px rgba(67, 153, 231, 0.08);
        }

        .assistantBubble {
          color: #263f5b;
          background: rgba(255, 255, 255, 0.91);
          border: 1px solid #e0ebf7;
          border-top-left-radius: 5px;
          box-shadow: 0 0 17px rgba(65, 135, 201, 0.055);
        }

        .messageContent p {
          margin: 0 0 10px;
          white-space: pre-wrap;
        }

        .messageContent p:last-child {
          margin-bottom: 0;
        }

        .messageContent h2,
        .messageContent h3,
        .messageContent h4 {
          margin: 15px 0 8px;
          color: #174e83;
          line-height: 1.4;
        }

        .messageContent h2 {
          font-size: 19px;
        }

        .messageContent h3 {
          font-size: 16px;
        }

        .messageContent h4 {
          font-size: 14px;
        }

        .spaceLine {
          height: 5px;
        }

        .textBullet,
        .numberedLine {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin: 5px 0;
        }

        .textBullet > span:first-child,
        .numberedLine > span:first-child {
          flex-shrink: 0;
          color: #1686e6;
          font-weight: 750;
        }

        .codeBlock {
          max-width: 100%;
          margin: 10px 0;
          padding: 13px;
          overflow-x: auto;
          border: 1px solid #d6e7f7;
          border-radius: 12px;
          background: #f4f8fd;
          color: #244b70;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 12px;
          line-height: 1.6;
          white-space: pre;
        }

        .tableWrap {
          max-width: 100%;
          margin: 10px 0;
          overflow-x: auto;
          border: 1px solid #dce9f6;
          border-radius: 10px;
        }

        .answerTable {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .answerTable th,
        .answerTable td {
          padding: 9px 10px;
          text-align: left;
          border-bottom: 1px solid #e2edf7;
        }

        .answerTable th {
          background: #eff7ff;
          color: #1b588e;
        }

        .answerTable tr:last-child td {
          border-bottom: 0;
        }

        .messageTools {
          display: flex;
          gap: 8px;
          margin-top: 7px;
        }

        .toolButton {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 9px;
          border: 1px solid #dfebf7;
          border-radius: 9px;
          color: #6d86a0;
          background: rgba(255, 255, 255, 0.85);
          font-size: 11px;
          cursor: pointer;
        }

        .toolButton:hover {
          border-color: #8fc8ff;
          color: #137bd0;
          box-shadow: 0 0 10px rgba(61, 150, 239, 0.12);
        }

        .typingCursor {
          display: inline-block;
          width: 2px;
          height: 15px;
          margin-left: 3px;
          vertical-align: middle;
          background: #1686e6;
          animation: cursorBlink 0.8s steps(2, start) infinite;
        }

        @keyframes cursorBlink {
          to { visibility: hidden; }
        }

        .thinkingIndicator {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 10px 14px;
          color: #6e86a1;
          font-size: 12px;
        }

        .thinkingIndicator > span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #2796ed;
          animation: dotPulse 1s infinite alternate;
        }

        .thinkingIndicator > span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .thinkingIndicator > span:nth-child(3) {
          animation-delay: 0.4s;
        }

        .thinkingIndicator small {
          margin-left: 5px;
          font-size: 11px;
        }

        @keyframes dotPulse {
          from { opacity: 0.35; transform: translateY(0); }
          to { opacity: 1; transform: translateY(-3px); }
        }

        .bottomArea {
          flex-shrink: 0;
          width: 100%;
          padding: 10px 22px 12px;
          background: rgba(255, 255, 255, 0.93);
          border-top: 1px solid rgba(103, 161, 218, 0.13);
          position: relative;
          z-index: 4;
          backdrop-filter: blur(16px);
        }

        .composerOuter {
          width: min(100%, 850px);
          margin: 0 auto;
        }

        .inputBox {
          width: 100%;
          min-height: 66px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border: 1.5px solid #9acfff;
          border-radius: 26px;
          background: #ffffff;
          box-shadow: 0 0 0 1px rgba(68, 159, 248, 0.09),
            0 0 18px rgba(57, 151, 244, 0.14),
            inset 0 0 12px rgba(82, 165, 242, 0.035);
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .inputBox:focus-within {
          border-color: #4daaff;
          box-shadow: 0 0 0 2px rgba(65, 158, 249, 0.11),
            0 0 24px rgba(48, 145, 243, 0.19);
        }

        .inputIconButton,
        .voiceButton,
        .sendButton {
          width: 44px;
          height: 44px;
          border-radius: 50%;
        }

        .inputBox textarea {
          flex: 1;
          width: 0;
          min-width: 0;
          min-height: 25px;
          max-height: 130px;
          resize: none;
          outline: none;
          border: 0;
          padding: 5px 0;
          background: transparent;
          color: #203e5e;
          font-size: 14px;
          line-height: 1.5;
          overflow-y: auto;
        }

        .inputBox textarea::placeholder {
          color: #8b9cb1;
          opacity: 1;
        }

        .voiceButtonActive {
          color: #ffffff;
          background: linear-gradient(135deg, #268ff0, #60b9ff);
          border-color: #65b5fa;
          box-shadow: 0 0 18px rgba(39, 146, 246, 0.35);
          animation: voiceGlow 1.3s ease-in-out infinite alternate;
        }

        @keyframes voiceGlow {
          from { box-shadow: 0 0 8px rgba(39, 146, 246, 0.25); }
          to { box-shadow: 0 0 22px rgba(39, 146, 246, 0.5); }
        }

        .sendButton {
          color: #ffffff;
          background: linear-gradient(145deg, #3c9cf3, #1680df);
          border-color: #4fa8f5;
          box-shadow: 0 0 16px rgba(34, 137, 234, 0.28);
        }

        .sendButton:disabled {
          color: #a7cce9;
          background: #edf6ff;
          border-color: #d7e8f8;
          box-shadow: none;
          cursor: not-allowed;
        }

        .stopButton {
          background: linear-gradient(145deg, #f08b8b, #dc5151);
          border-color: #ef9c9c;
        }

        .stopSquare {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          background: #ffffff;
        }

        .activeTaskLabel {
          display: flex;
          align-items: center;
          gap: 7px;
          width: fit-content;
          max-width: 100%;
          margin: 0 0 8px 12px;
          padding: 5px 10px;
          color: #2673b7;
          background: #eff7ff;
          border: 1px solid #cce4fa;
          border-radius: 10px;
          font-size: 11px;
        }

        .activeTaskLabel button {
          border: 0;
          background: transparent;
          color: #6f8ca8;
          font-size: 17px;
          cursor: pointer;
        }

        .noticeBar {
          display: block;
          max-width: min(100%, 850px);
          margin: 0 auto 8px;
          padding: 8px 12px;
          border: 1px solid #cbe4fb;
          border-radius: 12px;
          background: #f0f8ff;
          color: #28689e;
          font-size: 12px;
          cursor: pointer;
        }

        .noticeBar span {
          margin-left: 8px;
        }

        .footerCaption {
          margin: 8px auto 0;
          color: #7c91a9;
          text-align: center;
          font-size: 11px;
          letter-spacing: 0.35px;
        }

        .modalBackdrop {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(24, 50, 78, 0.27);
          backdrop-filter: blur(5px);
        }

        .modalCard {
          width: min(100%, 360px);
          padding: 25px;
          position: relative;
          border: 1px solid #c6e1fa;
          border-radius: 22px;
          background: #ffffff;
          text-align: center;
          box-shadow: 0 15px 50px rgba(35, 91, 147, 0.2),
            0 0 24px rgba(57, 153, 247, 0.13);
        }

        .modalClose {
          position: absolute;
          top: 10px;
          right: 12px;
          width: 30px;
          height: 30px;
          border: 0;
          border-radius: 50%;
          background: #f1f7fd;
          color: #58748f;
          font-size: 21px;
          cursor: pointer;
        }

        .modalIcon {
          color: #1685e5;
          font-size: 35px;
          text-shadow: 0 0 15px rgba(31, 140, 242, 0.45);
        }

        .modalCard h2 {
          margin: 10px 0;
          color: #1e4e7b;
          font-size: 21px;
        }

        .modalCard p {
          color: #71849a;
          font-size: 13px;
          line-height: 1.65;
        }

        .modalPrimary {
          width: 100%;
          margin-top: 10px;
          padding: 12px;
          border: 1px solid #4da6f7;
          border-radius: 13px;
          background: linear-gradient(135deg, #3298f2, #167bd6);
          color: #ffffff;
          box-shadow: 0 0 16px rgba(43, 144, 236, 0.22);
          cursor: pointer;
        }

        @media (min-width: 900px) {
          .homeScreen {
            padding-top: 30px;
          }

          .heroDescription {
            font-size: 15px;
          }

          .taskModeCard {
            min-height: 78px;
          }
        }

        @media (max-width: 600px) {
          .header {
            min-height: 78px;
            padding: 10px 14px;
            gap: 8px;
          }

          .logoMark {
            width: 52px;
            height: 52px;
            border-radius: 17px;
          }

          .logoStar {
            font-size: 29px;
          }

          .brandButton {
            gap: 10px;
          }

          .brandName {
            font-size: 20px;
            letter-spacing: 1.5px;
          }

          .brandSubtitle {
            font-size: 11px;
          }

          .headerActions {
            gap: 8px;
          }

          .roundButton {
            width: 46px;
            height: 46px;
            border-radius: 16px;
          }

          .roundButton svg {
            width: 22px;
            height: 22px;
          }

          .homeScreen {
            padding: 20px 16px 18px;
          }

          .heroLogo {
            width: 58px;
            height: 58px;
            border-radius: 19px;
            margin-bottom: 9px;
          }

          .heroLogoCore {
            font-size: 32px;
          }

          .heroTitle {
            font-size: 29px;
          }

          .heroDescription {
            max-width: 360px;
            margin-top: 8px;
            font-size: 12px;
            line-height: 1.55;
          }

          .taskSection {
            margin-top: 20px;
          }

          .taskGrid {
            gap: 9px;
          }

          .taskModeCard {
            min-height: 68px;
            gap: 8px;
            padding: 10px 9px;
            border-radius: 15px;
          }

          .taskIcon {
            width: 36px;
            height: 36px;
            border-radius: 12px;
            font-size: 17px;
          }

          .taskTitle {
            font-size: 12px;
          }

          .taskDescription {
            font-size: 9px;
          }

          .taskArrow {
            font-size: 12px;
          }

          .suggestionSection {
            margin-top: 18px;
          }

          .suggestionGrid {
            gap: 8px;
          }

          .suggestionCard {
            min-height: 49px;
            gap: 7px;
            padding: 8px 9px;
            border-radius: 14px;
            font-size: 11px;
          }

          .suggestionIcon {
            width: 27px;
            height: 27px;
            border-radius: 9px;
            font-size: 13px;
          }

          .suggestionArrow {
            font-size: 12px;
          }

          .bottomArea {
            padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
          }

          .inputBox {
            min-height: 58px;
            gap: 7px;
            padding: 6px 7px;
            border-radius: 23px;
          }

          .inputIconButton,
          .voiceButton,
          .sendButton {
            width: 40px;
            height: 40px;
          }

          .inputIconButton svg,
          .voiceButton svg,
          .sendButton svg {
            width: 21px;
            height: 21px;
          }

          .inputBox textarea {
            font-size: 13px;
          }

          .footerCaption {
            margin-top: 6px;
            font-size: 10px;
          }

          .messagesContainer {
            padding: 18px 12px 22px;
            gap: 18px;
          }

          .messageBubble {
            padding: 11px 12px;
            font-size: 13px;
          }

          .messageContent h2 {
            font-size: 17px;
          }

          .messageContent h3 {
            font-size: 15px;
          }
        }

        @media (max-width: 360px) {
          .header {
            padding-right: 10px;
            padding-left: 10px;
          }

          .brandName {
            font-size: 18px;
          }

          .brandSubtitle {
            font-size: 10px;
          }

          .roundButton {
            width: 41px;
            height: 41px;
          }

          .homeScreen {
            padding-right: 11px;
            padding-left: 11px;
          }

          .taskModeCard {
            gap: 6px;
            padding: 8px 7px;
          }

          .taskIcon {
            width: 31px;
            height: 31px;
            font-size: 15px;
          }

          .taskTitle {
            font-size: 11px;
          }

          .taskDescription {
            font-size: 8px;
          }

          .inputBox {
            gap: 5px;
            padding: 5px;
          }

          .inputIconButton,
          .voiceButton,
          .sendButton {
            width: 36px;
            height: 36px;
          }
        }

        @media (max-height: 720px) {
          .homeScreen {
            padding-top: 12px;
            padding-bottom: 12px;
          }

          .heroLogo {
            width: 48px;
            height: 48px;
            margin-bottom: 6px;
          }

          .heroLogoCore {
            font-size: 27px;
          }

          .heroTitle {
            font-size: 26px;
          }

          .heroDescription {
            margin-top: 5px;
          }

          .taskSection {
            margin-top: 13px;
          }

          .suggestionSection {
            margin-top: 12px;
          }

          .taskModeCard {
            min-height: 60px;
          }

          .suggestionCard {
            min-height: 44px;
          }
        }
      `}</style>
    </main>
  );
} 
