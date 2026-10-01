"use client";

import { useEffect, useRef, useState } from "react";

/* =========================
   INLINE MARKDOWN
========================= */

function renderInline(text) {
  if (!text) return null;

  const parts = text.split(
    /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g
  );

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

    if (
      part.startsWith("`") &&
      part.endsWith("`")
    ) {
      return (
        <code
          key={index}
          className="inlineCode"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (
      part.startsWith("*") &&
      part.endsWith("*") &&
      !part.startsWith("**")
    ) {
      return (
        <em key={index}>
          {part.slice(1, -1)}
        </em>
      );
    }

    return (
      <span key={index}>
        {part}
      </span>
    );
  });
}

/* =========================
   MESSAGE FORMATTER
========================= */

function formatMessage(text) {
  if (!text) return null;

  const lines = text.split("\n");

  return lines.map((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return (
        <div
          key={index}
          className="emptyLine"
        />
      );
    }

    if (trimmed.startsWith("### ")) {
      return (
        <h3
          key={index}
          className="markdownH3"
        >
          {renderInline(trimmed.slice(4))}
        </h3>
      );
    }

    if (trimmed.startsWith("## ")) {
      return (
        <h2
          key={index}
          className="markdownH2"
        >
          {renderInline(trimmed.slice(3))}
        </h2>
      );
    }

    if (trimmed.startsWith("# ")) {
      return (
        <h1
          key={index}
          className="markdownH1"
        >
          {renderInline(trimmed.slice(2))}
        </h1>
      );
    }

    if (
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ")
    ) {
      return (
        <div
          key={index}
          className="bulletLine"
        >
          <span className="bulletDot">
            •
          </span>

          <span>
            {renderInline(
              trimmed.slice(2)
            )}
          </span>
        </div>
      );
    }

    const numbered =
      trimmed.match(
        /^(\d+)\.\s+(.*)/
      );

    if (numbered) {
      return (
        <div
          key={index}
          className="numberLine"
        >
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
        className="messageLine"
      >
        {renderInline(line)}
      </div>
    );
  });
}

/* =========================
   MAIN APP
========================= */

export default function Home() {
  const [messages, setMessages] =
    useState([
      {
        role: "assistant",
        content:
          "Namaste! 🙏\n\nMera naam **Dharm AI** hai. Main aapki madad ke liye taiyar hoon. Main ek AI assistant hoon aur kai tarah ke kaam kar sakta hoon, jaise:\n\n1. **Jankari aur Gyan:** Aapko kisi bhi vishay par jankari de sakta hoon.\n2. **Bhasha aur Anuvad:** Hindi, English aur anya bhashaon mein baat kar sakta hoon.\n3. **Rachnatmakta:** Kahaniyan, kavita aur scripts likh sakta hoon.\n4. **Padhai mein Madad:** Math, Science aur anya subjects mein madad kar sakta hoon.",
      },
    ]);

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [typingReply, setTypingReply] =
    useState(false);

  const [speakingIndex, setSpeakingIndex] =
    useState(null);

  const messagesEndRef =
    useRef(null);

  const inputRef =
    useRef(null);

  /* =========================
     AUTO SCROLL
  ========================= */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "auto",
        block: "end",
      }
    );
  }, [
    messages,
    loading,
    typingReply,
  ]);

  /* =========================
     SPEECH
  ========================= */

  function speakText(text, index) {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/###/g, "")
      .replace(/##/g, "")
      .replace(/#/g, "")
      .replace(/`/g, "");

    const utterance =
      new SpeechSynthesisUtterance(
        cleanText
      );

    utterance.lang =
      /[\u0900-\u097F]/.test(
        cleanText
      )
        ? "hi-IN"
        : "en-IN";

    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setSpeakingIndex(index);
    };

    utterance.onend = () => {
      setSpeakingIndex(null);
    };

    utterance.onerror = () => {
      setSpeakingIndex(null);
    };

    window.speechSynthesis.speak(
      utterance
    );
  }

  /* =========================
     SEND MESSAGE
  ========================= */

  async function sendMessage(e) {
    e.preventDefault();

    const text = input.trim();

    if (
      !text ||
      loading ||
      typingReply
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

      const data =
        await response.json();

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
      setTypingReply(true);

      for (
        let i = 0;
        i < reply.length;
        i += 2
      ) {
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content:
              reply.slice(
                0,
                i + 2
              ),
          },
        ]);

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              15
            )
        );
      }

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: reply,
        },
      ]);

      setTypingReply(false);
    } catch (error) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            "Error: " +
            (error.message ||
              "Something went wrong"),
        },
      ]);

      setLoading(false);
      setTypingReply(false);
    }
  }

  /* =========================
     QUICK PROMPT
  ========================= */

  function useQuickPrompt(prompt) {
    setInput(prompt);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }

  /* =========================
     UI
  ========================= */

  return (
    <main className="page">

      {/* AMBIENT LIGHT */}

      <div className="ambient ambientBlue" />

      <div className="ambient ambientPurple" />

      <div className="ambient ambientCyan" />

      {/* FULL SCREEN APP */}

      <section className="appShell">

        <div className="appBackground" />

        {/* HEADER */}

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

              <div className="onlineStatus">

                <span className="onlineDot" />

                Online

              </div>

            </div>

          </div>

          <button
            className="sparkButton"
            type="button"
            onClick={() =>
              useQuickPrompt(
                "Aaj ka ek sundar dharmik suvichar batao."
              )
            }
            aria-label="Quick prompt"
          >
            ✦
          </button>

        </header>

        {/* CHAT */}

        <div className="chatArea">

          <div className="chatInner">

            {messages.map(
              (message, index) => {

                const isUser =
                  message.role ===
                  "user";

                const isError =
                  message.content?.startsWith(
                    "Error:"
                  );

                const isLast =
                  index ===
                  messages.length - 1;

                return (
                  <div
                    key={index}
                    className={
                      isUser
                        ? "messageRow userRow"
                        : "messageRow assistantRow"
                    }
                  >

                    <div
                      className={
                        isUser
                          ? "messageBubble userBubble"
                          : "messageBubble assistantBubble"
                      }
                    >

                      {/* HEADER */}

                      <div className="messageHeader">

                        <div className="miniAvatar">
                          {isUser
                            ? "👤"
                            : "🌸"}
                        </div>

                        <span className="messageName">
                          {isUser
                            ? "You"
                            : "Dharm AI"}
                        </span>

                      </div>

                      {/* MESSAGE */}

                      <div
                        className={
                          isError
                            ? "messageContent errorText"
                            : "messageContent"
                        }
                      >

                        {formatMessage(
                          message.content
                        )}

                        {typingReply &&
                          !isUser &&
                          isLast && (
                            <span className="typingCursor">
                              ▌
                            </span>
                          )}

                      </div>

                      {/* LISTEN */}

                      {!isUser &&
                        message.content &&
                        !isError &&
                        !(
                          typingReply &&
                          isLast
                        ) && (
                          <button
                            className="listenButton"
                            type="button"
                            onClick={() =>
                              speakText(
                                message.content,
                                index
                              )
                            }
                          >
                            {speakingIndex ===
                            index
                              ? "🔇 रोकें"
                              : "🔊 सुनें"}
                          </button>
                        )}

                    </div>

                  </div>
                );
              }
            )}

            {/* LOADING */}

            {loading && (
              <div className="messageRow assistantRow">

                <div className="messageBubble assistantBubble loadingBubble">

                  <div className="messageHeader">

                    <div className="miniAvatar">
                      🌸
                    </div>

                    <span className="messageName">
                      Dharm AI
                    </span>

                  </div>

                  <div className="typingDots">

                    <span />
                    <span />
                    <span />

                  </div>

                </div>

              </div>
            )}

            <div
              ref={messagesEndRef}
              className="scrollAnchor"
            />

          </div>

        </div>

        {/* QUICK ACTIONS */}

        {messages.length === 1 && (
          <div className="quickActions">

            <button
              type="button"
              onClick={() =>
                useQuickPrompt(
                  "Bhagavad Gita ke 3 sabse mahatvapurna updesh batao."
                )
              }
            >
              🕉️ Gita Gyan
            </button>

            <button
              type="button"
              onClick={() =>
                useQuickPrompt(
                  "Aaj ka ek sundar dharmik suvichar batao."
                )
              }
            >
              ✨ Suvichar
            </button>

            <button
              type="button"
              onClick={() =>
                useQuickPrompt(
                  "Ek chhota sa dhyan aur meditation mantra batao."
                )
              }
            >
              🧘 Dhyan
            </button>

          </div>
        )}

        {/* INPUT */}

        <form
          className="inputArea"
          onSubmit={sendMessage}
        >

          <div className="inputBox">

            <span className="inputSpark">
              ✨
            </span>

            <input
              ref={inputRef}
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              placeholder="Ask Dharm AI..."
              disabled={
                loading ||
                typingReply
              }
              autoComplete="off"
              enterKeyHint="send"
            />

            <button
              type="submit"
              className="sendButton"
              disabled={
                !input.trim() ||
                loading ||
                typingReply
              }
              aria-label="Send"
            >
              ➤
            </button>

          </div>

        </form>

      </section>

      {/* GLOBAL CSS */}

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
          background: #02040b;
        }

        body {
          overflow: hidden;
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Helvetica,
            Arial,
            sans-serif;
        }

        button,
        input {
          font: inherit;
        }

      `}</style>

      {/* APP CSS */}

      <style jsx>{`

        /* =========================
           FULL SCREEN
        ========================= */

        .page {
          position: fixed;

          inset: 0;

          width: 100vw;

          height: 100dvh;

          min-height: 100dvh;

          max-height: 100dvh;

          overflow: hidden;

          background:
            radial-gradient(
              circle at 15% 20%,
              rgba(
                34,
                79,
                255,
                0.16
              ),
              transparent 35%
            ),
            radial-gradient(
              circle at 85% 70%,
              rgba(
                116,
                40,
                255,
                0.14
              ),
              transparent 35%
            ),
            #02040b;

          color: #fff;
        }

        /* =========================
           AMBIENT
        ========================= */

        .ambient {
          position: absolute;

          pointer-events: none;

          filter: blur(65px);

          border-radius: 999px;

          opacity: 0.55;

          animation:
            floatGlow
            8s
            ease-in-out
            infinite;
        }

        .ambientBlue {
          width: 260px;

          height: 260px;

          left: -120px;

          top: 10%;

          background:
            rgba(
              38,
              93,
              255,
              0.22
            );
        }

        .ambientPurple {
          width: 300px;

          height: 300px;

          right: -140px;

          top: 35%;

          background:
            rgba(
              124,
              46,
              255,
              0.20
            );

          animation-delay: -3s;
        }

        .ambientCyan {
          width: 230px;

          height: 230px;

          left: 30%;

          bottom: -130px;

          background:
            rgba(
              0,
              205,
              255,
              0.13
            );

          animation-delay: -5s;
        }

        @keyframes floatGlow {

          0%,
          100% {
            transform:
              translate3d(
                0,
                0,
                0
              )
              scale(1);
          }

          50% {
            transform:
              translate3d(
                0,
                -18px,
                0
              )
              scale(1.08);
          }

        }

        /* =========================
           FULL SCREEN APP
        ========================= */

        .appShell {
          position: relative;

          z-index: 2;

          width: 100vw;

          height: 100dvh;

          min-height: 100dvh;

          max-height: 100dvh;

          display: flex;

          flex-direction: column;

          overflow: hidden;

          background:
            linear-gradient(
              180deg,
              rgba(
                3,
                7,
                20,
                0.97
              ),
              rgba(
                5,
                6,
                15,
                0.99
              )
            );
        }

        .appBackground {
          position: absolute;

          inset: 0;

          pointer-events: none;

          background:
            radial-gradient(
              circle at 50% -10%,
              rgba(
                41,
                81,
                255,
                0.15
              ),
              transparent 32%
            ),
            radial-gradient(
              circle at 100% 60%,
              rgba(
                111,
                44,
                255,
                0.09
              ),
              transparent 35%
            );
        }

        /* =========================
           HEADER
        ========================= */

        .topBar {
          position: relative;

          z-index: 10;

          flex: 0 0 auto;

          min-height: 92px;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          padding:
            14px
            18px
            14px;

          padding-top:
            max(
              14px,
              env(
                safe-area-inset-top
              )
            );

          border-bottom:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );
    
