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

    if (
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ")
    ) {
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

  utterance.lang =
    /[\u0900-\u097F]/.test(text)
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
      behavior: "auto",
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
      const response = await fetch(
        "/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            message: text,
          }),
        }
      );

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

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "",
        },
      ]);

      setLoading(false);
      setIsReplyTyping(true);

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

        await new Promise(
          (resolve) =>
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

      setLoading(false);
      setIsReplyTyping(false);
    }
  }

  return (
    <main className="page">

      {/* BACKGROUND LIGHT */}

      <div className="ambient ambientBlue" />
      <div className="ambient ambientPurple" />
      <div className="ambient ambientCyan" />

      {/* PHONE */}

      <div className="phoneFrame">

        {/* SIDE BUTTONS */}

        <div className="sideButton volumeOne" />
        <div className="sideButton volumeTwo" />
        <div className="sideButton powerButton" />

        {/* SCREEN */}

        <div className="phoneScreen">

          {/* DYNAMIC ISLAND */}

          <div className="dynamicIsland">
            <div className="islandSpeaker" />
            <div className="cameraDot" />
          </div>

          {/* TOP BAR */}

          <header className="topBar">

            <div className="brand">

              <div className="brandIcon">
                🌸
              </div>

              <div>
                <div className="brandTitle">
                  Dharm AI <span>✨</span>
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

          {/* CHAT */}

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

              {/* THINKING */}

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
                  aria-label="Send"
                >
                  ➤
                </button>

              </div>

            </form>

          </section>

          {/* HOME INDICATOR */}

          <div className="homeIndicator" />

        </div>
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
              circle at 15% 15%,
              rgba(40, 100, 255, 0.28),
              transparent 32%
            ),
            radial-gradient(
              circle at 90% 35%,
              rgba(135, 45, 255, 0.25),
              transparent 35%
            ),
            radial-gradient(
              circle at 50% 100%,
              rgba(0, 225, 210, 0.16),
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

        /* AMBIENT LIGHT */

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
          width: 300px;
          height: 300px;

          left: -110px;
          top: 5%;

          background:
            rgba(30, 100, 255, 0.28);
        }

        .ambientPurple {
          width: 340px;
          height: 340px;

          right: -130px;
          top: 30%;

          background:
            rgba(140, 50, 255, 0.22);

          animation-delay: 2s;
        }

        .ambientCyan {
          width: 300px;
          height: 300px;

          bottom: -140px;
          left: 35%;

          background:
            rgba(0, 230, 220, 0.17);

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

        /* PHONE OUTER FRAME */

        .phoneFrame {
          position: relative;

          width:
            min(
              430px,
              calc(100vw - 16px)
            );

          height:
            min(
              900px,
              calc(100dvh - 16px)
            );

          border-radius: 50px;

          padding: 5px;

          background:
            linear-gradient(
              145deg,
              #3c3f49,
              #090a0f 35%,
              #1c1d24 70%,
              #05060a
            );

          box-shadow:
            0 0 0 1px
              rgba(255,255,255,0.08),
            0 35px 100px
              rgba(0,0,0,0.75),
            0 0 90px
              rgba(60,90,255,0.18);

          z-index: 5;
        }

        .phoneScreen {
          position: relative;

          width: 100%;
          height: 100%;

          overflow: hidden;

          border-radius: 45px;

          background:
            radial-gradient(
              circle at 20% 10%,
              rgba(50,100,255,0.13),
              transparent 35%
            ),
            radial-gradient(
              circle at 90% 50%,
              rgba(130,50,255,0.13),
              transparent 38%
            ),
            linear-gradient(
              145deg,
              #080b15,
              #03050c
            );

          border:
            1px solid
            rgba(255,255,255,0.08);
        }

        /* SIDE BUTTONS */

        .sideButton {
          position: absolute;

          width: 4px;

          background:
            linear-gradient(
              to bottom,
              #555,
              #171717
            );

          border-radius: 5px;

          left: -4px;

          box-shadow:
            -1px 0 2px
            rgba(255,255,255,0.15);
        }

        .volumeOne {
          top: 130px;
          height: 55px;
        }

        .volumeTwo {
          top: 195px;
          height: 55px;
        }

        .powerButton {
          right: -4px;
          left: auto;
          top: 170px;
          height: 80px;
        }

        /* DYNAMIC ISLAND */

        .dynamicIsland {
          position: absolute;

          z-index: 50;

          top: 10px;
          left: 50%;

          transform:
            translateX(-50%);

          width: 128px;
          height: 32px;

          border-radius: 20px;

          background: #000;

          box-shadow:
            0 4px 15px
              rgba(0,0,0,0.7),
            inset 0 1px 1px
              rgba(255,255,255,0.04);
        }

        .islandSpeaker {
          position: absolute;

          left: 23px;
          top: 14px;

          width: 42px;
          height: 4px;

          border-radius: 10px;

          background:
            rgba(255,255,255,0.1);
        }

        .cameraDot {
          position: absolute;

          right: 17px;
          top: 10px;

          width: 11px;
          height: 11px;

          border-radius: 50%;

          background:
            radial-gradient(
              circle at 35% 35%,
              #1d293d,
              #05070b
            );

          border:
            1px solid
            rgba(80,120,255,0.35);

          box-shadow:
            inset 0 0 5px
            rgba(60,100,255,0.6);
        }

        /* TOP BAR */

        .topBar {
          height: 88px;

          flex-shrink: 0;

          padding:
            40px 18px 8px;

          display: flex;

          align-items: center;
          justify-content: space-between;

          background:
            rgba(5,8,16,0.72);

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
          width: 39px;
          height: 39px;

          display: flex;

          align-items: center;
          justify-content: center;

          border-radius: 13px;

          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,0.11),
              rgba(255,255,255,0.035)
            );

          border:
            1px solid
            rgba(255,255,255,0.12);

          box-shadow:
            0 0 24px
            rgba(80,100,255,0.2);

          font-size: 20px;
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
            rgba(255,255,255,0.42);

          font-size: 10px;
        }

        .onlineDot {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: #61e5a5;

          box-shadow:
            0 0 9px
            rgba(70,230,160,0.9);
        }

        .topButton {
          width: 34px;
          height: 34px;

          display: flex;

          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background:
            rgba(255,255,255,0.05);

          border:
            1px solid
            rgba(255,255,255,0.09);

          color:
            rgba(180,195,255,0.85);

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
          height:
            calc(
              100% - 88px
            );

          display: flex;

          flex-direction: column;

          padding:
            0 10px 8px;
        }

        .messages {
          flex: 1;

          min-height: 0;

          overflow-y: auto;

          padding:
            14px 5px 10px;

          scrollbar-width: thin;

          scrollbar-color:
            rgba(255,255,255,0.13)
            transparent;

          -webkit-overflow-scrolling: touch;
        }

        .message {
          max-width: 88%;

          margin-bottom: 14px;

          padding:
            14px 16px;

          border-radius: 23px;

          font-size: 15.5px;

          line-height: 1.62;

          overflow-wrap: anywhere;

          animation:
            messageIn
            .28s
            ease;

          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        @keyframes messageIn {
          from {
            opacity: 0;

            transform:
              translateY(9px)
              scale(.98);
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
              rgba(0,0,0,0.2),
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
            rgba(100,160,255,0.22);

          box-shadow:
            0 12px 35px
  
              rgba(40,90,255,0.14);
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
          background: rgba(255,255,255,0.06);
          font-size: 12px;
        }

        .messageName {
          color: rgba(255,255,255,0.48);
          font-size: 11px;
          font-weight: 750;
        }

        .messageText strong {
          color: #fff;
          font-weight: 800;
        }

        .normalLine {
          min-height: 1.45em;
        }

        .markdownH1 {
          margin: 5px 0 10px;
          font-size: 24px;
          line-height: 1.3;
          font-weight: 850;
        }

        .markdownH2 {
          margin: 5px 0 9px;
          font-size: 21px;
          line-height: 1.3;
          font-weight: 850;
        }

        .markdownH3 {
          margin: 5px 0 8px;
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
          color: #a6b7ff;
          font-size: 18px;
        }

        .numberedLine {
          display: flex;
          gap: 8px;
          margin: 4px 0;
        }

        .numberDot {
          min-width: 22px;
          color: #a6b7ff;
          font-weight: 800;
        }

        .listenButton {
          margin-top: 11px;
          padding: 7px 11px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.055);
          color: rgba(255,255,255,0.75);
          font-size: 11px;
          cursor: pointer;
        }

        .typing {
          display: flex;
          align-items: center;
          gap: 5px;
          height: 22px;
        }

        .typing span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: rgba(170,190,255,0.75);
          animation: typingDot 1.2s infinite ease-in-out;
        }

        .typing span:nth-child(2) {
          animation-delay: .15s;
        }

        .typing span:nth-child(3) {
          animation-delay: .3s;
        }

        @keyframes typingDot {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: .35;
          }

          30% {
            transform: translateY(-5px);
            opacity: 1;
          }
        }

        .inputWrapper {
          position: relative;
          flex-shrink: 0;
          padding: 5px 3px 8px;
        }

        .inputGlow {
          position: absolute;
          inset: 0;
          border-radius: 22px;
          background:
            linear-gradient(
              90deg,
              rgba(40,100,255,.12),
              rgba(160,50,255,.1),
              rgba(0,220,220,.08)
            );
          filter: blur(15px);
          pointer-events: none;
        }

        .inputArea {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 53px;
          padding: 7px 7px 7px 13px;
          border-radius: 20px;
          background: rgba(12,15,27,0.9);
          border: 1px solid rgba(255,255,255,0.11);
          box-shadow:
            0 10px 35px rgba(0,0,0,.4),
            inset 0 1px 0 rgba(255,255,255,.04);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
        }

        .inputIcon {
          flex-shrink: 0;
          font-size: 15px;
          opacity: .7;
        }

        .inputArea input {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: white;
          font-size: 15px;
          font-family: inherit;
        }

        .inputArea input::placeholder {
          color: rgba(255,255,255,.32);
        }

        .inputArea button {
          flex-shrink: 0;
          width: 39px;
          height: 39px;
          border: 0;
          border-radius: 14px;
          background:
            linear-gradient(
              135deg,
              #4b8cff,
              #8b50ff
            );
          color: white;
          font-size: 18px;
          cursor: pointer;
          box-shadow:
            0 5px 18px
            rgba(75,100,255,.3);
        }

        .inputArea button:disabled {
          opacity: .3;
          cursor: default;
          box-shadow: none;
        }

        .homeIndicator {
          position: absolute;
          z-index: 60;
          bottom: 7px;
          left: 50%;
          transform: translateX(-50%);
          width: 105px;
          height: 4px;
          border-radius: 10px;
          background: rgba(255,255,255,.75);
        }

        @media (max-width: 500px) {
          .page {
            padding: 8px;
          }

          .phoneFrame {
            width: 100%;
            height: 100%;
            border-radius: 42px;
            padding: 4px;
          }

          .phoneScreen {
            border-radius: 38px;
          }

          .message {
            max-width: 91%;
            font-size: 15px;
            padding: 13px 14px;
          }
        }

        @media (max-height: 650px) {
          .topBar {
            height: 78px;
            padding-top: 35px;
          }

          .chatScreen {
            height: calc(100% - 78px);
          }

          .message {
            margin-bottom: 10px;
            padding: 11px 13px;
          }
        }

      `}</style>
    </main>
  );
}
