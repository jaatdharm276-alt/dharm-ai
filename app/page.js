"use client";

import { useEffect, useRef, useState } from "react";

function renderInline(text) {
  const parts = String(text || "").split(
    /(\*\*.*?\*\*|\*[^*]+\*)/g
  );

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
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

      const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);

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
    prompt: "Mujhe kisi bhi topic ko aasan bhasha mein samjhao."
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
  {
    icon: "✦",
    title: "Creative ideas",
    prompt: "Mujhe kuch naye aur creative ideas do."
  }
];

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Namaste 🙏\n\nMain ORION AI hoon — aapka intelligent companion. Aap mujhse kisi bhi topic par sawaal pooch sakte ho."
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
        el.scrollTo({
          top: el.scrollHeight,
          behavior: "smooth"
        });
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
    const message = String(text !== undefined ? text : input).trim();

    if (!message || loading) return;

    shouldAutoScrollRef.current = true;
    setInput("");

    setMessages((old) => [
      ...old,
      { role: "user", content: message }
    ]);

    setLoading(true);

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

      setMessages((old) => [
        ...old,
        {
          role: "assistant",
          content:
            data?.reply ||
            "Maaf kijiye 🙏 Abhi response nahi mila."
        }
      ]);
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

    shouldAutoScrollRef.current = distanceFromBottom < 100;
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
      .replace(/#{1,3}\s/g, "")
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
              <svg
                viewBox="0 0 100 100"
                role="img"
                aria-label="ORION AI logo"
              >
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
                  <div className="avatar">
                    <svg viewBox="0 0 100 100" aria-hidden="true">
                      <path
                        d="M50 17 L62 39 L83 50 L62 61 L50 83 L38 61 L17 50 L38 39 Z"
                        fill="url(#avatarGradient)"
                      />
                      <defs>
                        <linearGradient
                          id="avatarGradient"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor="#70eaff" />
                          <stop offset="55%" stopColor="#b3a1ff" />
                          <stop offset="100%" stopColor="#e4a5ff" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                )}

                <div
                  className={
                    message.role === "user"
                      ? "bubble userBubble"
                      : index === 0
                        ? "bubble assistantBubble welcomeBubble"
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

                  {message.role === "assistant" && (
                    <button
                      className="speakButton"
                      onClick={() => speak(message.content)}
                      aria-label="Jawab sunen"
                      title="Jawab sunen"
                    >
                      🔊
                    </button>
                  )}
                </div>
              </div>
            ))}

            {messages.length === 1 && !loading && (
              <div className="suggestions">
                <div className="suggestionHeading">
                  <span className="headingLine" />
                  <span>AAP KYA JAANNA CHAHTE HAIN?</span>
                  <span className="headingLine" />
                </div>

                <div className="suggestionGrid">
                  {suggestions.map((item) => (
                    <button
                      key={item.title}
                      className="suggestionChip"
                      onClick={() => sendMessage(item.prompt)}
                      disabled={loading}
                    >
                      <span className="suggestionIcon">
                        {item.icon}
                      </span>

                      <span className="suggestionText">
                        {item.title}
                      </span>

                      <span className="suggestionArrow">↗</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="message assistantMessage">
                <div className="avatar">
                  <svg viewBox="0 0 100 100" aria-hidden="true">
                    <path
                      d="M50 17 L62 39 L83 50 L62 61 L50 83 L38 61 L17 50 L38 39 Z"
                      fill="#b8a6ff"
                    />
                  </svg>
                </div>

                <div className="bubble assistantBubble">
                  <div className="assistantTitle">
                    <span>✦</span>
                    <b>ORION AI</b>
                  </div>

                  <div className="typing">
                    <span />
                    <span />
                    <span />
                  </div>
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
              aria-label="Apna message likhein"
            />

            <button
              className={
                listening
                  ? "voiceButton active"
                  : "voiceButton"
              }
              onClick={startVoice}
              aria-label="Voice input"
              title="Voice input"
            >
              🎙️
            </button>

            <button
              className="sendButton"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              aria-label="Message bhejein"
              title="Send"
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
          background: #03050c;
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
          color: #f4f3ff;
          background:
            radial-gradient(
              circle at 15% 5%,
              rgba(70, 71, 150, 0.12),
              transparent 30%
            ),
            #03050c;
        }

        .backgroundGlow {
          position: absolute;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(85px);
          opacity: 0.1;
          animation: orionGlow 8s ease-in-out infinite alternate;
        }

        .glowOne {
          left: -110px;
          top: -110px;
          background: #725cff;
        }

        .glowTwo {
          right: -120px;
          bottom: -120px;
          background: #365bff;
          animation-delay: 3s;
        }

        .app {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
          background: rgba(3, 5, 12, 0.65);
        }

        .header {
          position: relative;
          z-index: 5;
          flex: 0 0 auto;
          min-height: 72px;
          display: flex;
          align-items: center;
          padding: 8px 13px;
          border-bottom: 1px solid rgba(153, 155, 202, 0.13);
          background: rgba(6, 8, 16, 0.98);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .logo {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(151, 139, 255, 0.5);
          border-radius: 13px;
          background: linear-gradient(145deg, #17182e, #0b1020);
          box-shadow: 0 0 9px rgba(104, 126, 255, 0.15);
        }

        .logo svg {
          width: 34px;
          height: 34px;
        }

        .brandInfo {
          min-width: 0;
        }

        .brandName {
          color: #f5f2ff;
          font-size: 19px;
          font-weight: 900;
          letter-spacing: 1.1px;
          line-height: 1.15;
          text-shadow: 0 0 7px rgba(140, 133, 255, 0.3);
        }

        .brandName span {
          color: #b9b0ff;
          text-shadow: 0 0 6px rgba(146, 126, 255, 0.35);
        }

        .brandTagline {
          margin-top: 3px;
          color: #c5c6df;
          font-size: 10px;
        }

        .brandCredit {
          margin-top: 2px;
          color: #958bbd;
          font-size: 9px;
        }

        .online {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 3px;
          color: #929ab3;
          font-size: 11px;
        }

        .online span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #43d991;
          box-shadow: 0 0 5px rgba(67, 217, 145, 0.35);
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
          scrollbar-color: #272c43 transparent;
        }

        .chatArea::-webkit-scrollbar {
          width: 4px;
        }

        .chatArea::-webkit-scrollbar-thumb {
          background: #272c43;
          border-radius: 8px;
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
          border: 1px solid rgba(130, 140, 198, 0.2);
          border-radius: 11px;
          background: #151a2b;
        }

        .avatar svg {
          width: 24px;
          height: 24px;
        }

        .bubble {
          min-width: 0;
          max-width: min(90%, 720px);
          padding: 11px 13px;
          border-radius: 17px;
          overflow-wrap: anywhere;
        }

        .assistantBubble {
          border: 1px solid rgba(105, 114, 150, 0.22);
          background: linear-gradient(145deg, #171d31, #101524);
          box-shadow: 0 5px 16px rgba(0, 0, 0, 0.12);
        }

        .userBubble {
          border: 1px solid rgba(120, 130, 170, 0.22);
          background: #252c48;
        }

        .welcomeBubble {
          padding: 8px 11px;
          border-radius: 14px;
          background: linear-gradient(145deg, #141a2d, #101422);
          border-color: rgba(137, 145, 195, 0.2);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .assistantTitle {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 7px;
          color: #c3b8f1;
          font-size: 12px;
        }

        .assistantTitle span {
          color: #b8a6ff;
          font-size: 15px;
          text-shadow: 0 0 5px rgba(170, 143, 255, 0.35);
        }

        .welcomeBubble .assistantTitle {
          margin-bottom: 3px;
          font-size: 11px;
        }

        .messageContent {
          color: #f1f1f7;
          font-size: 14px;
          line-height: 1.55;
          overflow-wrap: anywhere;
        }

        .welcomeBubble .messageContent {
          font-size: 13px;
          line-height: 1.45;
        }

        .messageContent strong {
          color: #fff;
          font-weight: 750;
        }

        .messageContent em {
          font-style: italic;
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
          color: #fff;
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
          align-items: flex-start;
          gap: 7px;
          margin: 5px 0;
        }

        .textBullet span:first-child {
          color: #b5a1ff;
        }

        .speakButton {
          width: 29px;
          height: 29px;
          margin-top: 7px;
          border: 0;
          border-radius: 9px;
          background: #20263b;
          color: #bec5df;
          font-size: 13px;
          cursor: pointer;
        }

        .suggestions {
          margin: 1px 0 18px 40px;
          max-width: 680px;
          animation: messageEnter 0.25s ease-out both;
        }

        .suggestionHeading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 4px 0 10px;
          color: #858eaf;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1px;
          text-align: center;
        }

        .headingLine {
          width: 18px;
          height: 1px;
          background: rgba(151, 145, 214, 0.3);
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
          border: 1px solid rgba(127, 135, 190, 0.22);
          border-radius: 12px;
          background: linear-gradient(145deg, #101526, #0b101c);
          color: #d7daf0;
          font-size: 11px;
          text-align: left;
          cursor: pointer;
          transition: background 0.18s ease, border-color 0.18s ease;
        }

        .suggestionIcon {
          flex: 0 0 23px;
          width: 23px;
          height: 23px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(157, 143, 255, 0.22);
          border-radius: 7px;
          background: rgba(105, 89, 183, 0.12);
          color: #b9adff;
          font-size: 15px;
        }

        .suggestionText {
          flex: 1;
          min-width: 0;
          line-height: 1.35;
        }

        .suggestionArrow {
          color: #8278bd;
          font-size: 13px;
        }

        .suggestionChip:active {
          background: #1a2038;
          border-color: rgba(157, 142, 255, 0.4);
        }

        .typing {
          display: flex;
          align-items: center;
          gap: 5px;
          height: 18px;
        }

        .typing span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #b4a0ff;
          animation: typing 1.2s infinite ease-in-out;
        }

        .typing span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .typing span:nth-child(3) {
          animation-delay: 0.3s;
        }

        .bottomArea {
          position: relative;
          z-index: 5;
          flex: 0 0 auto;
          width: 100%;
          padding: 7px 9px;
          padding-bottom: max(7px, env(safe-area-inset-bottom));
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          background: #03050c;
        }

        .inputBox {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          width: 100%;
          min-height: 52px;
          padding: 5px;
          border: 1px solid rgba(111, 120, 159, 0.25);
          border-radius: 17px;
          background: #101422;
          transition: border-color 0.2s;
        }

        .inputBox:focus-within {
          border-color: rgba(157, 127, 255, 0.45);
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
          color: #f5f5f8;
          padding: 9px 7px;
          font-size: 14px;
          line-height: 1.4;
        }

        .inputBox textarea::placeholder {
          color: #737b98;
        }

        .voiceButton,
        .sendButton {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 12px;
          cursor: pointer;
          transition: transform 0.18s ease;
        }

        .voiceButton {
          background: #191e30;
          color: #a0a8c7;
          font-size: 16px;
        }

        .voiceButton.active {
          background: #30223d;
          color: #ffb1df;
        }

        .sendButton {
          background: linear-gradient(135deg, #44358e, #292362);
          color: #e0d9ff;
          font-size: 21px;
        }

        .sendButton:not(:disabled):active,
        .voiceButton:active,
        .speakButton:active {
          transform: scale(0.94);
        }

        .sendButton:disabled {
          opacity: 0.42;
          cursor: default;
        }

        .footerCredit {
          padding-top: 6px;
          color: #68718d;
          text-align: center;
          font-size: 9px;
          letter-spacing: 0.25px;
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
            opacity: 0.07;
          }
          to {
            opacity: 0.13;
          }
        }

        @keyframes typing {
          0%, 70%, 100% {
            opacity: 0.4;
            transform: translateY(0);
          }
          35% {
            opacity: 1;
            transform: translateY(-3px);
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

          .bubble {
            padding: 10px 11px;
          }

          .welcomeBubble {
            padding: 8px 10px;
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
    </div>
  );
                }
