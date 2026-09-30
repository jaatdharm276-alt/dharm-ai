"use client";

import { useEffect, useRef, useState } from "react";

function formatMessage(text) {
  if (!text) return null;

  const lines = text.split("\n");

  return lines.map((line, lineIndex) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);

    return (
      <div key={lineIndex} style={{ minHeight: line.trim() ? "1.5em" : "0.7em" }}>
        {parts.map((part, index) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={index}>
                {part.slice(2, -2)}
              </strong>
            );
          }

          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  });
}

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Namaste 🙏 Main Dharm AI hoon. Apna sawaal poochho.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(e) {
    e.preventDefault();

    const text = input.trim();

    if (!text || loading) return;

    const newMessages = [
      ...messages,
      {
        role: "user",
        content: text,
      },
    ];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Something went wrong"
        );
      }

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch (error) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: `Error: ${error.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="glow glow1"></div>
      <div className="glow glow2"></div>
      <div className="glow glow3"></div>

      <div className="container">

        {/* HEADER */}
        <header className="header">
          <div className="logoBox">
            🌸
          </div>

          <div>
            <h1>Dharm AI ✨</h1>
            <p>Wisdom in Every Question</p>
          </div>
        </header>

        {/* CHAT AREA */}
        <section className="chatBox">
          <div className="messages">

            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "message userMessage"
                    : "message aiMessage"
                }
              >
                <div className="messageName">
                  {message.role === "user"
                    ? "You"
                    : "Dharm AI ✨"}
                </div>

                <div className="messageText">
                  {formatMessage(message.content)}
                </div>
              </div>
            ))}

            {/* LOADING */}
            {loading && (
              <div className="message aiMessage">
                <div className="messageName">
                  Dharm AI ✨
                </div>

                <div className="typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

          </div>

          {/* INPUT */}
          <form
            onSubmit={sendMessage}
            className="inputArea"
          >
            <input
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              placeholder="Ask Dharm AI anything..."
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              ➤
            </button>
          </form>
        </section>

        <div className="footer">
          <span>✨ Powered by AI</span>
          <span>•</span>
          <span>Dharm AI</span>
        </div>

      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 10% 10%,
              rgba(0, 132, 255, 0.35),
              transparent 35%
            ),
            radial-gradient(
              circle at 90% 30%,
              rgba(140, 0, 255, 0.3),
              transparent 35%
            ),
            radial-gradient(
              circle at 50% 100%,
              rgba(0, 255, 220, 0.25),
              transparent 40%
            ),
            #030617;
          color: white;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .container {
          width: 100%;
          max-width: 900px;
          min-height: 100vh;
          margin: auto;
          padding: 28px 24px;
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
        }

        .glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          animation: float 7s ease-in-out infinite;
        }

        .glow1 {
          width: 220px;
          height: 220px;
          background: rgba(0, 120, 255, 0.22);
          top: 5%;
          left: -80px;
        }

        .glow2 {
          width: 250px;
          height: 250px;
          background: rgba(150, 0, 255, 0.2);
          right: -100px;
          top: 30%;
          animation-delay: 2s;
        }

        .glow3 {
          width: 240px;
          height: 240px;
          background: rgba(0, 255, 220, 0.18);
          bottom: -100px;
          left: 35%;
          animation-delay: 4s;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }

          50% {
            transform: translateY(-25px) scale(1.08);
          }
        }

        /* HEADER */

        .header {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-bottom: 28px;
        }

        .logoBox {
          width: 72px;
          height: 72px;
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 38px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow:
            0 0 30px rgba(0, 140, 255, 0.35),
            inset 0 0 25px rgba(255, 255, 255, 0.04);
          animation: logoGlow 3s ease-in-out infinite;
        }

        @keyframes logoGlow {
          0%,
          100% {
            box-shadow:
              0 0 25px rgba(0, 140, 255, 0.3),
              inset 0 0 20px rgba(255, 255, 255, 0.04);
          }

          50% {
            box-shadow:
              0 0 45px rgba(120, 60, 255, 0.5),
              inset 0 0 30px rgba(255, 255, 255, 0.08);
          }
        }

        h1 {
          margin: 0;
          font-size: 42px;
          line-height: 1.1;
          letter-spacing: -1px;
        }

        .header p {
          margin: 7px 0 0;
          color: rgba(255, 255, 255, 0.7);
          font-size: 19px;
        }

        /* CHAT */

        .chatBox {
          flex: 1;
          min-height: 500px;
          border-radius: 34px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          background: rgba(255, 255, 255, 0.065);
          border: 1px solid rgba(255, 255, 255, 0.17);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          box-shadow:
            0 30px 90px rgba(0, 0, 0, 0.35),
            inset 0 0 40px rgba(255, 255, 255, 0.025);
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 5px 4px 25px;
          scrollbar-width: thin;
        }

        .message {
          max-width: 88%;
          padding: 20px 22px;
          margin-bottom: 20px;
          border-radius: 27px;
          line-height: 1.7;
          font-size: 18px;
          animation: messageIn 0.35s ease;
        }

        @keyframes messageIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .userMessage {
          margin-left: auto;
          background:
            linear-gradient(
              135deg,
              rgba(0, 110, 255, 0.5),
              rgba(110, 0, 255, 0.5)
            );
          border: 1px solid rgba(80, 180, 255, 0.55);
          box-shadow:
            0 0 25px rgba(30, 110, 255, 0.15);
        }

        .aiMessage {
          margin-right: auto;
          background:
            linear-gradient(
              135deg,
              rgba(0, 130, 190, 0.22),
              rgba(100, 0, 160, 0.2)
            );
          border: 1px solid rgba(255, 255, 255, 0.18);
        }

        .messageName {
          font-size: 17px;
          font-weight: 700;
          margin-bottom: 9px;
        }

        .messageText {
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .messageText strong {
          font-weight: 800;
          color: white;
        }

        /* TYPING */

        .typing {
          display: flex;
          gap: 6px;
          padding: 8px 0;
        }

        .typing span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: white;
          animation: typing 1.2s infinite;
        }

        .typing span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .typing span:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes typing {
          0%,
          60%,
          100% {
            transform: translateY(0);
            opacity: 0.4;
          }

          30% {
            transform: translateY(-7px);
            opacity: 1;
          }
        }

        /* INPUT */

        .inputArea {
          height: 72px;
          display: flex;
          align-items: center;
          padding: 7px 8px 7px 22px;
          border-radius: 40px;
          background:
            linear-gradient(
              90deg,
              rgba(0, 120, 255, 0.13),
              rgba(0, 255, 220, 0.1),
              rgba(120, 0, 255, 0.15)
            );
          border: 1px solid rgba(80, 180, 255, 0.4);
          box-shadow:
            0 0 30px rgba(0, 150, 255, 0.12),
            inset 0 0 20px rgba(255, 255, 255, 0.025);
          animation: inputGlow 4s ease-in-out infinite;
        }

        @keyframes inputGlow {
          0%,
          100% {
            box-shadow:
              0 0 25px rgba(0, 150, 255, 0.12),
              inset 0 0 20px rgba(255, 255, 255, 0.025);
          }

          50% {
            box-shadow:
              0 0 40px rgba(100, 60, 255, 0.2),
              inset 0 0 25px rgba(255, 255, 255, 0.04);
          }
        }

        .inputArea input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          color: white;
          font-size: 18px;
        }

        .inputArea input::placeholder {
          color: rgba(190, 205, 240, 0.65);
        }

        .inputArea button {
          width: 58px;
          height: 58px;
          border: none;
          border-radius: 50%;
          color: white;
          font-size: 27px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            linear-gradient(
              135deg,
              #168cff,
              #6b2cff
            );
          box-shadow:
            0 0 25px rgba(70, 90, 255, 0.45);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .inputArea button:hover {
          transform: scale(1.08);
          box-shadow:
            0 0 40px rgba(100, 80, 255, 0.7);
        }

        .inputArea button:active {
          transform: scale(0.94);
        }

        .inputArea button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        /* FOOTER */

        .footer {
          display: flex;
          justify-content: center;
          gap: 9px;
          margin-top: 18px;
          color: rgba(255, 255, 255, 0.42);
          font-size: 13px;
        }

        /* MOBILE */

        @media (max-width: 600px) {
          .container {
            padding: 18px 14px;
          }

          .header {
            gap: 14px;
            margin-bottom: 18px;
          }

          .logoBox {
            width: 66px;
            height: 66px;
            font-size: 34px;
          }

          h1 {
            font-size: 34px;
          }

          .header p {
            font-size: 16px;
          }

          .chatBox {
            min-height: 0;
            height: calc(100vh - 150px);
            border-radius: 30px;
            padding: 18px;
          }

          .message {
            max-width: 94%;
            font-size: 17px;
            padding: 17px 18px;
            border-radius: 23px;
          }

          .inputArea {
            height: 66px;
            padding-left: 18px;
          }

          .inputArea input {
            font-size: 16px;
          }

          .inputArea button {
            width: 52px;
            height: 52px;
            font-size: 24px;
          }

          .footer {
            display: none;
          }
        }
      `}</style>
    </main>
  );
    }
