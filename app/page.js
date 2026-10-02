"use client";

import { useEffect, useRef, useState } from "react";

function renderInline(text) {
  const parts = String(text || "").split(
    /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  );

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function formatText(text) {
  return String(text || "").split("\n").map((line, i) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return <div key={i} className="spaceLine" />;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const Tag =
        heading[1].length === 1 ? "h1" :
        heading[1].length === 2 ? "h2" : "h3";

      return <Tag key={i}>{renderInline(heading[2])}</Tag>;
    }

    const numbered = trimmed.match(/^\*{0,2}(\d+)[.)]\s+(.*?)\*{0,2}$/);
    if (numbered) {
      return (
        <div className="numbered" key={i}>
          <span>{numbered[1]}.</span>
          <span>{renderInline(numbered[2].replace(/\*\*/g, ""))}</span>
        </div>
      );
    }

    const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      return (
        <div className="bullet" key={i}>
          <span>•</span>
          <span>{renderInline(bullet[1])}</span>
        </div>
      );
    }

    return <p key={i}>{renderInline(line)}</p>;
  });
}

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
  const recognitionRef = useRef(null);

const shouldAutoScrollRef = useRef(true);

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
setInput("");   setMessages((old) => [
      ...old,
      { role: "user", content: message }
    ]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Server response nahi mila.");
      }

      setMessages((old) => [
        ...old,
        {
          role: "assistant",
          content: data?.reply || "Maaf kijiye 🙏 Abhi response nahi mila."
        }
      ]);
    } catch (error) {
      setMessages((old) => [
        ...old,
        {
          role: "assistant",
          content:
            "Maaf kijiye 🙏\n\n" +
            (error?.message || "Kuch technical problem aa gayi.")
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function startVoice() {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

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
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const cleanText = String(text)
      .replace(/[#*`]/g, "")
      .replace(/\n/g, " ");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "hi-IN";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="page">
      <div className="backgroundGlow glow1" />
      <div className="backgroundGlow glow2" />

      <div className="app">
        <header className="header">
          <div className="brand">
            <div className="logo"><span>✦</span></div>

            <div className="brandInfo">
              <div className="brandName">ORION <span>AI</span></div>
              <div className="brandTagline">Your Intelligent Companion</div>
              <div className="brandCredit">Powered by Dharm AI</div>
              <div className="online"><span />Online</div>
            </div>
          </div>
        </header>

        <main
  ref={chatAreaRef}
  className="chatArea"
  onScroll={(event) => {
    const el = event.currentTarget;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;

    shouldAutoScrollRef.current = distanceFromBottom < 100;
  }}
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
                      <span>✦</span><b>ORION AI</b>
                    </div>
                  )}

                  <div className="messageContent">
                    {formatText(message.content)}
                  </div>

                  {message.role === "assistant" && (
                    <button
                      className="speakButton"
                      onClick={() => speak(message.content)}
                      aria-label="Jawab sunein"
                      title="Jawab sunein"
                    >
                      🔊
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="message assistantMessage">
                <div className="avatar">✦</div>
                <div className="bubble assistantBubble">
                  <div className="assistantTitle">
                    <span>✦</span><b>ORION AI</b>
                  </div>
                  <div className="typing">
                    <span /><span /><span />
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
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="ORION AI se kuch poochiye..."
              rows={1}
            />

            <button
              className={listening ? "voiceButton active" : "voiceButton"}
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
              aria-label="Send"
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
          background: #02040b;
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
          background:
            radial-gradient(
              circle at 10% 0%,
              rgba(94, 65, 190, 0.15),
              transparent 32%
            ),
            radial-gradient(
              circle at 100% 100%,
              rgba(45, 75, 180, 0.12),
              transparent 35%
            ),
            #02040b;
          color: #fff;
        }

        .backgroundGlow {
          position: absolute;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(85px);
          opacity: 0.16;
          animation: glowPulse 7s ease-in-out infinite alternate;
        }

        .glow1 {
          left: -120px;
          top: -120px;
          background: #704cff;
        }

        .glow2 {
          right: -140px;
          bottom: -140px;
          background: #315dff;
          animation-delay: 2s;
        }

        .app {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
          background: rgba(3, 5, 12, 0.82);
        }

        .header {
          position: relative;
          z-index: 5;
          flex: 0 0 auto;
          min-height: 72px;
          display: flex;
          align-items: center;
          padding: 8px 13px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(7, 9, 18, 0.97);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .logo {
          position: relative;
          isolation: isolate;
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(174, 144, 255, 0.45);
          border-radius: 13px;
          background: linear-gradient(145deg, #292142, #14182a);
          color: #e0d5ff;
          font-size: 24px;
          box-shadow: 0 0 10px rgba(128, 83, 255, 0.25);
          animation: logoPulse 4s ease-in-out infinite alternate;
        }

        .logo span {
          position: relative;
          z-index: 1;
          text-shadow: 0 0 8px #b69cff;
        }

        .brandInfo {
          min-width: 0;
        }

        .brandName {
          color: #fff;
          font-size: 19px;
          font-weight: 900;
          letter-spacing: 1.1px;
          line-height: 1.15;
          text-shadow: 0 0 10px rgba(155, 127, 255, 0.3);
        }

        .brandName span {
          color: #b7a4ff;
        }

        .brandTagline {
          margin-top: 2px;
          color: #c7c9e4;
          font-size: 10px;
        }

        .brandCredit {
          margin-top: 2px;
          color: #9184c6;
          font-size: 9px;
        }

        .online {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 3px;
          color: #8b94b0;
          font-size: 11px;
        }

        .online span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #43e78d;
          box-shadow: 0 0 7px #43e78d;
          animation: onlinePulse 2.5s ease-in-out infinite;
        }

        .chatArea {
          flex: 1 1 0;
          min-height: 0;
          width: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          scroll-behavior: smooth;
        }

        .chat {
          width: 100%;
          max-width: 850px;
          margin: 0 auto;
          padding: 14px 10px 18px;
        }

        .message {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          width: 100%;
          margin-bottom: 12px;
          animation: messageEnter 0.22s ease-out both;
        }

        .assistantMessage {
          justify-content: flex-start;
        }

        .userMessage {
          justify-content: flex-end;
        }

        .avatar {
          width: 31px;
          height: 31px;
          flex: 0 0 31px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(157, 129, 255, 0.2);
          border-radius: 11px;
          background: #171d31;
          color: #c9b8ff;
          font-size: 20px;
          text-shadow: 0 0 8px #9473ff;
        }

        .bubble {
          max-width: min(90%, 720px);
          padding: 11px 13px;
          border-radius: 17px;
          overflow-wrap: anywhere;
          min-width: 0;
        }

        .assistantBubble {
          border: 1px solid rgba(105, 114, 150, 0.22);
          background: linear-gradient(145deg, #171d31, #101524);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
        }

        .userBubble {
          border: 1px solid rgba(120, 130, 170, 0.2);
          background: #252c48;
        }

        .assistantTitle {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 7px;
          color: #c0b5ec;
          font-size: 12px;
        }

        .assistantTitle span {
          color: #c1adff;
          font-size: 16px;
          text-shadow: 0 0 8px rgba(170, 143, 255, 0.65);
          animation: miniGlow 4s ease-in-out infinite;
        }

        .messageContent {
          color: #f4f4f8;
          font-size: 14px;
          line-height: 1.55;
          overflow-wrap: anywhere;
          word-break: normal;
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
          line-height: 1.3;
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
          height: 4px;
        }

        .bullet,
        .numbered {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          margin: 5px 0;
        }

        .bullet span:first-child,
        .numbered span:first-child {
          flex: 0 0 auto;
          color: #b5a1ff;
          font-weight: 700;
        }

        .speakButton {
          width: 30px;
          height: 30px;
          margin-top: 8px;
          border: 0;
          border-radius: 9px;
          background: #20263b;
          color: #bec5df;
          font-size: 13px;
          cursor: pointer;
          transition: transform 0.18s ease;
        }

        .speakButton:active {
          transform: scale(0.92);
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
          box-shadow: 0 0 6px rgba(180, 160, 255, 0.4);
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
          background: #03050c;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
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
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .inputBox:focus-within {
          border-color: rgba(157, 127, 255, 0.5);
          box-shadow: 0 0 12px rgba(111, 75, 255, 0.12);
        }

        textarea {
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

        textarea::placeholder {
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
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .voiceButton {
          background: #191e30;
          color: #a0a8c7;
          font-size: 16px;
        }

        .voiceButton.active {
          background: #39243c;
          color: #ff9ed0;
          box-shadow: 0 0 10px rgba(255, 100, 200, 0.16);
          animation: onlinePulse 1.2s infinite;
        }

        .sendButton {
          background: linear-gradient(135deg, #44358e, #292362);
          color: #e0d9ff;
          font-size: 21px;
          box-shadow: 0 0 10px rgba(91, 73, 210, 0.15);
        }

        .sendButton:not(:disabled):active,
        .voiceButton:active {
          transform: scale(0.93);
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
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes glowPulse {
          from {
            opacity: 0.1;
          }
          to {
            opacity: 0.2;
          }
        }

        @keyframes logoPulse {
          from {
            box-shadow: 0 0 7px rgba(128, 83, 255, 0.2);
          }
          to {
            box-shadow: 0 0 13px rgba(128, 83, 255, 0.4);
          }
        }

        @keyframes miniGlow {
          0%, 100% {
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes onlinePulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.55;
          }
        }

        @keyframes typing {
          0%, 70%, 100% {
            opacity: 0.4;
            transform: translateY(0);
          }
          35% {
            opacity: 1;
            transform: translateY(-4px);
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
            font-size: 21px;
          }

          .messageContent {
            font-size: 13px;
          }

          .bubble {
            padding: 10px 11px;
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
