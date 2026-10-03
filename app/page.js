
"use client";

import { useEffect, useRef, useState } from "react";

function renderInline(text) {
  const parts = String(text || "").split(
    /(\*\*.*?\*\*|\*[^*\n]+\*)/g
  );

  return parts.map((part, index) => {
    if (
      part.startsWith("**") &&
      part.endsWith("**") &&
      part.length > 4
    ) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (
      part.startsWith("*") &&
      part.endsWith("*") &&
      part.length > 2
    ) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    return part;
  });
}

function formatText(text) {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !/^\s*```/.test(line));

  return lines.map((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return <div key={index} className="spaceLine" />;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);

    if (heading) {
      const Tag =
        heading[1].length === 1
          ? "h1"
          : heading[1].length === 2
            ? "h2"
            : "h3";

      return <Tag key={index}>{renderInline(heading[2])}</Tag>;
    }

    const bullet = trimmed.match(/^[-*•]\s+(.*)$/);

    if (bullet) {
      return (
        <div className="textBullet" key={index}>
          <span>•</span>
          <span>{renderInline(bullet[1])}</span>
        </div>
      );
    }

    const numbered = trimmed.match(/^(\d+[.)])\s+(.*)$/);

    if (numbered) {
      return (
        <div className="numberedLine" key={index}>
          <span className="numberLabel">{numbered[1]}</span>
          <span>{renderInline(numbered[2])}</span>
        </div>
      );
    }

    return <p key={index}>{renderInline(line)}</p>;
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
  const sendingRef = useRef(false);

  // Typing ke dauran har update par latest text neeche dikhayein.
  useEffect(() => {
    const area = chatAreaRef.current;

    if (!area || !shouldAutoScrollRef.current) return;

    const frame = requestAnimationFrame(() => {
      const currentArea = chatAreaRef.current;

      if (currentArea && shouldAutoScrollRef.current) {
        currentArea.scrollTop = currentArea.scrollHeight;
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();

      if (
        typeof window !== "undefined" &&
        window.speechSynthesis
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  async function sendMessage(text) {
    const message = String(
      text !== undefined ? text : input
    ).trim();

    if (!message || sendingRef.current) return;

    sendingRef.current = true;
    shouldAutoScrollRef.current = true;
    setInput("");
    setLoading(true);

    setMessages((old) => [
      ...old,
      { role: "user", content: message },
      { role: "assistant", content: "" }
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
      ).trim();

      if (!reply) {
        throw new Error("AI se khaali response mila.");
      }

      // Ek hi assistant message ko update karte hain.
      // Isse har chunk ke liye naya bubble nahi banta.
      const chunkSize = 4;
      const typingDelay = 24;

      for (let i = 0; i < reply.length; i += chunkSize) {
        const visibleText = reply.slice(0, i + chunkSize);

        setMessages((old) => {
          const updated = [...old];
          const lastIndex = updated.length - 1;

          if (updated[lastIndex]?.role === "assistant") {
            updated[lastIndex] = {
              ...updated[lastIndex],
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
      const errorText =
        error?.message ||
        "Kuch technical problem aa gayi. Dobara try karein.";

      setMessages((old) => {
        const updated = [...old];
        const lastIndex = updated.length - 1;

        if (updated[lastIndex]?.role === "assistant") {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: "Maaf kijiye 🙏\n\n" + errorText
          };
        } else {
          updated.push({
            role: "assistant",
            content: "Maaf kijiye 🙏\n\n" + errorText
          });
        }

        return updated;
      });
    } finally {
      sendingRef.current = false;
      setLoading(false);
      shouldAutoScrollRef.current = true;
    }
  }

  function handleChatScroll(event) {
    const area = event.currentTarget;

    if (loading) {
      shouldAutoScrollRef.current = true;
      area.scrollTop = area.scrollHeight;
      return;
    }

    const distanceFromBottom =
      area.scrollHeight - area.scrollTop - area.clientHeight;

    if (distanceFromBottom < 32) {
      shouldAutoScrollRef.current = true;
    } else {
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
      .replace(/^\s*```.*$/gm, "")
      .replace(/^#{1,3}\s+/gm, "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "hi-IN";
    utterance.rate = 0.95;

    window.speechSynthesis.speak(utterance);
  }

  function handleInputKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      sendMessage();
    }
  }

  const lastMessage = messages[messages.length - 1];
  const showTyping =
    loading &&
    lastMessage?.role === "assistant" &&
    !lastMessage.content;

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
                  fill="#ffffff"
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

                  {message.role === "assistant" &&
                  !message.content &&
                  loading &&
                  index === messages.length - 1 ? (
                    <div className="typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  ) : (
                    <div className="messageContent">
                      {formatText(message.content)}
                    </div>
                  )}

                  {message.role === "assistant" &&
                    message.content && (
                      <button
                        className="speakButton"
                        onClick={() => speak(message.content)}
                        aria-label="Jawab sunen"
                        title="Jawab sunen"
                        type="button"
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
                      type="button"
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
          </div>
        </main>

        <footer className="bottomArea">
          <div className="inputBox">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="ORION AI se kuch poochiye..."
              rows={1}
              aria-label="Apna message likhein"
              disabled={loading}
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
              type="button"
              disabled={loading}
            >
              🎙️
            </button>

            <button
              className="sendButton"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              aria-label="Message bhejein"
              title="Send"
              type="button"
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
          color: #29263d;
          background: #ffffff;
        }

        .backgroundGlow {
          position: absolute;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(75px);
          opacity: 0.16;
          animation: orionGlow 7s ease-in-out infinite alternate;
        }

        .glowOne {
          left: -100px;
          top: -100px;
          background: #a895ff;
        }

        .glowTwo {
          right: -100px;
          bottom: -100px;
          background: #d8aaff;
          animation-delay: 3s;
        }

        .app {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.96);
        }

        .header {
          position: relative;
          z-index: 5;
          flex: 0 0 auto;
          min-height: 72px;
          display: flex;
          align-items: center;
          padding: 8px 13px;
          border-bottom: 1px solid #e5ddff;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 3px 14px rgba(128, 99, 213, 0.06);
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
          border: 1px solid #d6c8ff;
          border-radius: 13px;
          background: linear-gradient(145deg, #ffffff, #f4efff);
          box-shadow: 0 0 13px rgba(137, 105, 255, 0.25);
        }

        .logo svg {
          width: 34px;
          height: 34px;
        }

        .brandInfo {
          min-width: 0;
        }

        .brandName {
          color: #292044;
          font-size: 19px;
          font-weight: 900;
          letter-spacing: 1.1px;
          line-height: 1.15;
          text-shadow: 0 0 7px rgba(140, 133, 255, 0.15);
        }

        .brandName span {
          color: #8d72e8;
          text-shadow: 0 0 6px rgba(146, 126, 255, 0.25);
        }

        .brandTagline {
          margin-top: 3px;
          color: #625d70;
          font-size: 10px;
        }

        .brandCredit {
          margin-top: 2px;
          color: #9487bc;
          font-size: 9px;
        }

        .online {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 3px;
          color: #777386;
          font-size: 11px;
        }

        .online span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #32bd83;
          box-shadow: 0 0 5px rgba(50, 189, 131, 0.35);
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
          scrollbar-color: #d9cffb transparent;
        }

        .chatArea::-webkit-scrollbar {
          width: 4px;
        }

        .chatArea::-webkit-scrollbar-thumb {
          background: #d9cffb;
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
          border: 1px solid #ded5ff;
          border-radius: 11px;
          background: #ffffff;
          box-shadow: 0 0 8px rgba(137, 105, 255, 0.15);
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
          border: 1px solid #e1d8ff;
          background: linear-gradient(145deg, #ffffff, #faf8ff);
          box-shadow: 0 5px 18px rgba(119, 91, 202, 0.08);
        }

        .userBubble {
          border: 1px solid #cfc0ff;
          background: linear-gradient(145deg, #f5f1ff, #eee8ff);
          color: #29263d;
        }

        .welcomeBubble {
          padding: 8px 11px;
          border-radius: 14px;
          background: linear-gradient(145deg, #ffffff, #faf8ff);
          border-color: #e1d8ff;
          box-shadow: 0 4px 12px rgba(119, 91, 202, 0.08);
        }

        .assistantTitle {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 7px;
          color: #7561b8;
          font-size: 12px;
        }

        .assistantTitle span {
          color: #8d72e8;
          font-size: 15px;
          text-shadow: 0 0 5px rgba(170, 143, 255, 0.25);
        }

        .welcomeBubble .assistantTitle {
          margin-bottom: 3px;
          font-size: 11px;
        }
      
      
        .messageContent {
          color: #302d40;
          font-size: 14px;
          line-height: 1.55;
          overflow-wrap: anywhere;
        }

        .welcomeBubble .messageContent {
          font-size: 13px;
          line-height: 1.45;
        }

        .messageContent strong {
          color: #4d408f;
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
          color: #342654;
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

        .textBullet,
        .numberedLine {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          margin: 5px 0;
        }

        .textBullet span:first-child,
        .numberLabel {
          flex: 0 0 auto;
          color: #8d72e8;
        }

        .speakButton {
          width: 30px;
          height: 30px;
          margin-top: 7px;
          border: 1px solid #e1d8ff;
          border-radius: 9px;
          background: #f6f2ff;
          color: #7964c5;
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
          color: #8a819f;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1px;
          text-align: center;
        }

        .headingLine {
          width: 18px;
          height: 1px;
          background: #e0d7f8;
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
          border: 1px solid #e3dbfa;
          border-radius: 12px;
          background: linear-gradient(145deg, #ffffff, #faf8ff);
          color: #4a4263;
          font-size: 11px;
          text-align: left;
          cursor: pointer;
          transition:
            background 0.18s ease,
            border-color 0.18s ease;
        }

        .suggestionIcon {
          flex: 0 0 23px;
          width: 23px;
          height: 23px;
          display: grid;
          place-items: center;
          border: 1px solid #e0d5ff;
          border-radius: 7px;
          background: #f5f0ff;
          color: #8c73dc;
          font-size: 15px;
        }

        .suggestionText {
          flex: 1;
          min-width: 0;
          line-height: 1.35;
        }

        .suggestionArrow {
          color: #8d72c5;
          font-size: 13px;
        }

        .suggestionChip:active {
          background: #f0eaff;
          border-color: #c9b8ff;
        }

        .typing {
          display: flex;
          align-items: center;
          gap: 5px;
          height: 18px;
          padding: 2px 0;
        }

        .typing span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #9b83ed;
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
          border-top: 1px solid #eee8ff;
          background: #ffffff;
          box-shadow: 0 -3px 14px rgba(128, 99, 213, 0.04);
        }

        .inputBox {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          width: 100%;
          min-height: 52px;
          padding: 5px;
          border: 1px solid #d9ceff;
          border-radius: 17px;
          background: #ffffff;
          box-shadow: 0 3px 12px rgba(128, 99, 213, 0.08);
          transition:
            border-color 0.2s,
            box-shadow 0.2s;
        }

        .inputBox:focus-within {
          border-color: #a993f3;
          box-shadow: 0 3px 15px rgba(128, 99, 213, 0.13);
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
          color: #302d40;
          padding: 9px 7px;
          font-size: 14px;
          line-height: 1.4;
        }

        .inputBox textarea::placeholder {
          color: #9993aa;
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
          background: #f5f1ff;
          color: #8069ca;
          font-size: 16px;
        }

        .voiceButton.active {
          background: #eee2ff;
          color: #9d4dbe;
        }

        .sendButton {
          background: linear-gradient(135deg, #b9a5ff, #9275e4);
          color: #ffffff;
          font-size: 21px;
          box-shadow: 0 3px 9px rgba(142, 112, 220, 0.18);
        }

        .sendButton:not(:disabled):active,
        .voiceButton:active,
        .speakButton:active {
          transform: scale(0.94);
        }

        .sendButton:disabled,
        .voiceButton:disabled {
          opacity: 0.55;
          cursor: default;
        }

        .footerCredit {
          padding-top: 6px;
          color: #9588b8;
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
            opacity: 0.10;
          }
          to {
            opacity: 0.20;
          }
        }

        @keyframes typing {
          0%,
          70%,
          100% {
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
            
