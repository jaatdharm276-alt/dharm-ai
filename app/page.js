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
  {
    icon: "✦",
    title: "Image banao",
    prompt: "Ek futuristic glowing purple robot ka cinematic image banao."
  }
];

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Namaste 🙏\n\nMain ORION AI hoon — aapka intelligent companion. Aap mujhse sawaal pooch sakte ho ya AI image banwa sakte ho."
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [imageMode, setImageMode] = useState(false);

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

    const generateImage = imageMode;

    shouldAutoScrollRef.current = true;
    setInput("");
    setLoading(true);

    setMessages((old) => [
      ...old,
      {
        role: "user",
        content: message,
        kind: generateImage ? "image-request" : "text"
      }
    ]);

    try {
      if (generateImage) {
        setMessages((old) => [
          ...old,
          {
            role: "assistant",
            content: "Aapki image ban rahi hai... 🎨",
            kind: "image-loading"
          }
        ]);

        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ prompt: message })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "Image generate nahi ho payi."
          );
        }

        setMessages((old) => {
          const updated = [...old];
          const lastIndex = updated.length - 1;

          updated[lastIndex] = {
            role: "assistant",
            content: data.message || "Aapki image taiyar hai! ✨",
            image: data.image,
            kind: "image"
          };

          return updated;
        });

        setImageMode(false);
      } else {
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

            if (
              lastMessage?.role === "assistant" &&
              !lastMessage.image
            ) {
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

                  {message.image && (
                    <div className="generatedImageBox">
                      <img
                        src={message.image}
                        alt="ORION AI generated image"
                        className="generatedImage"
                      />
                      <a
                        href={message.image}
                        download={`orion-ai-${Date.now()}.png`}
                        className="downloadImage"
                      >
                        ⬇ Image Download Karein
                      </a>
                    </div>
                  )}

                  <div className="messageContent">
                    {formatText(message.content)}
                  </div>

                  {message.role === "assistant" &&
                    message.content &&
                    !message.image &&
                    message.kind !== "image-loading" && (
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
                {imageMode
                  ? "Image generate karne ke liye taiyar..."
                  : "ORION AI jawab taiyar kar raha hai..."}
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
                      onClick={() => {
                        if (item.title === "Image banao") {
                          setImageMode(true);
                          setInput(item.prompt);
                        } else {
                          sendMessage(item.prompt);
                        }
                      }}
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
          {imageMode && (
            <div className="imageModeNotice">
              <span>✦ Image Generation Mode ON</span>
              <button
                onClick={() => setImageMode(false)}
                aria-label="Image mode band karein"
              >
                ✕
              </button>
            </div>
          )}

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
              placeholder={
                imageMode
                  ? "Kaisi image banani hai? Likho..."
                  : "ORION AI se kuch poochiye..."
              }
              rows={1}
              aria-label="Message likhein"
            />

            <button
              className={
                imageMode
                  ? "imageButton imageButtonActive"
                  : "imageButton"
              }
              onClick={() => setImageMode((old) => !old)}
              title="AI image generation"
              aria-label="Image mode toggle"
            >
              🎨
            </button>

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

        .brandName {
          color: #f5f2ff;
          font-size: 19px;
          font-weight: 900;
          letter-spacing: 1.1px;
        }

        .brandName span {
          color: #b9b0ff;
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
          color: #b8a6ff;
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
        }

        .messageContent {
          color: #f1f1f7;
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
          cursor: pointer;
        }

        .generatedImageBox {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          max-width: 500px;
          margin: 8px 0 12px;
        }

        .generatedImage {
          display: block;
          width: 100%;
          height: auto;
          max-height: 650px;
          object-fit: contain;
          border: 1px solid rgba(166, 148, 255, 0.3);
          border-radius: 13px;
          background: #0b1020;
        }

        .downloadImage {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 13px;
          border: 1px solid rgba(153, 139, 255, 0.35);
          border-radius: 11px;
          background: #252044;
          color: #e5dcff;
          font-size: 12px;
          text-decoration: none;
        }

        .suggestions {
          margin: 1px 0 18px 40px;
          max-width: 680px;
        }

        .suggestionHeading {
          margin: 5px 0 10px;
          color: #858eaf;
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
          border: 1px solid rgba(127, 135, 190, 0.22);
          border-radius: 12px;
          background: linear-gradient(145deg, #101526, #0b101c);
          color: #d7daf0;
          font-size: 11px;
          text-align: left;
          cursor: pointer;
        }

        .suggestionIcon {
          color: #b9adff;
          font-size: 15px;
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
          color: #b9adff;
          font-size: 12px;
        }

        .loadingDot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #b9adff;
          box-shadow: 0 0 12px #8875ff;
          animation: typing 1s infinite alternate;
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

        .imageModeNotice {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 7px;
          padding: 7px 10px;
          border: 1px solid rgba(153, 139, 255, 0.25);
          border-radius: 10px;
          background: #15132b;
          color: #c9bcff;
          font-size: 11px;
        }

        .imageModeNotice button {
          border: 0;
          background: transparent;
          color: #c9bcff;
          cursor: pointer;
        }

        .inputBox {
          display: flex;
          align-items: flex-end;
          gap: 5px;
          width: 100%;
          min-height: 52px;
          padding: 5px;
          border: 1px solid rgba(111, 120, 159, 0.25);
          border-radius: 17px;
          background: #101422;
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

        .imageButton,
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
        }

        .imageButton {
          background: #191e30;
          color: #b7a6ff;
          font-size: 16px;
        }

        .imageButtonActive {
          background: #372b65;
          box-shadow: inset 0 0 0 1px #8c79ff;
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
          from { opacity: 0.07; }
          to { opacity: 0.13; }
        }

        @keyframes typing {
          from { opacity: 0.35; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1.1); }
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

          .imageButton,
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
  export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "Gemini API key nahi mili. Vercel Environment Variables mein GEMINI_API_KEY add karein."
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const prompt = String(body?.prompt || "").trim();

    if (!prompt) {
      return Response.json(
        { error: "Image banane ke liye prompt likhein." },
        { status: 400 }
      );
    }

    if (prompt.length > 4000) {
      return Response.json(
        {
          error:
            "Prompt bahut lamba hai. Kripya 4000 characters se kam likhein."
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          model: "gemini-3.1-flash-image",
          input:
            "Generate a high-quality image based on this user prompt. " +
            "Create the image itself, not just a description. " +
            "Prompt: " +
            prompt,
          response_format: {
            type: "image",
            mime_type: "image/png",
            aspect_ratio: "1:1",
            image_size: "1K"
          }
        }),
        signal: AbortSignal.timeout(55000)
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Gemini image API error:", result);

      const message =
        result?.error?.message ||
        "Gemini image generation request fail ho gayi.";

      return Response.json(
        { error: message },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    let imageData = result?.output_image?.data;
    let mimeType =
      result?.output_image?.mime_type || "image/png";

    // Agar image output_image ke bajay steps mein aaye.
    if (!imageData && Array.isArray(result?.steps)) {
      for (const step of result.steps) {
        if (step?.type !== "model_output") continue;

        for (const item of step?.content || []) {
          if (item?.type === "image" && item?.data) {
            imageData = item.data;
            mimeType = item.mime_type || "image/png";
            break;
          }
        }

        if (imageData) break;
      }
    }

    if (!imageData) {
      console.error(
        "Gemini response mein image nahi mili:",
        JSON.stringify(result).slice(0, 1500)
      );

      return Response.json(
        {
          error:
            "Gemini ne image return nahi ki. Dobara try karein ya API/model availability check karein."
        },
        { status: 502 }
      );
    }

    return Response.json({
      success: true,
      message: "Aapki image taiyar hai! ✨",
      image: `data:${mimeType};base64,${imageData}`
    });
  } catch (error) {
    console.error("Image generation error:", error);

    return Response.json(
      {
        error:
          error?.name === "TimeoutError"
            ? "Image banane mein zyada samay laga. Dobara try karein."
            : error?.message ||
              "Image generate karte waqt technical problem aa gayi."
      },
      { status: 500 }
    );
  }
}                  }
