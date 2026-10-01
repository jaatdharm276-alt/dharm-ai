"use client";

import { useEffect, useRef, useState } from "react";

function formatInline(text) {
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const value = match[0];

    if (value.startsWith("**")) {
      parts.push(
        <strong key={parts.length}>
          {value.slice(2, -2)}
        </strong>
      );
    } else if (value.startsWith("`")) {
      parts.push(
        <code key={parts.length}>
          {value.slice(1, -1)}
        </code>
      );
    } else {
      parts.push(
        <em key={parts.length}>
          {value.slice(1, -1)}
        </em>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function formatMessage(text) {
  const lines = String(text || "").split("\n");
  const result = [];

  let listItems = [];
  let listType = null;

  const flushList = () => {
    if (listItems.length === 0) return;

    if (listType === "ol") {
      result.push(
        <ol key={`list-${result.length}`}>
          {listItems.map((item, index) => (
            <li key={index}>{formatInline(item)}</li>
          ))}
        </ol>
      );
    } else {
      result.push(
        <ul key={`list-${result.length}`}>
          {listItems.map((item, index) => (
            <li key={index}>{formatInline(item)}</li>
          ))}
        </ul>
      );
    }

    listItems = [];
    listType = null;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushList();

      result.push(
        <h3 key={`h3-${index}`}>
          {formatInline(trimmed.replace(/^### /, ""))}
        </h3>
      );

      return;
    }

    if (trimmed.startsWith("## ")) {
      flushList();

      result.push(
        <h2 key={`h2-${index}`}>
          {formatInline(trimmed.replace(/^## /, ""))}
        </h2>
      );

      return;
    }

    if (trimmed.startsWith("# ")) {
      flushList();

      result.push(
        <h1 key={`h1-${index}`}>
          {formatInline(trimmed.replace(/^# /, ""))}
        </h1>
      );

      return;
    }

    const bullet = trimmed.match(/^[-*•]\s+(.*)$/);

    if (bullet) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }

      listItems.push(bullet[1]);
      return;
    }

    const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);

    if (numbered) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }

      listItems.push(numbered[1]);
      return;
    }

    flushList();

    result.push(
      <p key={`p-${index}`}>
        {formatInline(line)}
      </p>
    );
  });

  flushList();

  return result;
}

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Namaste 🙏\n\nMain Dharm AI hoon. Aap Bhagavad Gita, Ramayana, Mahabharata, puja, mantra, dharma ya spiritual life se jude sawaal pooch sakte ho."
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);

  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, loading, typing]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  async function sendMessage(customMessage) {
    const message = String(
      customMessage !== undefined ? customMessage : input
    ).trim();

    if (!message || loading || typing) {
      return;
    }

    setInput("");

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: message
      }
    ]);

    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Server se response nahi mila."
        );
      }

      const reply =
        data?.reply ||
        "Maaf kijiye 🙏 Mujhe abhi response nahi mila.";

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: ""
        }
      ]);

      setLoading(false);
      setTyping(true);

      let currentText = "";

      for (let i = 0; i < reply.length; i++) {
        currentText += reply[i];

        const textNow = currentText;

        setMessages((previous) => {
          const updated = [...previous];

          updated[updated.length - 1] = {
            role: "assistant",
            content: textNow
          };

          return updated;
        });

        await new Promise((resolve) => {
          setTimeout(resolve, reply.length > 1200 ? 5 : 14);
        });
      }

      setTyping(false);
    } catch (error) {
      setLoading(false);
      setTyping(false);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            "Sorry 🙏\n\n" +
            (error?.message || "Kuch galat ho gaya.")
        }
      ]);
    }
  }

  function startVoice() {
    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Is browser mein voice input supported nahi hai."
      );
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

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        transcript += event.results[i][0].transcript;
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

    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  }

  function speakText(text) {
    if (
      typeof window === "undefined" ||
      !window.speechSynthesis
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = String(text)
      .replace(/[#*`]/g, "")
      .replace(/\n+/g, " ");

    const speech =
      new SpeechSynthesisUtterance(cleanText);

    speech.lang = "hi-IN";
    speech.rate = 0.95;

    window.speechSynthesis.speak(speech);
  }

  function useQuickPrompt(text) {
    setInput(text);

    setTimeout(() => {
      sendMessage(text);
    }, 50);
  }

  const quickPrompts = [
    "Bhagavad Gita ka saar batao",
    "Dharma kya hai?",
    "Hanuman ji ka mantra batao",
    "Aaj ka dharmik vichar batao"
  ];

  return (
    <main className="page">

      <div className="glow glowOne"></div>
      <div className="glow glowTwo"></div>

      <section className="app">

        <header className="header">

          <div className="brand">

            <div className="logo">
              🌸
            </div>

            <div>
              <div className="title">
                Dharm AI
              </div>

              <div className="status">
                <span></span>
                Online
              </div>
            </div>

          </div>

          <button
            className="magicButton"
            onClick={() =>
              useQuickPrompt(
                "Mujhe aaj ka ek shubh dharmik vichar batao"
              )
            }
          >
            ✦
          </button>

        </header>

        <section className="chatArea">

          <div className="chat">

            {messages.map((message, index) => (

              <div
                key={index}
                className={
                  message.role === "user"
                    ? "messageRow userRow"
                    : "messageRow assistantRow"
                }
              >

                {message.role === "assistant" && (
                  <div className="avatar">
                    🌸
                  </div>
                )}

                <div
                  className={
                    message.role === "user"
                      ? "bubble userBubble"
                      : "bubble assistantBubble"
                  }
                >

                  {message.role === "assistant" && (
                    <div className="assistantName">
                      <span>🌸</span>
                      <b>Dharm AI</b>
                    </div>
                  )}

                  <div className="messageText">

                    {message.content ? (
                      formatMessage(message.content)
                    ) : (
                      <div className="typingDots">
                        <i></i>
                        <i></i>
                        <i></i>
                      </div>
                    )}

                  </div>

                  {message.role === "assistant" &&
                    message.content && (
                      <button
                        className="speakButton"
                        onClick={() =>
                          speakText(message.content)
                        }
                      >
                        🔊
                      </button>
                    )}

                </div>

              </div>

            ))}

            {loading && (
              <div className="messageRow assistantRow">

                <div className="avatar">
                  🌸
                </div>

                <div className="bubble assistantBubble">

                  <div className="assistantName">
                    <span>🌸</span>
                    <b>Dharm AI</b>
                  </div>

                  <div className="typingDots">
                    <i></i>
                    <i></i>
                    <i></i>
                  </div>

                </div>

              </div>
            )}

            {messages.length === 1 && !loading && (
              <div className="quickArea">

                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() =>
                      useQuickPrompt(prompt)
                    }
                  >
                    {prompt}
                  </button>
                ))}

              </div>
            )}

            <div ref={bottomRef}></div>

          </div>

        </section>

        <footer className="inputArea">

          <div className="inputBox">

            <textarea
              value={input}
              rows={1}
              placeholder="Dharm AI se kuch poochiye..."
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
            />

            <button
              className={
                listening
                  ? "voiceButton active"
                  : "voiceButton"
              }
              onClick={startVoice}
            >
              🎙️
            </button>

            <button
              className="sendButton"
              disabled={
                !input.trim() ||
                loading ||
                typing
              }
              onClick={() => sendMessage()}
            >
              ➤
            </button>

          </div>

          <div className="footerText">
            Dharm AI • स्टुडेंट ओर रिसर्च के लिये📄
          </div>

        </footer>

      </section>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
        }

        body {
          overflow: hidden;
          background: #02040b;
          color: white;
          font-family:
            Arial,
            "Noto Sans Devanagari",
            sans-serif;
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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100svh;
  min-height: 100svh;
  overflow: hidden;
          background:
            radial-gradient(
              circle at 15% 0%,
              rgba(96, 66, 190, 0.18),
              transparent 30%
            ),
            radial-gradient(
              circle at 100% 100%,
              rgba(45, 75, 180, 0.14),
              transparent 32%
            ),
            #02040b;
        }

        .glow {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(80px);
          opacity: 0.2;
        }

        .glowOne {
          width: 260px;
          height: 260px;
          left: -100px;
          top: -100px;
          background: #754cff;
        }

        .glowTwo {
          width: 300px;
          height: 300px;
          right: -130px;
          bottom: -120px;
          background: #315dff;
        }

        .app {
          position: relative;
          z-index: 20;
          flex-shrink: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: rgba(3, 5, 12, 0.76);
        }

        .header {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding:
            max(14px, env(safe-area-inset-top))
            16px
            13px;
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.07);
          background: rgba(7, 9, 18, 0.92);
          backdrop-filter: blur(20px);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .logo {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background:
            linear-gradient(
              145deg,
              #292142,
              #14182a
            );
          font-size: 23px;
          box-shadow:
            0 8px 28px
              rgba(100, 70, 200, 0.2);
        }

        .title {
          font-size: 21px;
          font-weight: 800;
          letter-spacing: -0.3px;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 3px;
          color: #7d86a2;
          font-size: 12px;
        }

        .status span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #43e78d;
          box-shadow: 0 0 10px #43e78d;
        }

        .magicButton {
          width: 45px;
          height: 45px;
          border: 1px solid
            rgba(150, 125, 255, 0.25);
          border-radius: 14px;
          background: #111526;
          color: #ae96ff;
          font-size: 23px;
          cursor: pointer;
        }

        .chatArea {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        .chat {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px 13px 18px;
        }

        .messageRow {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-bottom: 18px;
        }

        .assistantRow {
          justify-content: flex-start;
        }

        .userRow {
          justify-content: flex-end;
        }

        .avatar {
          width: 39px;
          height: 39px;
          min-width: 39px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: #171d31;
          font-size: 18px;
        }

        .bubble {
          max-width: min(86%, 760px);
          border-radius: 22px;
          padding: 16px 18px;
          overflow-wrap: anywhere;
        }

        .assistantBubble {
          background:
            linear-gradient(
              145deg,
              #171d31,
              #101524
            );
          border: 1px solid
            rgba(105, 114, 150, 0.23);
          box-shadow:
            0 20px 45px
              rgba(0, 0, 0, 0.18);
        }

        .userBubble {
          background: #252c48;
          border: 1px solid
            rgba(120, 130, 170, 0.2);
        }

        .assistantName {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          color: #b2b7ca;
          font-size: 14px;
        }

        .assistantName span {
          font-size: 20px;
        }

        .messageText {
          color: #f4f4f8;
          font-size: 16px;
          line-height: 1.65;
        }

        .messageText p {
          margin: 0 0 11px;
        }

        .messageText p:last-child {
          margin-bottom: 0;
        }

        .messageText h1,
        .messageText h2,
        .messageText h3 {
          color: #ffffff;
          line-height: 1.3;
          margin:
            0 0 12px;
        }

        .messageText h1 {
          font-size: 24px;
        }

        .messageText h2 {
          font-size: 21px;
        }

        .messageText h3 {
          font-size: 19px;
        }

        .messageText ul,
        .messageText ol {
          margin:
            6px 0 13px;
          padding-left: 24px;
        }

        .messageText li {
          margin: 6px 0;
        }

        .messageText strong {
          color: #ffffff;
          font-weight: 800;
        }

        .messageText em {
          color: #c9baff;
        }

        .messageText code {
          padding: 2px 6px;
          border-radius: 6px;
          background: #080b14;
          color: #c6b8ff;
        }

        .speakButton {
          width: 36px;
          height: 36px;
          margin-top: 11px;
          border: 0;
          border-radius: 11px;
          background: #20263b;
          color: #bdc4df;
          cursor: pointer;
        }

        .typingDots {
          display: flex;
          align-items: center;
          gap: 5px;
          min-height: 22px;
        }

        .typingDots i {
          display: block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #9885dc;
          animation: typing 1.1s
            infinite ease-in-out;
        }

        .typingDots i:nth-child(2) {
          animation-delay: 0.15s;
        }

        .typingDots i:nth-child(3) {
          animation-delay: 0.3s;
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
            transform: translateY(-5px);
          }
        }

        .quickArea {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 9px;
          margin:
            5px 0 10px 48px;
        }

        .quickArea button {
          min-height: 48px;
          padding: 10px 12px;
          border: 1px solid
            rgba(125, 112, 190, 0.22);
          border-radius: 15px;
          background: #0e1220;
          color: #c8c4db;
          text-align: left;
          cursor: pointer;
        }

        .quickArea button:active {
          transform: scale(0.98);
        }

        .inputArea {
          flex: 0 0 auto;
          padding:
            9px
            12px
            max(10px, env(safe-area-inset-bottom));
          background:
            linear-gradient(
              180deg,
              rgba(3, 5, 12, 0.75),
              #03050c 45%
            );
        }

        .inputBox {
          display: flex;
          align-items: flex-end;
          gap: 7px;
          min-height: 62px;
          padding: 7px;
          border: 1px solid
            rgba(111, 120, 159, 0.25);
          border-radius: 22px;
          background: #101422;
          box-shadow:
            0 10px 35px
              rgba(0, 0, 0, 0.25);
        }

        textarea {
          flex: 1;
          min-width: 0;
          max-height: 120px;
          resize: none;
          outline: none;
          border: 0;
          background: transparent;
          color: #f5f5f8;
          padding:
            10px
            7px;
          font-size: 16px;
          line-height: 1.45;
        }

        textarea::placeholder {
          color: #737b98;
        }

        .voiceButton,
        .sendButton {
          flex: 0 0 auto;
          width: 47px;
          height: 47px;
          border: 0;
          border-radius: 15px;
          cursor: pointer;
        }

        .voiceButton {
          background: #191e30;
          color: #a0a8c7;
          font-size: 18px;
        }

        .voiceButton.active {
          background: #39243c;
          color: #ff9ed0;
        }

        .sendButton {
          background: #28235e;
          color: #c0b6ff;
          font-size: 24px;
        }

        .sendButton:disabled {
          opacity: 0.45;
          cursor: default;
        }

        .footerText {
          text-align: center;
          color: #505875;
          font-size: 10px;
          padding-top: 6px;
        }

        @media (max-width: 600px) {
          .chat {
            padding:
              15px
              10px
              15px;
          }

          .bubble {
            max-width: 90%;
          }

          .messageText {
            font-size: 16px;
          }

          .quickArea {
            margin-left: 0;
          }
        }

        @media (max-width: 430px) {
          .title {
            font-size: 20px;
          }

          .logo {
            width: 44px;
            height: 44px;
          }

          .magicButton {
            width: 43px;
            height: 43px;
          }

          .bubble {
            max-width: 91%;
            padding:
              15px
              16px;
          }

          .quickArea {
            grid-template-columns: 1fr;
          }

          .inputBox {
            min-height: 60px;
            border-radius: 20px;
          }

          .voiceButton,
          .sendButton {
            width: 45px;
            height: 45px;
          }
        }
      `}</style>

    </main>
  );
}
