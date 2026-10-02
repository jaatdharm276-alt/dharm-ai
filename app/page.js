"use client";

import { useEffect, useRef, useState } from "react";

function renderInline(text) {
  const parts = String(text || "").split(
    /(\*\*.*?\*\*|\*[^*]+\*)/g
  );

  return parts.map((part, i) => {
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
  return String(text || "")
    .split("\n")
    .map((line, i) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return <div key={i} className="spaceLine" />;
      }

      const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);

      if (heading) {
        const Tag =
          heading[1].length === 1
            ? "h1"
            : heading[1].length === 2
              ? "h2"
              : "h3";

        return <Tag key={i}>{renderInline(heading[2])}</Tag>;
      }

      const bullet = trimmed.match(/^[-*•]\s+(.*)$/);

      if (bullet) {
        return (
          <div className="textBullet" key={i}>
            <span>•</span>
            <span>{renderInline(bullet[1])}</span>
          </div>
        );
      }

      return <p key={i}>{renderInline(line)}</p>;
    });
}

const suggestions = [
  {
    icon: "✧",
    title: "Email likho",
    prompt: "Mere liye ek professional email likho."
  },
  {
    icon: "◇",
    title: "Business ideas",
    prompt: "Mujhe kuch practical business ideas batao."
  },
  {
    icon: "✎",
    title: "Padhai mein help",
    prompt: "Mujhe kisi topic ko aasan bhasha mein samjhao."
  },
  {
    icon: "⌘",
    title: "Coding help",
    prompt: "Mujhe coding mein step-by-step help karo."
  },
  {
    icon: "◷",
    title: "Study plan",
    prompt: "Mere liye ek daily study plan banao."
  },
];

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Namaste 🙏\n\nMain ORION AI hoon — aapka intelligent companion. Aap mujhse sawaal pooch sakte ho."
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const chatAreaRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const el = chatAreaRef.current;

    if (!el || !shouldAutoScrollRef.current) return;

    const frame = requestAnimationFrame(() => {
      if (shouldAutoScrollRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();

      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  async function sendMessage(text) {
    const message = String(
      text !== undefined ? text : input
    ).trim();

    if (!message || loading) return;

    shouldAutoScrollRef.current = true;
    setInput("");
    setLoading(true);

    setMessages((old) => [
      ...old,
      { role: "user", content: message }
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Server se response nahi mila."
        );
      }

      const reply = String(
        data?.reply || "Maaf kijiye 🙏 Abhi response nahi mila."
      );

      setMessages((old) => [
        ...old,
        { role: "assistant", content: "" }
      ]);

      const charactersPerStep = 3;
      const typingDelay = 18;

      for (let i = 0; i < reply.length; i += charactersPerStep) {
        const visibleText = reply.slice(0, i + charactersPerStep);

        setMessages((old) => {
          const updated = [...old];
          const lastIndex = updated.length - 1;
          const lastMessage = updated[lastIndex];

          if (lastMessage?.role === "assistant") {
            updated[lastIndex] = {
              ...lastMessage,
              content: visibleText
            };
          }

          return updated;
        });

        await new Promise((resolve) =>
          setTimeout(resolve, typingDelay)
        );
      }
    } catch (error) {
      setMessages((old) => [
        ...old,
        {
          role: "assistant",
          content:
            "Maaf kijiye 🙏\n\n" +
            (error?.message ||
              "Kuch technical problem aa gayi. Dobara try karein.")
        }
      ]);
    } finally {
      setLoading(false);
    }
    }
    function handleChatScroll(event) {
    const el = event.currentTarget;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;

    if (distanceFromBottom <= 24) {
      shouldAutoScrollRef.current = true;
    } else if (distanceFromBottom > 48) {
      shouldAutoScrollRef.current = false;
    }
  }

  function startVoice() {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Aapke browser mein voice input supported nahi hai.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setListening(true);
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setInput(transcript);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  }

  function speak(text) {
    if (
      typeof window === "undefined" ||
      !window.speechSynthesis
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = String(text)
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .replace(/\n/g, " ");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "hi-IN";
    utterance.rate = 0.95;

    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="page">
      <div className="backgroundGlow glowOne" />
      <div className="backgroundGlow glowTwo" />

      <div className="app">
        <header className="header">
          <div className="brand">
            <div className="logo">
              <svg viewBox="0 0 100 100" aria-label="ORION AI logo">
                <defs>
                  <linearGradient
                    id="orionGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#70eaff" />
                    <stop offset="50%" stopColor="#a99aff" />
                    <stop offset="100%" stopColor="#e4a5ff" />
                  </linearGradient>
                </defs>

                <ellipse
                  cx="50"
                  cy="50"
                  rx="42"
                  ry="17"
                  fill="none"
                  stroke="url(#orionGradient)"
                  strokeWidth="3"
                  transform="rotate(-35 50 50)"
                />

                <circle
                  cx="50"
                  cy="50"
                  r="25"
                  fill="#14132d"
                  stroke="url(#orionGradient)"
                  strokeWidth="2.5"
                />

                <path
                  d="M50 32 L56 44 L68 50 L56 56 L50 68 L44 56 L32 50 L44 44 Z"
                  fill="url(#orionGradient)"
                />
              </svg>
            </div>

            <div className="brandInfo">
              <div className="brandName">
                ORION <span>AI</span>
              </div>

              <div className="brandTagline">
                Your Intelligent Companion
              </div>

              <div className="brandCredit">
                Powered by Dharm AI
              </div>

              <div className="online">
                <span />
                Online
              </div>
            </div>
          </div>
        </header>

        <main
          ref={chatAreaRef}
          className="chatArea"
          onScroll={handleChatScroll}
        >
          <div className="chat">
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "message userMessage"
                    : "message assistantMessage"
                }
              >
                {message.role === "assistant" && (
                  <div className="avatar">✦</div>
                )}

                <div
                  className={
                    message.role === "user"
                      ? "bubble userBubble"
                      : "bubble assistantBubble"
                  }
                >
                  {message.role === "assistant" && (
                    <div className="assistantTitle">
                      <span>✦</span>
                      <b>ORION AI</b>
                    </div>
                  )}

                  <div className="messageContent">
                    {formatText(message.content)}
                  </div>

                  {message.role === "assistant" &&
                    message.content &&
                    (
                      <button
                        className="speakButton"
                        onClick={() => speak(message.content)}
                        title="Jawab sunen"
                        aria-label="Jawab sunen"
                      >
                        🔊
                      </button>
                    )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="loadingNote">
                <span className="loadingDot" />
                ORION AI jawab taiyar kar raha hai...
              </div>
            )}

            {messages.length === 1 && !loading && (
              <div className="suggestions">
                <div className="suggestionHeading">
                  AAP KYA JAANNA CHAHTE HAIN?
                </div>

                <div className="suggestionGrid">
                  {suggestions.map((item) => (
                    <button
                      key={item.title}
                      className="suggestionChip"
                      onClick={() => sendMessage(item.prompt)}
                    >
                      <span className="suggestionIcon">
                        {item.icon}
                      </span>
                      <span>{item.title}</span>
                      <span className="suggestionArrow">↗</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="bottomArea">
          <div className="inputBox">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="ORION AI se kuch poochiye..."
              rows={1}
              aria-label="Message likhein"
            />

            <button
              className={
                listening ? "voiceButton active" : "voiceButton"
              }
              onClick={startVoice}
              title="Voice input"
              aria-label="Voice input"
            >
              🎙️
            </button>

            <button
              className="sendButton"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              title="Send"
              aria-label="Message bhejein"
            >
              ➤
            </button>
          </div>

          <div className="footerCredit">
            ORION AI · Powered by Dharm AI
          </div>
        </footer>
      </div>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
        }

        body {
          overflow: hidden;
          background: #ffffff;
        }

        button,
        textarea {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        .page {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          color: #202437;
          background:
            radial-gradient(
              ellipse at 8% 0%,
              rgba(155, 130, 255, 0.12),
              transparent 38%
            ),
            radial-gradient(
              ellipse at 100% 100%,
              rgba(79, 190, 255, 0.10),
              transparent 36%
            ),
            #ffffff;
        }

        .backgroundGlow {
          position: absolute;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(75px);
          opacity: 0.14;
          animation: orionGlow 6s ease-in-out infinite alternate;
        }

        .glowOne {
          left: -110px;
          top: -110px;
          background: #9c8bff;
        }

        .glowTwo {
          right: -120px;
          bottom: -120px;
          background: #76baff;
        }

        .app {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.88);
        }

        .header {
          position: relative;
          z-index: 5;
          flex: 0 0 auto;
          min-height: 72px;
          display: flex;
          align-items: center;
          padding: 8px 13px;
          border-bottom: 1px solid rgba(153, 132, 255, 0.25);
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 4px 22px rgba(125, 101, 235, 0.10);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logo {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border: 1px solid #c8bcff;
          border-radius: 13px;
          background: linear-gradient(145deg, #ffffff, #eeebff);
          box-shadow:
            0 0 8px rgba(132, 103, 255, 0.35),
            0 0 22px rgba(132, 103, 255, 0.18),
            inset 0 0 12px rgba(132, 103, 255, 0.12);
          animation: logoPulse 3.2s ease-in-out infinite;
        }

        .logo svg {
          width: 34px;
          height: 34px;
          filter: drop-shadow(0 0 5px rgba(128, 100, 244, 0.45));
        }

        .brandName {
          color: #282044;
          font-size: 19px;
          font-weight: 900;
          letter-spacing: 1.1px;
          text-shadow:
            0 0 8px rgba(133, 105, 255, 0.38),
            0 0 18px rgba(133, 105, 255, 0.18);
          animation: nameGlow 3s ease-in-out infinite alternate;
        }

        .brandName span {
          color: #8064f4;
          text-shadow:
            0 0 7px rgba(128, 100, 244, 0.75),
            0 0 17px rgba(128, 100, 244, 0.42);
        }

        .brandTagline {
          margin-top: 3px;
          color: #62677c;
          font-size: 10px;
        }

        .brandCredit {
          margin-top: 2px;
          color: #8379b2;
          font-size: 9px;
        }

        .online {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 3px;
          color: #747b8f;
          font-size: 11px;
        }

        .online span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #25b978;
          box-shadow: 0 0 7px rgba(37, 185, 120, 0.75);
        }

        .chatArea {
          flex: 1 1 0;
          min-height: 0;
          width: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: #d7dbea transparent;
        }

        .chat {
          width: 100%;
          max-width: 850px;
          margin: 0 auto;
          padding: 12px 10px 16px;
        }

        .message {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          width: 100%;
          margin-bottom: 11px;
          animation: messageEnter 0.2s ease-out both;
        }

        .assistantMessage {
          justify-content: flex-start;
        }

        .userMessage {
          justify-content: flex-end;
        }

        .avatar {
          width: 32px;
          height: 32px;
          flex: 0 0 32px;
          display: grid;
          place-items: center;
          border: 1px solid #d5caff;
          border-radius: 11px;
          background: linear-gradient(145deg, #ffffff, #f0edff);
          color: #8064f4;
          box-shadow:
            0 0 10px rgba(128, 100, 244, 0.30),
            0 0 20px rgba(128, 100, 244, 0.12),
            inset 0 0 8px rgba(128, 100, 244, 0.10);
        }

        .bubble {
          min-width: 0;
          max-width: min(90%, 720px);
          padding: 11px 13px;
          border-radius: 17px;
          overflow-wrap: anywhere;
        }

        .assistantBubble {
          border: 1px solid rgba(177, 164, 255, 0.45);
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.98),
            rgba(248, 247, 255, 0.97)
          );
          box-shadow:
            0 4px 16px rgba(70, 60, 130, 0.05),
            0 0 13px rgba(145, 122, 255, 0.16),
            inset 0 0 10px rgba(145, 122, 255, 0.04);
        }

        .userBubble {
          border: 1px solid rgba(160, 139, 255, 0.58);
          background: linear-gradient(135deg, #f1efff, #e9e5ff);
          box-shadow:
            0 0 13px rgba(130, 103, 255, 0.20),
            0 0 24px rgba(130, 103, 255, 0.08),
            inset 0 0 10px rgba(255, 255, 255, 0.6);
        }

        .assistantTitle {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 7px;
          color: #6d60b6;
          font-size: 12px;
          text-shadow: 0 0 9px rgba(118, 101, 217, 0.35);
        }

        .assistantTitle span {
          color: #8064f4;
          font-size: 15px;
          text-shadow:
            0 0 8px rgba(128, 100, 244, 0.75),
            0 0 16px rgba(128, 100, 244, 0.35);
        }

        .messageContent {
          color: #25283a;
          font-size: 14px;
          line-height: 1.55;
          overflow-wrap: anywhere;
        }

        .messageContent p {
          margin: 0 0 8px;
        }

        .messageContent p:last-child {
          margin-bottom: 0;
        }

        .messageContent h1,
        .messageContent h2,
        .messageContent h3 {
          margin: 0 0 8px;
          color: #202238;
          line-height: 1.35;
        }

        .messageContent h1 {
          font-size: 20px;
        }

        .messageContent h2 {
          font-size: 18px;
        }

        .messageContent h3 {
          font-size: 16px;
        }

        .spaceLine {
          height: 5px;
        }

        .textBullet {
          display: flex;
          gap: 7px;
          margin: 5px 0;
        }

        .textBullet span:first-child {
          color: #7665d9;
          text-shadow: 0 0 6px rgba(118, 101, 217, 0.35);
        }

        .speakButton {
          width: 29px;
          height: 29px;
          margin-top: 7px;
          border: 1px solid rgba(160, 139, 255, 0.30);
          border-radius: 9px;
          background: linear-gradient(145deg, #f5f2ff, #e9e6ff);
          color: #6060a1;
          box-shadow: 0 0 10px rgba(128, 100, 244, 0.20);
          cursor: pointer;
        }

        .suggestions {
          margin: 1px 0 18px 40px;
          max-width: 680px;
        }

        .suggestionHeading {
          margin: 5px 0 10px;
          color: #777e95;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1px;
          text-align: center;
        }

        .suggestionGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 7px;
        }

        .suggestionChip {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 10px 9px;
          border: 1px solid rgba(173, 159, 255, 0.40);
          border-radius: 12px;
          background: linear-gradient(145deg, #ffffff, #f5f2ff);
          color: #34384f;
          box-shadow:
            0 0 12px rgba(128, 100, 244, 0.12),
            inset 0 0 8px rgba(128, 100, 244, 0.04);
          font-size: 11px;
          text-align: left;
          cursor: pointer;
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }

        .suggestionChip:hover {
          box-shadow:
            0 0 16px rgba(128, 100, 244, 0.25),
            0 0 28px rgba(128, 100, 244, 0.10);
          transform: translateY(-1px);
        }

        .suggestionIcon {
          color: #8064f4;
          font-size: 15px;
          text-shadow:
            0 0 7px rgba(128, 100, 244, 0.65),
            0 0 14px rgba(128, 100, 244, 0.25);
        }

        .suggestionText {
          flex: 1;
          min-width: 0;
        }

        .suggestionArrow {
          color: #8278bd;
        }

        .loadingNote {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 10px 0 12px 40px;
          color: #7665d9;
          font-size: 12px;
          text-shadow: 0 0 8px rgba(118, 101, 217, 0.22);
        }

        .loadingDot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #8875ff;
          box-shadow:
            0 0 8px rgba(136, 117, 255, 0.60),
            0 0 16px rgba(136, 117, 255, 0.25);
          animation: typing 1s infinite alternate;
        }

        .bottomArea {
          position: relative;
          z-index: 5;
          flex: 0 0 auto;
          width: 100%;
          padding: 7px 9px;
          padding-bottom: max(7px, env(safe-area-inset-bottom));
          border-top: 1px solid rgba(153, 132, 255, 0.28);
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 -5px 20px rgba(125, 101, 235, 0.10);
        }

        .inputBox {
          display: flex;
          align-items: flex-end;
          gap: 5px;
          width: 100%;
          min-height: 52px;
          padding: 5px;
          border: 1px solid rgba(160, 139, 255, 0.50);
          border-radius: 17px;
          background: linear-gradient(145deg, #ffffff, #f8f7ff);
          box-shadow:
            0 0 12px rgba(128, 100, 244, 0.15),
            0 0 22px rgba(128, 100, 244, 0.06),
            inset 0 0 8px rgba(128, 100, 244, 0.04);
          transition: box-shadow 0.25s ease, border-color 0.25s ease;
        }

        .inputBox:focus-within {
          border-color: #9b83ff;
          box-shadow:
            0 0 0 2px rgba(157, 127, 255, 0.13),
            0 0 18px rgba(128, 100, 244, 0.30),
            0 0 32px rgba(128, 100, 244, 0.12);
        }

        .inputBox textarea {
          flex: 1 1 auto;
          width: 0;
          min-width: 0;
          height: 40px;
          max-height: 90px;
          resize: none;
          outline: none;
          border: 0;
          background: transparent;
          color: #24283a;
          padding: 9px 7px;
          font-size: 14px;
          line-height: 1.4;
        }

        .inputBox textarea::placeholder {
          color: #9298ab;
        }

        .voiceButton,
        .sendButton {
          width: 38px;
          height: 40px;
          flex: 0 0 38px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 11px;
          cursor: pointer;
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }

        .voiceButton {
          background: linear-gradient(145deg, #f6f3ff, #ebe8ff);
          color: #69708b;
          font-size: 16px;
          box-shadow:
            0 0 9px rgba(128, 100, 244, 0.18),
            inset 0 0 8px rgba(128, 100, 244, 0.05);
        }

        .voiceButton.active {
          background: #fceaf5;
          color: #c34c96;
          box-shadow:
            0 0 12px rgba(220, 87, 165, 0.40),
            0 0 22px rgba(220, 87, 165, 0.15);
          animation: logoPulse 1.4s ease-in-out infinite;
        }

        .sendButton {
          background: linear-gradient(135deg, #9b83ff, #6751d5);
          color: #ffffff;
          font-size: 21px;
          box-shadow:
            0 0 10px rgba(118, 101, 217, 0.50),
            0 0 22px rgba(118, 101, 217, 0.25);
        }

        .sendButton:disabled {
          opacity: 0.48;
          cursor: default;
          box-shadow: none;
        }

        .sendButton:not(:disabled):active {
          transform: scale(0.96);
          box-shadow:
            0 0 16px rgba(118, 101, 217, 0.65),
            0 0 28px rgba(118, 101, 217, 0.28);
        }

        .footerCredit {
          padding-top: 6px;
          color: #8580a5;
          text-align: center;
          font-size: 9px;
          letter-spacing: 0.25px;
          text-shadow: 0 0 8px rgba(128, 100, 244, 0.28);
        }

        @keyframes messageEnter {
          from {
            opacity: 0;
            transform: translateY(4px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes orionGlow {
          from {
            opacity: 0.08;
            transform: scale(0.92);
          }

          to {
            opacity: 0.18;
            transform: scale(1.08);
          }
        }

        @keyframes logoPulse {
          0%,
          100% {
            box-shadow:
              0 0 8px rgba(132, 103, 255, 0.35),
              0 0 18px rgba(132, 103, 255, 0.16),
              inset 0 0 12px rgba(132, 103, 255, 0.10);
          }

          50% {
            box-shadow:
              0 0 13px rgba(132, 103, 255, 0.58),
              0 0 28px rgba(132, 103, 255, 0.30),
              inset 0 0 14px rgba(132, 103, 255, 0.16);
          }
        }

        @keyframes nameGlow {
          from {
            text-shadow:
              0 0 7px rgba(133, 105, 255, 0.28),
              0 0 14px rgba(133, 105, 255, 0.12);
          }

          to {
            text-shadow:
              0 0 11px rgba(133, 105, 255, 0.48),
              0 0 23px rgba(133, 105, 255, 0.24);
          }
        }

        @keyframes typing {
          from {
            opacity: 0.35;
            transform: scale(0.9);
          }

          to {
            opacity: 1;
            transform: scale(1.1);
          }
        }

        @media (max-width: 380px) {
          .header {
            min-height: 68px;
            padding: 7px 10px;
          }

          .brandName {
            font-size: 17px;
          }

          .brandTagline {
            font-size: 9px;
          }

          .brandCredit {
            font-size: 8px;
          }

          .logo {
            width: 38px;
            height: 38px;
            flex-basis: 38px;
          }

          .logo svg {
            width: 31px;
            height: 31px;
          }

          .messageContent {
            font-size: 13px;
          }

          .suggestions {
            margin-left: 39px;
          }

          .suggestionGrid {
            gap: 6px;
          }

          .suggestionChip {
            padding: 8px 7px;
            font-size: 10px;
          }

          .voiceButton,
          .sendButton {
            width: 35px;
            flex-basis: 35px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
