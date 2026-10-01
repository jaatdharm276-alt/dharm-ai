"use client";

import { useEffect, useRef, useState } from "react";

function renderInline(text) {
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    if (
      part.startsWith("**") &&
      part.endsWith("**")
    ) {
      return (
        <strong key={index}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function formatMessage(text) {
  if (!text) return null;

  const lines = text.split("\n");

  return lines.map((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("### ")) {
      return (
        <h3 key={index} className="markdownH3">
          {renderInline(trimmed.slice(4))}
        </h3>
      );
    }

    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={index} className="markdownH2">
          {renderInline(trimmed.slice(3))}
        </h2>
      );
    }

    if (trimmed.startsWith("# ")) {
      return (
        <h1 key={index} className="markdownH1">
          {renderInline(trimmed.slice(2))}
        </h1>
      );
    }

    if (trimmed.startsWith("- ")) {
      return (
        <div key={index} className="bulletLine">
          <span className="bulletDot">•</span>
          <span>{renderInline(trimmed.slice(2))}</span>
        </div>
      );
    }

    const numbered = trimmed.match(/^(\d+)\.\s+(.*)/);

    if (numbered) {
      return (
        <div key={index} className="numberedLine">
          <span className="numberDot">
            {numbered[1]}.
          </span>

          <span>
            {renderInline(numbered[2])}
          </span>
        </div>
      );
    }

    return (
      <div
        key={index}
        className="normalLine"
        style={{
          minHeight: trimmed ? "1.5em" : "0.7em",
        }}
      >
        {renderInline(line)}
      </div>
    );
  });
}

function speakText(text) {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(text);

  utterance.lang = /[\u0900-\u097F]/.test(text)
    ? "hi-IN"
    : "en-IN";

  utterance.rate = 0.95;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
}

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Namaste 🙏 Main Dharm AI hoon.\n\nApna sawaal poochho.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isReplyTyping, setIsReplyTyping] =
    useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function sendMessage(e) {
    e.preventDefault();

    const text = input.trim();

    if (
      !text ||
      loading ||
      isReplyTyping
    ) {
      return;
    }

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
          data.error ||
            "Something went wrong"
        );
      }

      const reply =
        data.reply ||
        "No response received.";

      setLoading(false);
      setIsReplyTyping(true);

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "",
        },
      ]);

      let current = "";

      for (
        let i = 0;
        i < reply.length;
        i += 2
      ) {
        current = reply.slice(
          0,
          i + 2
        );

        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: current,
          },
        ]);

        await new Promise((resolve) =>
          setTimeout(resolve, 15)
        );
      }

      setIsReplyTyping(false);
    } catch (error) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            `Error: ${error.message}`,
        },
      ]);

      setIsReplyTyping(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">

      {/* AMBIENT GLOW */}

      <div className="ambient ambientBlue" />
      <div className="ambient ambientPurple" />
      <div className="ambient ambientCyan" />

      {/* IPHONE FRAME */}

      <div className="phoneFrame">

        {/* DYNAMIC ISLAND */}

        <div className="dynamicIsland">
          <div className="cameraDot" />
          <div className="speakerLine" />
        </div>

        {/* TOP BAR */}

        <header className="topBar">

          <div className="brand">

            <div className="brandIcon">
              🌸
            </div>

            <div>
              <div className="brandTitle">
                Dharm AI
                <span>✨</span>
              </div>

              <div className="brandStatus">
                <span className="onlineDot" />
                Online
              </div>
            </div>

          </div>

          <div className="topGlow">
            ✦
          </div>

        </header>

        {/* CHAT */}

        <section className="chatScreen">

          <div className="messages">

            {messages.length === 1 && (
              <div className="welcomeCard">

                <div className="welcomeGlow">
                  🪷
                </div>

                <div className="welcomeTitle">
                  Namaste 🙏
                </div>

                <div className="welcomeText">
                  Main Dharm AI hoon.
                  <br />
                  Apna sawaal poochho.
                </div>

                <div className="welcomeLine">
                  Wisdom in Every Question
                </div>

              </div>
            )}

            {messages.map(
              (message, index) => {

                const isAI =
                  message.role ===
                  "assistant";

                return (
                  <div
                    key={index}
                    className={
                      isAI
                        ? "message aiMessage"
                        : "message userMessage"
                    }
                  >

                    <div className="messageHeader">

                      <div className="messageAvatar">
                        {isAI
                          ? "🌸"
                          : "👤"}
                      </div>

                      <div className="messageName">
                        {isAI
                          ? "Dharm AI"
                          : "You"}
                      </div>

                    </div>

                    <div className="messageText">
                      {formatMessage(
                        message.content
                      )}
                    </div>

                    {isAI &&
                      message.content &&
                      !message.content.startsWith(
                        "Error:"
                      ) && (
                        <button
                          className="listenButton"
                          onClick={() =>
                            speakText(
                              message.content
                            )
                          }
                        >
                          🔊 सुनें
                        </button>
                      )}

                  </div>
                );
              }
            )}

            {/* LOADING */}

            {loading && (
              <div className="message aiMessage">

                <div className="messageHeader">

                  <div className="messageAvatar">
                    🌸
                  </div>

                  <div className="messageName">
                    Dharm AI
                  </div>

                </div>

                <div className="typing">

                  <span />
                  <span />
                  <span />

                </div>

              </div>
            )}

            <div ref={messagesEndRef} />

          </div>

          {/* INPUT */}

          <form
            onSubmit={sendMessage}
            className="inputWrapper"
          >

            <div className="inputGlow" />

            <div className="inputArea">

              <div className="inputIcon">
                ✨
              </div>

              <input
                value={input}
                onChange={(e) =>
                  setInput(e.target.value)
                }
                placeholder="Ask Dharm AI..."
                disabled={
                  loading ||
                  isReplyTyping
                }
              />

              <button
                type="submit"
                disabled={
                  loading ||
                  isReplyTyping ||
                  !input.trim()
                }
                aria-label="Send message"
              >
                ➤
              </button>

            </div>

          </form>

        </section>

        {/* HOME INDICATOR */}

        <div className="homeIndicator" />

      </div>

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;

          display: flex;
          align-items: center;
          justify-content: center;

          position: relative;
          overflow: hidden;

          background:
            radial-gradient(
              circle at 20% 10%,
              rgba(45, 110, 255, 0.25),
              transparent 30%
            ),
            radial-gradient(
              circle at 80% 40%,
              rgba(130, 60, 255, 0.22),
              transparent 32%
            ),
            #030407;

          color: white;

          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "SF Pro Display",
            "Segoe UI",
            Arial,
            sans-serif;
        }

        /* AMBIENT */

        .ambient {
          position: absolute;

          border-radius: 50%;

          filter: blur(90px);

          pointer-events: none;

          animation:
            ambientFloat
            8s
            ease-in-out
            infinite;
        }

        .ambientBlue {
          width: 280px;
          height: 280px;

          left: -100px;
          top: 5%;

          background:
            rgba(30, 100, 255, 0.22);
        }

        .ambientPurple {
          width: 320px;
          height: 320px;

          right: -120px;
          top: 30%;

          background:
            rgba(130, 60, 255, 0.18);

          animation-delay: 2s;
        }

        .ambientCyan {
          width: 250px;
          height: 250px;

          bottom: -100px;
          left: 40%;

          background:
            rgba(0, 220, 255, 0.13);

          animation-delay: 4s;
        }

        @keyframes ambientFloat {

          0%,
          100% {
            transform:
              translateY(0)
              scale(1);
          }

          50% {
            transform:
              translateY(-25px)
              scale(1.08);
          }
        }

        /* PHONE */

        .phoneFrame {
          width: min(
            430px,
            calc(100vw - 24px)
          );

          height: min(
            900px,
            calc(100vh - 24px)
          );

          min-height: 650px;

          position: relative;

          overflow: hidden;

          display: flex;
          flex-direction: column;

          border-radius: 48px;

          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,0.09),
              rgba(255,255,255,0.025)
            );

          border:
            1px solid
            rgba(255,255,255,0.18);

          box-shadow:
            0 0 0 1px
              rgba(255,255,255,0.03),
            0 30px 100px
              rgba(0,0,0,0.6),
            0 0 80px
              rgba(70,100,255,0.13);

          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);

          z-index: 2;
        }

        /* DYNAMIC ISLAND */

        .dynamicIsland {
          position: absolute;

          z-index: 20;

          top: 13px;
          left: 50%;

          transform:
            translateX(-50%);

          width: 125px;
          height: 30px;

          border-radius: 20px;

          background:
            rgba(0,0,0,0.88);

          box-shadow:
            0 4px 15px
              rgba(0,0,0,0.45),
            inset 0 1px 0
              rgba(255,255,255,0.04);
        }

        .cameraDot {
          position: absolute;

          width: 9px;
          height: 9px;

          border-radius: 50%;

          right: 17px;
          top: 10px;

          background:
            #111827;

          border:
            1px solid
            rgba(120,160,255,0.25);

          box-shadow:
            inset 0 0 5px
              rgba(50,100,255,0.5);
        }

        .speakerLine {
          position: absolute;

          width: 42px;
          height: 4px;

          border-radius: 10px;

          left: 22px;
          top: 13px;

          background:
            rgba(255,255,255,0.08);
        }

        /* TOP BAR */

        .topBar {
          min-height: 94px;

          padding:
            45px 20px 12px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          border-bottom:
            1px solid
            rgba(255,255,255,0.06);

          background:
            rgba(10,10,16,0.4);

          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .brandIcon {
          width: 40px;
          height: 40px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 13px;

          background:
            rgba(255,255,255,0.07);

          border:
            1px solid
            rgba(255,255,255,0.1);

          box-shadow:
            0 0 25px
              rgba(90,100,255,0.22);

          font-size: 21px;
        }

        .brandTitle {
          font-size: 18px;
          font-weight: 750;
          letter-spacing: -0.3px;
        }

        .brandTitle span {
          margin-left: 4px;
        }

        .brandStatus {
          margin-top: 3px;

          display: flex;
          align-items: center;
          gap: 5px;

          color:
            rgba(255,255,255,0.42);

          font-size: 10px;
        }

        .onlineDot {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: #62e6a7;

          box-shadow:
            0 0 8px
              rgba(80,230,160,0.8);
        }

        .topGlow {
          width: 34px;
          height: 34px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          color:
            rgba(170,185,255,0.75);

          background:
            rgba(255,255,255,0.045);

          border:
            1px solid
            rgba(255,255,255,0.08);

          animation:
            topPulse
            3s
            ease-in-out
            infinite;
        }

        @keyframes topPulse {

          0%,
          100% {
            box-shadow:
              0 0 10px
              rgba(100,120,255,0.1);
          }

          50% {
            box-shadow:
              0 0 25px
              rgba(100,120,255,0.3);
          }
        }

        /* CHAT */

        .chatScreen {
          flex: 1;

          min-height: 0;

          display: flex;
          flex-direction: column;

          padding:
            0 12px 10px;
        }

        .messages {
          flex: 1;

          min-height: 0;

          overflow-y: auto;

          padding:
            14px 5px 14px;

          scrollbar-width: thin;

          scrollbar-color:
            rgba(255,255,255,0.12)
            transparent;
        }

        /* WELCOME */

        .welcomeCard {
          min-height: 250px;

          margin:
            6px 2px 22px;

          padding: 30px 20px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          text-align: center;

          border-radius: 30px;

          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,0.075),
              rgba(255,255,255,0.025)
            );

          border:
            1px solid
            rgba(255,255,255,0.1);

          box-shadow:
            0 20px 50px
              rgba(0,0,0,0.2),
            inset 0 1px 0
              rgba(255,255,255,0.08);

          animation:
            welcomePulse
            4s
            ease-in-out
            infinite;
        }

        .welcomeGlow {
          width: 76px;
          height: 76px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 20px;

          border-radius: 25px;

          font-size: 38px;

          background:
            linear-gradient(
              145deg,
              rgba(100,130,255,0.18),
              rgba(170,70,255,0.12)
            );

          border:
            1px solid
            rgba(255,255,255,0.1);

          box-shadow:
            0 0 45px
              rgba(80,100,255,0.18);
        }

        .welcomeTitle {
          font-size: 27px;
          font-weight: 800;

          letter-spacing: -0.7px;
        }

        .welcomeText {
          margin-top: 9px;

          color:
            rgba(255,255,255,0.62);

          font-size: 14px;

          line-height: 1.6;
        }

        .welcomeLine {
          margin-top: 18px;

          font-size: 10px;

          color:
            rgba(170,185,255,0.55);

          letter-spacing: 1px;
          text-transform: uppercase;
        }

        @keyframes welcomePulse {

          0%,
          100% {
            transform: scale(1);

            box-shadow:
              0 0 35px
              rgba(80,100,255,0.08);
          }

          50% {
            transform: scale(1.01);

            box-shadow:
              0 0 50px
              rgba(80,100,255,0.18);
          }
        }

        /* MESSAGE */

        .message {
          max-width: 84%;

          margin-bottom: 15px;

          padding:
            14px 16px;

          border-radius: 23px;

          line-height: 1.65;

          font-size: 16px;

          animation:
            messageIn
            0.3s
            ease;

          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        @keyframes messageIn {

          from {
            opacity: 0;
            transform:
              translateY(8px)
              scale(0.98);
          }

          to {
            opacity: 1;
            transform:
              translateY(0)
              scale(1);
          }
        }

        .userMessage {
          margin-left: auto;

          background:
            linear-gradient(
              135deg,
              rgba(50,120,255,0.3),
              rgba(120,60,255,0.25)
            );

          border:
            1px solid
            rgba(100,160,255,0.18);

          box-shadow:
       
