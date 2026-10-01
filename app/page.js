"use client";

import { useEffect, useRef, useState } from "react";

function renderInline(text) {
  const parts = String(text).split(
    /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g
  );

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index}>
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={index}>
          {part.slice(1, -1)}
        </em>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function formatMessage(text) {
  return String(text)
    .split("\n")
    .map((rawLine, index) => {
      let line = rawLine.trim();

      if (!line) {
        return <div className="emptyLine" key={index} />;
      }

      // Markdown heading
      const heading = line.match(/^#{1,6}\s+(.*)$/);

      if (heading) {
        return (
          <div className="messageHeading" key={index}>
            {renderInline(heading[1])}
          </div>
        );
      }

      // Bullet using *, -, +
      if (/^[*+-]\s+/.test(line)) {
        line = line.replace(/^[*+-]\s+/, "");

        return (
          <div className="messageBullet" key={index}>
            <span className="bulletDot">•</span>
            <span>{renderInline(line)}</span>
          </div>
        );
      }

      // Numbered list
      const numbered = line.match(/^(\d+)[.)]\s+(.*)$/);

      if (numbered) {
        return (
          <div className="messageNumber" key={index}>
            <span className="numberLabel">
              {numbered[1]}.
            </span>
            <span>{renderInline(numbered[2])}</span>
          </div>
        );
      }

      return (
        <div className="messageLine" key={index}>
          {renderInline(line)}
        </div>
      );
    });
}

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Namaste 🙏 Main Dharm AI hoon.\nApna sawaal poochho.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingReply, setTypingReply] = useState(false);
  const [listening, setListening] = useState(false);

  const chatRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading, typingReply]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  function speakText(text) {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const cleanText = String(text)
      .replace(/#{1,6}\s+/g, "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .replace(/\*/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);

    utterance.lang = "hi-IN";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  }

  function startListening() {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Aapke browser me voice input support nahi hai.");
      return;
    }

    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {}

      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const transcript =
        event.results?.[0]?.[0]?.transcript || "";

      setInput((prev) =>
        prev ? `${prev} ${transcript}` : transcript
      );
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

  async function sendMessage(customMessage) {
    const message = String(
      customMessage !== undefined ? customMessage : input
    ).trim();

    if (!message || loading || typingReply) return;

    setInput("");

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: message,
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
        "Maaf kijiye, mujhe abhi response nahi mila.";

      setLoading(false);
      setTypingReply(true);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "",
        },
      ]);

      let current = "";

      for (let i = 0; i < reply.length; i++) {
        current += reply[i];

        setMessages((prev) => {
          const updated = [...prev];

          updated[updated.length - 1] = {
            role: "assistant",
            text: current,
          };

          return updated;
        });

        await new Promise((resolve) =>
          setTimeout(resolve, 8)
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
          text:
            "Maaf kijiye 🙏 Abhi server se response nahi aa pa raha. Thodi der baad dobara try karo.",
        },
      ]);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function quickPrompt(text) {
    setInput(text);
  }

  const showQuickActions = messages.length === 1;

  return (
    <main className="page">
      <div className="ambient ambientOne" />
      <div className="ambient ambientTwo" />

      <section className="appShell">
        <header className="header">
          <div className="brand">
            <div className="brandIcon">
              🌸
            </div>

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
            type="button"
            onClick={() =>
              quickPrompt("Aaj ka dharmik vichar batao.")
            }
            aria-label="Quick prompt"
          >
            ✦
          </button>
        </header>

        <div className="chatArea" ref={chatRef}>
          <div className="chatInner">
            {messages.map((message, index) => (
              <div
                className={`messageRow ${
                  message.role === "user"
                    ? "userRow"
                    : "assistantRow"
                }`}
                key={index}
              >
                <div
                  className={`bubble ${
                    message.role === "user"
                      ? "userBubble"
                      : "assistantBubble"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="messageTop">
                      <div className="miniIcon">
                        🌸
                      </div>

                      <div className="miniName">
                        Dharm AI
                      </div>
                    </div>
                  )}

                  {message.role === "user" && (
                    <div className="messageTop userTop">
                      <div className="miniIcon userMini">
                        👤
                      </div>

                      <div className="miniName">
                        You
                      </div>
                    </div>
                  )}

                  <div className="text">
                    {formatMessage(message.text)}
                  </div>

                  {message.role === "assistant" &&
                    index === 0 && (
                      <button
                        type="button"
                        className={`listenButton ${
                          listening ? "listening" : ""
                        }`}
                        onClick={() =>
                          speakText(message.text)
                        }
                      >
                        🔊 {listening ? "सुन रहा हूँ..." : "सुनें"}
                      </button>
                    )}

                  {message.role === "assistant" &&
                    index > 0 &&
                    message.text && (
                      <button
                        type="button"
                        className="smallSpeak"
                        onClick={() =>
                          speakText(message.text)
                        }
                      >
                        🔊 सुनें
                      </button>
                    )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="messageRow assistantRow">
                <div className="bubble assistantBubble loadingBubble">
                  <div className="messageTop">
                    <div className="miniIcon">
                      🌸
                    </div>

                    <div className="miniName">
                      Dharm AI
                    </div>
                  </div>

                  <div className="typingDots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            {showQuickActions && (
              <div className="quickActions">
                <button
                  type="button"
                  onClick={() =>
                    sendMessage(
                      "Bhagavad Gita ka ek shlok batao aur uska arth samjhao."
                    )
                  }
                >
                  📖 Gita ka shlok
                </button>

                <button
                  type="button"
                  onClick={() =>
                    sendMessage(
                      "Aaj ka ek sundar dharmik vichar batao."
                    )
                  }
                >
                  ✨ Aaj ka vichar
                </button>

                <button
                  type="button"
                  onClick={() =>
                    sendMessage(
                      "Mujhe dharm ke baare mein ek interesting baat batao."
                    )
                  }
                >
                  🕉️ Dharm gyaan
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="inputArea">
          <div className="inputBox">
            <span className="inputEmoji">
              ✨
            </span>

            <textarea
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Ask Dharm AI..."
              rows={1}
              disabled={loading || typingReply}
            />

            <button
              type="button"
              className="sendButton"
              onClick={() => sendMessage()}
              disabled={
                !input.trim() ||
                loading ||
                typingReply
              }
              aria-label="Send message"
            >
              ➤
            </button>
          </div>

          <button
            type="button"
            className="voiceInputButton"
            onClick={startListening}
            aria-label="Voice input"
          >
            🎙️
          </button>
        </div>
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
          background: #02040b;
        }

        body {
          overflow: hidden;
          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
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
          inset: 0;
          width: 100%;
          height: 100dvh;
          min-height: 100dvh;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 50% -10%,
              rgba(47, 62, 145, 0.22),
              transparent 38%
            ),
            linear-gradient(
              180deg,
              #050817 0%,
              #02050d 55%,
              #01030a 100%
            );
          color: #f7f8ff;
        }

        .ambient {
          position: absolute;
          pointer-events: none;
          filter: blur(80px);
          opacity: 0.35;
        }

        .ambientOne {
          width: 300px;
          height: 300px;
          top: 15%;
          left: -180px;
          background: #263fa4;
        }

        .ambientTwo {
          width: 300px;
          height: 300px;
          right: -180px;
          bottom: 15%;
          background: #452080;
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
              rgba(4, 7, 20, 0.97),
              rgba(1, 4, 12, 0.99)
            );
        }

        .header {
          flex: 0 0 auto;
          min-height: 168px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding:
            max(20px, env(safe-area-inset-top))
            34px
            20px;
          border-bottom: 1px solid rgba(120, 130, 170, 0.16);
          background: rgba(3, 6, 18, 0.92);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 26px;
          min-width: 0;
        }

        .brandIcon {
          width: 110px;
          height: 110px;
          flex: 0 0 110px;
          display: grid;
          place-items: center;
          border-radius: 28px;
          font-size: 58px;
          background:
            linear-gradient(
              145deg,
              rgba(33, 40, 72, 0.98),
              rgba(17, 21, 43, 0.98)
            );
          border: 1px solid rgba(150, 160, 205, 0.24);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 10px 30px rgba(0, 0, 0, 0.24);
        }

        .brandText {
          min-width: 0;
        }

        .brandTitle {
          font-size: 38px;
          line-height: 1.05;
          font-weight: 800;
          letter-spacing: -1.2px;
          white-space: nowrap;
        }

        .brandTitle span {
          margin-left: 4px;
        }

        .online {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 12px;
          font-size: 25px;
          color: #9da2b6;
        }

        .onlineDot {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #4ee6a0;
          box-shadow:
            0 0 10px rgba(78, 230, 160, 0.7),
            0 0 22px rgba(78, 230, 160, 0.28);
        }

        .sparkButton {
          width: 92px;
          height: 92px;
          flex: 0 0 92px;
          border-radius: 50%;
          border: 1px solid rgba(150, 160, 205, 0.25);
          background: rgba(24, 30, 55, 0.82);
          color: #b8baff;
          font-size: 46px;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 12px 30px rgba(0, 0, 0, 0.18);
        }

        .sparkButton:active {
          transform: scale(0.96);
        }

        .chatArea {
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: rgba(110, 120, 160, 0.25)
            transparent;
        }

        .chatInner {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          padding: 28px 34px 28px;
        }

        .messageRow {
          width: 100%;
          display: flex;
          margin-bottom: 22px;
        }

        .assistantRow {
          justify-content: flex-start;
        }

        .userRow {
          justify-content: flex-end;
        }

        .bubble {
          width: min(100%, 760px);
          border-radius: 30px;
          padding: 30px 34px;
          overflow-wrap: anywhere;
        }

        .assistantBubble {
          background:
            linear-gradient(
              145deg,
              rgba(27, 34, 58, 0.96),
              rgba(14, 18, 33, 0.96)
            );
          border: 1px solid rgba(130, 140, 180, 0.2);
          box-shadow:
            0 18px 40px rgba(0, 0, 0, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.025);
        }

        .userBubble {
          max-width: 80%;
          background:
            linear-gradient(
              145deg,
              rgba(55, 54, 120, 0.95),
              rgba(35, 33, 90, 0.95)
            );
          border: 1px solid rgba(145, 145, 230, 0.25);
        }

        .messageTop {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 26px;
        }

        .userTop {
          margin-bottom: 16px;
        }

        .miniIcon {
          width: 72px;
          height: 72px;
          flex: 0 0 72px;
          display: grid;
          place-items: center;
          border-radius: 20px;
          background: #303656;
          font-size: 37px;
        }

        .userMini {
          font-size: 30px;
        }

        .miniName {
          font-size: 29px;
          font-weight: 750;
          color: #a7abc0;
        }

        .text {
          font-size: 18px !important;
          line-height: 1.62;
          white-space: normal;
          color: #f5f6fb;
          overflow-wrap: anywhere;
        }

        .text strong {
          font-weight: 800;
          color: #ffffff;
        }

        .text em {
          font-style: italic;
        }

        .text code {
          padding: 2px 7px;
          border-radius: 7px;
          background: rgba(0, 0, 0, 0.28);
          font-size: 0.9em;
        }

        .messageLine {
          min-height: 1.6em;
        }

        .messageHeading {
          margin-top: 18px;
          margin-bot
