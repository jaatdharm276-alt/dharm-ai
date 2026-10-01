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
          <span>
            {renderInline(trimmed.slice(2))}
          </span>
        </div>
      );
    }

    const numbered = trimmed.match(
      /^(\d+)\.\s+(.*)/
    );

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
          minHeight: trimmed
            ? "1.45em"
            : "0.6em",
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

      for (
        let i = 0;
        i < reply.length;
        i += 2
      ) {
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: reply.slice(
              0,
              i + 2
            ),
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

      {/* AMBIENT LIGHT */}

      <div className="ambient ambientBlue" />
      <div className="ambient ambientPurple" />
      <div className="ambient ambientCyan" />

      {/* IPHONE STYLE FRAME */}

      <div className="phoneFrame">

        {/* DYNAMIC ISLAND */}

        <div className="dynamicIsland">
          <div className="speakerLine" />
          <div className="cameraDot" />
        </div>

        {/* TOP BAR */}

        <header className="topBar">

          <div className="brand">

            <div className="brandIcon">
              🌸
            </div>

            <div className="brandInfo">

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

          <div className="topButton">
            ✦
          </div>

        </header>

        {/* CHAT SCREEN */}

        <section className="chatScreen">

          <div className="messages">

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

            {/* AI THINKING */}

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

        {/* IPHONE HOME INDICATOR */}

        <div className="homeIndicator" />

      </div>

      <style jsx>{`

        :global(html),
        :global(body) {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #02030a;
        }

        :global(body) {
          overscroll-behavior: none;
        }

        * {
          box-sizing: border-box;
        }

        .page {
          width: 100%;
          height: 100dvh;

          position: relative;

          display: flex;
          align-items: center;
          justify-content: center;

          overflow: hidden;

          background:
            radial-gradient(
              circle at 10% 10%,
              rgba(35, 110, 255, 0.28),
              transparent 32%
            ),
            radial-gradient(
              circle at 90% 35%,
              rgba(135, 50, 255, 0.25),
              transparent 34%
            ),
            radial-gradient(
              circle at 50% 100%,
              rgba(0, 230, 210, 0.17),
              transparent 38%
            ),
            #02040b;

          color: white;

          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "SF Pro Display",
            "Segoe UI",
            Arial,
            sans-serif;
        }

        /* AMBIENT GLOW */

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
            rgba(30, 100, 255, 0.25);
        }

        .ambientPurple {
          width: 330px;
          height: 330px;

          right: -120px;
          top: 30%;

          background:
            rgba(135, 50, 255, 0.2);

          animation-delay: 2s;
        }

        .ambientCyan {
          width: 280px;
          height: 280px;

          bottom: -120px;
          left: 35%;

          background:
            rgba(0, 230, 220, 0.16);

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
            100vw
          );

          height: min(
            900px,
            100dvh
          );

          min-height: 600px;

          position: relative;

          overflow: hidden;

          display: flex;
          flex-direction: column;

          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,0.09),
              rgba(255,255,255,0.025)
            );

          border:
            1px solid
            rgba(255,255,255,0.17);

          border-radius: 48px;

          box-shadow:
            0 0 0 1px
              rgba(255,255,255,0.03),
            0 30px 100px
              rgba(0,0,0,0.65),
            0 0 100px
              rgba(70,100,255,0.16);

          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);

          z-index: 2;
        }

        /* DYNAMIC ISLAND */

        .dynamicIsland {
          position: absolute;

          z-index: 50;

          top: 11px;
          left: 50%;

          transform:
            translateX(-50%);

          width: 126px;
          height: 31px;

          border-radius: 20px;

          background:
            rgba(0,0,0,0.92);

          box-shadow:
            0 5px 18px
              rgba(0,0,0,0.5),
            inset 0 1px 0
              rgba(255,255,255,0.04);
        }

        .speakerLine {
          position: absolute;

          left: 21px;
          top: 13px;

          width: 43px;
          height: 4px;

          border-radius: 10px;

          background:
            rgba(255,255,255,0.09);
        }

        .cameraDot {
          position: absolute;

          right: 17px;
          top: 10px;

          width: 10px;
          height: 10px;

          border-radius: 50%;

          background:
            #10141d;

          border:
            1px solid
            rgba(100,150,255,0.3);

          box-shadow:
            inset 0 0 6px
              rgba(50,100,255,0.55);
        }

        /* TOP BAR */

        .topBar {
          flex-shrink: 0;

          height: 91px;

          padding:
            43px 18px 9px;

          display: flex;

          align-items: center;
          justify-content: space-between;

          background:
            rgba(7,9,17,0.55);

          border-bottom:
            1px solid
            rgba(255,255,255,0.07);

          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
        }

        .brand {
          display: flex;

          align-items: center;

          gap: 10px;
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
            rgba(255,255,255,0.11);

          box-shadow:
            0 0 25px
              rgba(90,100,255,0.23);

          font-size: 21px;
        }

        .brandTitle {
          font-size: 18px;

          font-weight: 800;

          letter-spacing: -0.3px;
        }

        .brandTitle span {
          margin-left: 3px;
        }

        .brandStatus {
          display: flex;

          align-items: center;

          gap: 5px;

          margin-top: 2px;

          color:
            rgba(255,255,255,0.43);

          font-size: 10px;
        }

        .onlineDot {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: #62e6a7;

          box-shadow:
            0 0 9px
              rgba(80,230,160,0.85);
        }

        .topButton {
          width: 34px;
          height: 34px;

          display: flex;

          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background:
            rgba(255,255,255,0.045);

          border:
            1px solid
            rgba(255,255,255,0.08);

          color:
            rgba(175,190,255,0.8);

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

        /* CHAT SCREEN */

        .chatScreen {
          flex: 1;

          min-height: 0;

          display: flex;
          flex-direction: column;

          padding:
            0 11px 7px;
        }

        .messages {
          flex: 1;

          min-height: 0;

          overflow-y: auto;

          padding:
            13px 5px 13px;

          scrollbar-width: thin;

          scrollbar-color:
            rgba(255,255,255,0.12)
            transparent;

          -webkit-overflow-scrolling: touch;
        }

        /* MESSAGE */

        .message {
          max-width: 87%;

          margin-bottom: 14px;

          padding:
            14px 16px;

          border-radius: 23px;

          line-height: 1.62;

          font-size: 16px;

          overflow-wrap: anywhere;

          animation:
            messageIn
            0.28s
            ease;

          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        @keyframes messageIn {

          from {
            opacity: 0;

            transform:
              translateY(9px)
              scale(0.98);
          }

          to {
            opacity: 1;

            transform:
              translateY(0)
              scale(1);
          }
        }

        .aiMessage {
          margin-right: auto;

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
            0 12px 35px
              rgba(0,0,0,0.16),
            inset 0 1px 0
              rgba(255,255,255,0.04);
        }

        .userMessage {
          margin-left: auto;

          background:
            linear-gradient(
              135deg,
              rgba(45,125,255,0.34),
              rgba(125,55,255,0.3)
            );

          border:
            1px solid
            rgba(100,160,255,0.2);

          box-shadow:
            0 12px 35px
              rgba(40,90,255,0.12);
        }

        .messageHeader {
          display: flex;

          align-items: center;

          gap: 8px;

          margin-bottom: 7px;
        }

        .messageAvatar {
          width: 25px;
          height: 25px;

          display: flex;

          align-items: center;
          justify-content: center;

          border-radius: 8px;

          background:
            rgba(255,255,255,0.06);

          font-size: 12px;
        }

        .messageName {
          color:
            rgba(255,255,255,0.5);

          font-size: 11px;

          font-weight: 750;
        }

        .messageText strong {
          color: white;

          font-weight: 800;
        }

        /* MARKDOWN */

        .normalLine {
          min-height: 1.45em;
        }

        .markdownH1 {
          margin:
            5px 0 10px;

          font-size: 24px;

          line-height: 1.3;

          font-weight: 850;
        }

        .markdownH2 {
          margin:
            5px 0 9px;

          font-size: 21px;

          line-height: 1.3;

          font-weight: 850;
        }

        .markdownH3 {
          margin:
            5px 0 8px;

          font-size: 18px;

          line-height: 1.35;

          font-weight: 850;
        }

        .bulletLine {
          display: flex;

          gap: 8px;

          margin: 4px 0;
        }

        .bulletDot {
          color:
            #9fb3ff;

          font-size: 18px;
        }

        .numberedLine {
          display: flex;

          gap: 8px;

          margin: 4px 0;
        }

        .numberDot {
          min-width: 22px;

          color:
            #9fb3ff;

          font-weight: 800;
        }

        /* LISTEN BUTTON */

        .listenButton {
          margin-top: 11px
