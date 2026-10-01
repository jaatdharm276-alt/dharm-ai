"use client";

import { useEffect, useRef, useState } from "react";

function renderInline(text) {
  const parts = [];
  let remaining = String(text);

  const regex =
    /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      parts.push(remaining.slice(lastIndex, match.index));
    }

    const value = match[0];

    if (value.startsWith("`")) {
      parts.push(
        <code key={parts.length} className="inlineCode">
          {value.slice(1, -1)}
        </code>
      );
    } else if (value.startsWith("**")) {
      parts.push(
        <strong key={parts.length}>
          {value.slice(2, -2)}
        </strong>
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

  if (lastIndex < remaining.length) {
    parts.push(remaining.slice(lastIndex));
  }

  return parts;
}

function formatMessage(text) {
  if (!text) return null;

  const lines = String(text).split("\n");
  const output = [];

  let listItems = [];
  let listType = null;

  const flushList = () => {
    if (!listItems.length) return;

    if (listType === "number") {
      output.push(
        <ol key={`ol-${output.length}`} className="messageList">
          {listItems.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ol>
      );
    } else {
      output.push(
        <ul key={`ul-${output.length}`} className="messageList">
          {listItems.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
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

      output.push(
        <div key={`space-${index}`} className="messageSpace" />
      );

      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);

    if (heading) {
      flushList();

      const level = heading[1].length;

      output.push(
        <div
          key={`heading-${index}`}
          className={`messageHeading h${level}`}
        >
          {renderInline(heading[2])}
        </div>
      );

      return;
    }

    const bullet = trimmed.match(/^[-*•]\s+(.+)$/);

    if (bullet) {
      if (listType !== "bullet") {
        flushList();
        listType = "bullet";
      }

      listItems.push(bullet[1]);
      return;
    }

    const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);

    if (numbered) {
      if (listType !== "number") {
        flushList();
        listType = "number";
      }

      listItems.push(numbered[1]);
      return;
    }

    flushList();

    output.push(
      <div key={`line-${index}`} className="messageLine">
        {renderInline(trimmed)}
      </div>
    );
  });

  flushList();

  return output;
}

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Namaste 🙏 Main Dharm AI hoon.\nApna sawaal poochho.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingReply, setTypingReply] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading, typingReply]);

  const speakText = (text) => {
    if (typeof window === "undefined") return;

    if (!("speechSynthesis" in window)) {
      alert("Aapke browser me voice support available nahi hai.");
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = String(text)
      .replace(/[#*_`]/g, "")
      .replace(/\n+/g, " ");

    const utterance = new SpeechSynthesisUtterance(cleanText);

    utterance.lang = "hi-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (customMessage) => {
    const message = String(
      customMessage !== undefined ? customMessage : input
    ).trim();

    if (!message || loading || typingReply) return;

    setInput("");

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: message,
      },
    ]);

    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "AI response nahi mila."
        );
      }

      const reply =
        data?.reply ||
        "Maaf kijiye, mujhe abhi koi response nahi mila.";

      setLoading(false);
      setTypingReply(true);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
        },
      ]);

      let currentText = "";

      for (let i = 0; i < reply.length; i++) {
        currentText += reply[i];

        setMessages((prev) => {
          const copy = [...prev];

          copy[copy.length - 1] = {
            role: "assistant",
            content: currentText,
          };

          return copy;
        });

        await new Promise((resolve) =>
          setTimeout(resolve, 10)
        );
      }

      setTypingReply(false);
    } catch (error) {
      console.error(error);

      setLoading(false);
      setTypingReply(false);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ Abhi response nahi aa raha. Thodi der baad dobara try karo.",
        },
      ]);
    }
  };

  const useQuickPrompt = (text) => {
    setInput(text);

    setTimeout(() => {
      sendMessage(text);
    }, 50);
  };

  return (
    <main className="page">
      <div className="ambient ambientOne" />
      <div className="ambient ambientTwo" />

      <section className="appShell">
        <div className="backgroundGlow" />

        <header className="header">
          <div className="brandArea">
            <div className="brandIcon">🌸</div>

            <div className="brandText">
              <div className="brandTitle">
                Dharm AI <span>✨</span>
              </div>

              <div className="online">
                <span className="onlineDot" />
                Online
              </div>
            </div>
          </div>

          <button
            className="sparkButton"
            onClick={() =>
              useQuickPrompt(
                "Aaj ka ek chhota sa dharmik vichar batao."
              )
            }
            aria-label="Quick question"
          >
            ✦
          </button>
        </header>

        <div className="chatArea">
          <div className="chatInner">
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "messageRow userRow"
                    : "messageRow"
                }
              >
                <div
                  className={
                    message.role === "user"
                      ? "messageBubble userBubble"
                      : "messageBubble assistantBubble"
                  }
                >
                  {message.role === "assistant" && (
                    <div className="messageTop">
                      <div className="miniIcon">🌸</div>
                      <span>Dharm AI</span>
                    </div>
                  )}

                  <div className="messageContent">
                    {formatMessage(message.content)}
                  </div>

                  {message.role === "assistant" &&
                    message.content && (
                      <button
                        className="listenButton"
                        onClick={() =>
                          speakText(message.content)
                        }
                      >
                        🔊 सुनें
                      </button>
                    )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="messageRow">
                <div className="messageBubble assistantBubble loadingBubble">
                  <div className="messageTop">
                    <div className="miniIcon">🌸</div>
                    <span>Dharm AI</span>
                  </div>

                  <div className="typingDots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            {!loading &&
              !typingReply &&
              messages.length === 1 && (
                <div className="quickActions">
                  <button
                    onClick={() =>
                      useQuickPrompt(
                        "Bhagavad Gita ka ek achha shlok batao aur uska arth samjhao."
                      )
                    }
                  >
                    📖 Gita ka shlok
                  </button>

                  <button
                    onClick={() =>
                      useQuickPrompt(
                        "Aaj ka dharmik vichar batao."
                      )
                    }
                  >
                    ✨ Aaj ka vichar
                  </button>

                  <button
                    onClick={() =>
                      useQuickPrompt(
                        "Hindu dharm ke baare me ek rochak baat batao."
                      )
                    }
                  >
                    🕉️ Dharm gyaan
                  </button>
                </div>
              )}

            <div ref={chatEndRef} />
          </div>
        </div>

        <div className="inputArea">
          <div className="inputBox">
            <span className="inputSpark">✨</span>

            <input
              type="text"
              value={input}
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
              placeholder="Ask Dharm AI..."
              disabled={loading || typingReply}
            />

            <button
              className="sendButton"
              onClick={() => sendMessage()}
              disabled={
                loading ||
                typingReply ||
                !input.trim()
              }
              aria-label="Send message"
            >
              ➤
            </button>
          </div>
        </div>
      </section>

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
          color: #ffffff;
          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        .page {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100dvh;
          min-height: 100dvh;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 15% 10%,
              rgba(37, 66, 170, 0.22),
              transparent 34%
            ),
            radial-gradient(
              circle at 90% 70%,
              rgba(105, 32, 180, 0.15),
              transparent 36%
            ),
            #02040b;
        }

        .ambient {
          position: absolute;
          pointer-events: none;
          border-radius: 999px;
          filter: blur(80px);
          opacity: 0.25;
        }

        .ambientOne {
          width: 260px;
          height: 260px;
          top: -100px;
          left: -80px;
          background: #2946a8;
        }

        .ambientTwo {
          width: 300px;
          height: 300px;
          right: -100px;
          bottom: -120px;
          background: #6c24b8;
        }

        .appShell {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background:
            linear-gradient(
              180deg,
              rgba(7, 12, 29, 0.98),
              rgba(2, 5, 13, 0.99)
            );
        }

        .backgroundGlow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(
              circle at 25% 20%,
              rgba(63, 86, 205, 0.1),
              transparent 30%
            ),
            radial-gradient(
              circle at 85% 65%,
              rgba(109, 40, 190, 0.08),
              transparent 32%
            );
        }

        .header {
          position: relative;
          z-index: 5;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: max(
              16px,
              env(safe-area-inset-top)
            )
            18px
            14px;
          border-bottom: 1px solid
            rgba(145, 159, 202, 0.14);
          background: rgba(5, 9, 22, 0.82);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .brandArea {
          display: flex;
          align-items: center;
          min-width: 0;
        }

        .brandIcon {
          width: 62px;
          height: 62px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 20px;
          border: 1px solid rgba(151, 163, 207, 0.25);
          background:
            linear-gradient(
              145deg,
              rgba(42, 48, 78, 0.85),
              rgba(17, 20, 35, 0.8)
            );
          box-shadow:
            0 0 25px rgba(74, 92, 186, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          font-size: 31px;
        }

        .brandText {
          margin-left: 14px;
        }

        .brandTitle {
          font-size: 27px;
          line-height: 1.05;
          font-weight: 800;
          letter-spacing: -0.6px;
          white-space: nowrap;
        }

        .brandTitle span {
          margin-left: 3px;
        }

        .online {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 6px;
          color: #9298a9;
          font-size: 16px;
        }

        .onlineDot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #55e39d;
          box-shadow: 0 0 12px rgba(85, 227, 157, 0.65);
        }

        .sparkButton {
          width: 50px;
          height: 50px;
          flex-shrink: 0;
          border: 1px solid rgba(148, 161, 207, 0.2);
          border-radius: 50%;
          color: #a9b7ff;
          background: rgba(24, 29, 49, 0.72);
          font-size: 26px;
          cursor: pointer;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .chatArea {
          position: relative;
          z-index: 2;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .chatArea::-webkit-scrollbar {
          display: none;
        }

        .chatInner {
          width: 100%;
          min-height: 100%;
          padding: 28px 20px 20px;
        }

        .messageRow {
          width: 100%;
          display: flex;
          justify-content: flex-start;
          margin-bottom: 18px;
        }

        .userRow {
          justify-content: flex-end;
        }

        .messageBubble {
          width: min(100%, 700px);
          border-radius: 28px;
          padding: 24px 26px;
          overflow-wrap: anywhere;
        }

        .assistantBubble {
          border: 1px solid rgba(139, 151, 193, 0.18);
          background:
            linear-gradient(
              145deg,
              rgba(31, 39, 62, 0.8),
              rgba(15, 18, 31, 0.76)
            );
          box-shadow:
            0 20px 50px rgba(0, 0, 0, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.035);
        }

        .userBubble {
          width: auto;
          max-width: 82%;
          border: 1px solid rgba(91, 107, 220, 0.35);
          background:
            linear-gradient(
              145deg,
              rgba(47, 57, 128, 0.8),
              rgba(38, 42, 94, 0.72)
            );
        }

        .messageTop {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
          color: #a6aabd;
          font-size: 18px;
          font-weight: 700;
        }

        .miniIcon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 13px;
          background: rgba(48, 53, 83, 0.7);
          font-size: 20px;
        }

        .messageContent {
          color: #f3f4f8;
          font-size: 22px;
          line-height: 1.58;
          letter-spacing: -0.15px;
        }

        .userBubble .messageContent {
          font-size: 19px;
          line-height: 1.5;
        }

        .messageLine {
          min-height: 1.58em;
        }

        .messageSpace {
          height: 9px;
        }

        .messageHeading {
          margin: 8px 0 10px;
          font-weight: 800;
          line-height: 1.3;
        }

        .messageHeading.h1 {
          font-size: 27px;
        }

        .messageHeading.h2 {
          font-size: 24px;
        }

        .messageHeading.h3 {
          font-size: 22px;
        }

        .messageContent strong {
          font-weight: 800;
          color: #ffffff;
        }

        .messageContent em {
          color: #dfe3ff;
        }

        .inlineCode {
          padding: 3px 7px;
          border-radius: 7px;
          background: rgba(0, 0, 0, 0.3);
          color: #c9d0ff;
          font-size: 0.88em;
        }

        .messageList {
          margin: 8px 0;
          padding-left: 27px;
        }

        .messageList li {
          margin: 7px 0;
          padding-left: 4px;
        }

        .listenButton {
          margin-top: 20px;
          padding: 11px 17px;
          border: 1px solid rgba(150, 159, 190, 0.18);
          border-radius: 17px;
          color: #b8bdc9;
          background: rgba(38, 42, 57, 0.72);
          font-size: 16px;
          cursor: pointer;
        }

        .loadingBubble {
          min-width: 150px;
        }

        .typingDots {
          display: flex;
          align-items: center;
          gap: 7px;
          height: 24px;
        }

        .typingDots span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #9ca7dc;
          animation: typing 1.1s infinite ease-in-out;
        }

        .typingDots span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .typingDo
