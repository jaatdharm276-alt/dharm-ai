"use client";

import { useEffect, useRef, useState } from "react";

function formatText(text) {
  const lines = String(text || "").split("\n");

  return lines.map((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return <div key={index} className="spaceLine" />;
    }

    if (trimmed.startsWith("### ")) {
      return (
        <h3 key={index}>
          {trimmed.replace("### ", "")}
        </h3>
      );
    }

    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={index}>
          {trimmed.replace("## ", "")}
        </h2>
      );
    }

    if (trimmed.startsWith("# ")) {
      return (
        <h1 key={index}>
          {trimmed.replace("# ", "")}
        </h1>
      );
    }

    if (
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ") ||
      trimmed.startsWith("• ")
    ) {
      return (
        <div key={index} className="bullet">
          <span>•</span>
          <span>
            {trimmed.replace(/^[-*•]\s*/, "")}
          </span>
        </div>
      );
    }

    const numbered = trimmed.match(/^(\d+)[.)]\s+(.*)$/);

    if (numbered) {
      return (
        <div key={index} className="numbered">
          <span>{numbered[1]}.</span>
          <span>{numbered[2]}</span>
        </div>
      );
    }

    return <p key={index}>{line}</p>;
  });
}

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Namaste 🙏\n\nMain Dharm AI hoon. Aap Bhagavad Gita, Ramayana, Mahabharata, puja, mantra, dharma aur spiritual life se jude sawaal pooch sakte ho."
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  async function sendMessage(text) {
    const message = String(
      text !== undefined ? text : input
    ).trim();

    if (!message || loading) {
      return;
    }

    setInput("");

    setMessages((oldMessages) => [
      ...oldMessages,
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
          message: message
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Server response nahi mila."
        );
      }

      const reply =
        data?.reply ||
        "Maaf kijiye 🙏 Abhi response nahi mila.";

      setMessages((oldMessages) => [
        ...oldMessages,
        {
          role: "assistant",
          content: reply
        }
      ]);
    } catch (error) {
      setMessages((oldMessages) => [
        ...oldMessages,
        {
          role: "assistant",
          content:
            "Maaf kijiye 🙏\n\n" +
            (error?.message ||
              "Kuch technical problem aa gayi.")
        }
      ]);
    } finally {
      setLoading(false);
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
        "Aapke browser mein voice input supported nahi hai."
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
        transcript +=
          event.results[i][0].transcript;
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

  function speak(text) {
    if (
      typeof window === "undefined" ||
      !window.speechSynthesis
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = String(text)
      .replace(/[#*`]/g, "")
      .replace(/\n/g, " ");

    const speech =
      new SpeechSynthesisUtterance(cleanText);

    speech.lang = "hi-IN";
    speech.rate = 0.95;

    window.speechSynthesis.speak(speech);
  }

  function quickQuestion(question) {
    setInput(question);

    setTimeout(() => {
      sendMessage(question);
    }, 50);
  }

  const quickQuestions = [
    "Bhagavad Gita ka saar batao",
    "Dharma kya hai?",
    "Hanuman ji ka mantra batao",
    "Aaj ka dharmik vichar batao"
  ];

  return (
    <div className="page">

      <div className="backgroundGlow glow1"></div>
      <div className="backgroundGlow glow2"></div>

      <div className="app">

        <header className="header">

          <div className="brand">

            <div className="logo">
              🌸
            </div>

            <div className="brandInfo">

              <div className="brandName">
                Dharm AI
              </div>

              <div className="online">
                <span></span>
                Online
              </div>

            </div>

          </div>

          <button
            className="sparkButton"
            onClick={() =>
              quickQuestion(
                "Mujhe aaj ka ek shubh dharmik vichar batao"
              )
            }
            aria-label="Quick question"
          >
            ✦
          </button>

        </header>

        <main className="chatArea">

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
                    <div className="assistantTitle">
                      <span>🌸</span>
                      <b>Dharm AI</b>
                    </div>
                  )}

                  <div className="messageContent">
                    {formatText(message.content)}
                  </div>

                  {message.role === "assistant" && (
                    <button
                      className="speakButton"
                      onClick={() =>
                        speak(message.content)
                      }
                      aria-label="Listen"
                    >
                      🔊
                    </button>
                  )}

                </div>

              </div>

            ))}

            {loading && (
              <div className="message assistantMessage">

                <div className="avatar">
                  🌸
                </div>

                <div className="bubble assistantBubble">

                  <div className="assistantTitle">
                    <span>🌸</span>
                    <b>Dharm AI</b>
                  </div>

                  <div className="typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>

                </div>

              </div>
            )}

            {messages.length === 1 && !loading && (
              <div className="quickQuestions">

                {quickQuestions.map((question) => (
                  <button
                    key={question}
                    onClick={() =>
                      quickQuestion(question)
                    }
                  >
                    {question}
                  </button>
                ))}

              </div>
            )}

            <div ref={chatEndRef}></div>

          </div>

        </main>

        <footer className="bottomArea">

          <div className="inputBox">

            <textarea
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
              placeholder="Dharm AI se kuch poochiye..."
              rows={1}
            />

            <button
              className={
                listening
                  ? "voiceButton active"
                  : "voiceButton"
              }
              onClick={startVoice}
              aria-label="Voice"
            >
              🎙️
            </button>

            <button
              className="sendButton"
              onClick={() => sendMessage()}
              disabled={
                !input.trim() || loading
              }
              aria-label="Send"
            >
              ➤
            </button>

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
          background: #02040b;
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
          inset: 0;
          width: 100%;
          height: 100dvh;
          min-height: 0;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 10% 0%,
              rgba(94, 65, 190, 0.18),
              transparent 30%
            ),
            radial-gradient(
              circle at 100% 100%,
              rgba(45, 75, 180, 0.14),
              transparent 35%
            ),
            #02040b;
        }

        .backgroundGlow {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(90px);
          opacity: 0.18;
        }

        .glow1 {
          width: 280px;
          height: 280px;
          left: -120px;
          top: -120px;
          background: #704cff;
        }

        .glow2 {
          width: 320px;
          height: 320px;
          right: -140px;
          bottom: -140px;
          background: #315dff;
        }

        .app {
          position: absolute;
          inset: 0;
          z-index: 2;
          width: 100%;
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: rgba(3, 5, 12, 0.82);
        }

        .header {
          position: relative;
          z-index: 10;
          flex: 0 0 auto;
          width: 100%;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 15px;
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.07);
          background: rgba(7, 9, 18, 0.98);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .logo {
          width: 45px;
          height: 45px;
          flex: 0 0 45px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background:
            linear-gradient(
              145deg,
              #292142,
              #14182a
            );
          font-size: 23px;
          box-shadow:
            0 8px 25px
              rgba(95, 65, 190, 0.2);
        }

        .brandInfo {
          min-width: 0;
        }

        .brandName {
          color: #ffffff;
          font-size: 21px;
          font-weight: 800;
        }

        .online {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 3px;
          color: #7f89a7;
          font-size: 12px;
        }

        .online span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #43e78d;
          box-shadow: 0 0 10px #43e78d;
        }

        .sparkButton {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          border: 1px solid
            rgba(156, 125, 255, 0.25);
          border-radius: 14px;
          background: #111526;
          color: #aa91ff;
          font-size: 22px;
          cursor: pointer;
        }

        .chatArea {
          flex: 1 1 0;
          min-height: 0;
          width: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }

        .chat {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          padding: 18px 12px 18px;
        }

        .message {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          width: 100%;
          margin-bottom: 18px;
        }

        .assistantMessage {
          justify-content: flex-start;
        }

        .userMessage {
          justify-content: flex-end;
        }

        .avatar {
          width: 39px;
          height: 39px;
          flex: 0 0 39px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: #171d31;
          font-size: 18px;
        }

        .bubble {
          max-width: min(88%, 760px);
          padding: 16px 17px;
          border-radius: 22px;
          overflow-wrap: anywhere;
        }

        .assistantBubble {
          border: 1px solid
            rgba(105, 114, 150, 0.23);
          background:
            linear-gradient(
              145deg,
              #171d31,
              #101524
            );
          box-shadow:
            0 18px 40px
              rgba(0, 0, 0, 0.18);
        }

        .userBubble {
          border: 1px solid
            rgba(120, 130, 170, 0.2);
          background: #252c48;
        }

        .assistantTitle {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          color: #b4b9cc;
          font-size: 14px;
        }

        .assistantTitle span {
          font-size: 20px;
        }

        .messageContent {
          color: #f4f4f8;
          font-size: 16px;
          line-height: 1.62;
        }

        .messageContent p {
          margin: 0 0 11px;
        }

        .messageContent p:last-child {
          margin-bottom: 0;
        }

        .messageContent h1,
        .messageContent h2,
        .messageContent h3 {
          margin: 0 0 12px;
          color: #ffffff;
          line-height: 1.3;
        }

        .messageContent h1 {
          font-size: 24px;
        }

        .messageContent h2 {
          font-size: 21px;
        }

        .messageContent h3 {
          font-size: 19px;
        }

        .spaceLine {
          height: 8px;
        }

        .bullet {
          display: flex;
          gap: 9px;
          margin: 6px 0;
        }

        .bullet span:first-child {
          color: #a995ff;
          font-weight: 800;
        }

        .numbered {
          display: flex;
          gap: 9px;
          margin: 6px 0;
        }

        .numbered span:first-child {
          color: #a995ff;
          font-weight: 800;
        }

        .speakButton {
          width: 37px;
          height: 37px;
          margin-top: 11px;
          border: 0;
          border-radius: 11px;
          background: #20263b;
          color: #bec5df;
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
          background: #9785dc;
          animation: typing 1.1s
            infinite ease-in-out;
        }

        .typing span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .typing span:nth-child(3) {
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

        .quickQuestions {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 9px;
          width: 100%;
          margin-top: 5px;
        }

        .quickQuestions button {
          min-height: 50px;
          padding: 10px 13px;
          border: 1px solid
            rgba(125, 112, 190, 0.22);
          border-radius: 15px;
          background: #0e1220;
          color: #c8c4db;
          text-align: left;
          cursor: pointer;
        }

        .quickQuestions button:active {
          transform: scale(0.98);
        }

        .bottomArea {
          position: relative;
          z-index: 20;
          flex: 0 0 auto;
          width: 100%;
          padding: 8px 10px
            max(8px, env(safe-area-inset-bottom));
          background: #03050c;
          border-top: 1px solid
            rgba(255, 255, 255, 0.04);
        }

        .inputBox {
          display: flex;
          align-items: flex-end;
          gap: 7px;
          width: 100%;
          min-height: 60px;
          padding: 6px;
          border: 1px solid
            rgba(111, 120, 159, 0.25);
          border-radius: 20px;
          background: #101422;
          box-shadow:
            0 8px 30px
              rgba(0, 0, 0, 0.25);
        }

        textarea {
          flex: 1 1 auto;
          width: 0;
          min-width: 0;
          height: 46px;
          max-height: 100px;
          resize: none;
          outline: none;
          border: 0;
          background: transparent;
          color: #f5f5f8;
          padding: 11px 7px;
          font-size: 16px;
          line-height: 1.4;
        }

        textarea::placeholder {
          color: #737b98;
        }

        .voiceButton,
        .sendButton {
          width: 46px;
          height: 46px;
          flex: 0 0 46px;
          border: 0;
          border-radius: 14px;
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
          background: #292362;
          color: #c2b8ff;
             color: #c2b8ff;
      font-size: 23px;
    }

    .sendButton:disabled {
      opacity: 0.45;
      cursor: default;
    }

    @media (max-width: 600px) {

      .header {
        height: 70px;
        padding: 7px 13px;
      }

      .chat {
        padding: 14px 9px 16px;
      }

      .bubble {
        max-width: 91%;
      }

      .quickQuestions {
        grid-template-columns: 1fr;
      }

      .bottomArea {
        padding-left: 8px;
        padding-right: 8px;
      }

    }

    @media (max-width: 380px) {

      .brandName {
        font-size: 19px;
      }

      .logo {
        width: 42px;
        height: 42px;
        flex-basis: 42px;
      }

      .sparkButton {
        width: 42px;
        height: 42px;
        flex-basis: 42px;
      }

      .messageContent {
        font-size: 15px;
      }

    }

  `}</style>

</div>
);
}
