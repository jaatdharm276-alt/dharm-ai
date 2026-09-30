"use client";

import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([]);
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
        throw new Error(data.error || "Something went wrong");
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
          content: "Error: " + error.message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Arial, sans-serif;
          background: #020617;
        }

        .app {
          min-height: 100vh;
          color: white;
          overflow: hidden;
          position: relative;
          background:
            radial-gradient(circle at 20% 20%, rgba(0, 140, 255, .25), transparent 30%),
            radial-gradient(circle at 80% 30%, rgba(180, 0, 255, .22), transparent 30%),
            radial-gradient(circle at 50% 90%, rgba(0, 255, 220, .15), transparent 35%),
            #020617;
        }

        .glow {
          position: fixed;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          filter: blur(70px);
          opacity: .35;
          animation: float 7s ease-in-out infinite;
          pointer-events: none;
        }

        .glow1 {
          background: #008cff;
          top: 10%;
          left: -100px;
        }

        .glow2 {
          background: #b000ff;
          right: -100px;
          top: 40%;
          animation-delay: 2s;
        }

        .glow3 {
          background: #00e5ff;
          bottom: -120px;
          left: 30%;
          animation-delay: 4s;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-35px) scale(1.15);
          }
        }

        .container {
          width: min(720px, 100%);
          min-height: 100vh;
          margin: auto;
          padding: 25px 15px 30px;
          position: relative;
          z-index: 2;
        }

        .header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 22px;
        }

        .logo {
          width: 58px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          font-size: 31px;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.2);
          box-shadow:
            0 0 25px rgba(0,180,255,.6),
            inset 0 0 20px rgba(160,0,255,.2);
          animation: pulse 3s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(0,180,255,.45);
          }
          50% {
            box-shadow:
              0 0 40px rgba(180,0,255,.7),
              0 0 70px rgba(0,180,255,.3);
          }
        }

        .title {
          margin: 0;
          font-size: 30px;
          letter-spacing: .5px;
        }

        .subtitle {
          margin: 4px 0 0;
          color: #b9c8e8;
          font-size: 14px;
        }

        .chat {
          min-height: 58vh;
          max-height: 65vh;
          overflow-y: auto;
          padding: 18px;
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,.16);
          background: rgba(255,255,255,.055);
          backdrop-filter: blur(20px);
          box-shadow:
            0 0 45px rgba(0,100,255,.12),
            inset 0 0 30px rgba(255,255,255,.025);
        }

        .welcome {
          text-align: center;
          padding: 55px 15px;
          color: #dce7ff;
        }

        .welcome .lotus {
          font-size: 70px;
          animation: lotus 4s ease-in-out infinite;
          filter: drop-shadow(0 0 18px #7c3cff);
        }

        @keyframes lotus {
          0%, 100% {
            transform: scale(1) translateY(0);
          }
          50% {
            transform: scale(1.08) translateY(-8px);
          }
        }

        .welcome h2 {
          font-size: 25px;
          margin: 15px 0 8px;
        }

        .welcome p {
          color: #aebddd;
          margin: 0;
        }

        .message {
          padding: 14px 16px;
          margin: 12px 0;
          border-radius: 20px;
          line-height: 1.55;
          animation: appear .35s ease-out;
        }

        @keyframes appear {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .user {
          margin-left: 35px;
          background: linear-gradient(
            135deg,
            rgba(0,130,255,.28),
            rgba(90,0,255,.25)
          );
          border: 1px solid rgba(80,170,255,.45);
          box-shadow: 0 0 20px rgba(0,130,255,.12);
        }

        .assistant {
          margin-right: 15px;
          background: rgba(255,255,255,.075);
          border: 1px solid rgba(255,255,255,.15);
        }

        .name {
          font-weight: bold;
          margin-bottom: 6px;
        }

        .composer {
          margin-top: 18px;
          padding: 7px;
          display: flex;
          gap: 8px;
          align-items: center;
          border-radius: 25px;
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(100,190,255,.5);
          box-shadow:
            0 0 25px rgba(0,150,255,.18),
            inset 0 0 20px rgba(120,0,255,.08);
          animation: barGlow 4s ease-in-out infinite;
        }

        @keyframes barGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(0,150,255,.15);
          }
          50% {
            box-shadow:
              0 0 35px rgba(130,0,255,.35),
              0 0 60px rgba(0,190,255,.12);
          }
        }

        textarea {
          flex: 1;
          resize: none;
          min-height: 48px;
          max-height: 130px;
          border: none;
          outline: none;
          color: white;
          background: transparent;
          padding: 13px 12px;
          font-size: 16px;
        }

        textarea::placeholder {
          color: #91a2c5;
        }

        button {
          width: 48px;
          height: 48px;
          border: none;
          border-radius: 50%;
          color: white;
          font-size: 20px;
          cursor: pointer;
          background: linear-gradient(135deg, #008cff, #8b2cff);
          box-shadow: 0 0 22px rgba(80,80,255,.55);
          transition: transform .2s;
        }

        button:active {
          transform: scale(.9);
        }

        button:disabled {
          opacity: .55;
        }

        .thinking {
          color: #9db4dc;
          padding: 10px;
          animation: thinking 1.2s infinite;
        }

        @keyframes thinking {
          50% {
            opacity: .35;
          }
        }
      `}</style>

      <main className="app">
        <div className="glow glow1"></div>
        <div className="glow glow2"></div>
        <div className="glow glow3"></div>

        <div className="container">

          <header className="header">
            <div className="logo">🌸</div>

            <div>
              <h1 className="title">Dharm AI ✨</h1>
              <p className="subtitle">
                Wisdom in Every Question
              </p>
            </div>
          </header>

          <section className="chat">
            {messages.length === 0 && (
              <div className="welcome">
                <div className="lotus">🪷</div>
                <h2>Namaste 🙏</h2>
                <p>
                  Main Dharm AI hoon.<br />
                  Apna sawaal poochho.
                </p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message ${
                  msg.role === "user" ? "user" : "assistant"
                }`}
              >
                <div className="name">
                  {msg.role === "user" ? "You" : "Dharm AI ✨"}
                </div>

                <div>{msg.content}</div>
              </div>
            ))}

            {loading && (
              <div className="thinking">
                Dharm AI soch raha hai... ✨
              </div>
            )}
          </section>

          <form className="composer" onSubmit={sendMessage}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Dharm AI anything..."
              rows={1}
            />

            <button type="submit" disabled={loading}>
              ➤
            </button>
          </form>

        </div>
      </main>
    </>
  );
  }
