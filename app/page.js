"use client";
import { useEffect, useRef, useState } from "react";

function inline(text) {
  return String(text)
    .split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
    .map((x, i) => {
      if (x.startsWith("**") && x.endsWith("**"))
        return <strong key={i}>{x.slice(2, -2)}</strong>;

      if (x.startsWith("*") && x.endsWith("*"))
        return <em key={i}>{x.slice(1, -1)}</em>;

      if (x.startsWith("`") && x.endsWith("`"))
        return <code key={i}>{x.slice(1, -1)}</code>;

      return <span key={i}>{x}</span>;
    });
}

function formatMessage(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const out = [];
  let list = [];
  let type = "";

  const flush = () => {
    if (!list.length) return;

    out.push(
      type === "ol" ? (
        <ol key={out.length}>{list}</ol>
      ) : (
        <ul key={out.length}>{list}</ul>
      )
    );

    list = [];
    type = "";
  };

  lines.forEach((raw, i) => {
    const s = raw.trim();

    if (!s) {
      flush();
      out.push(<div className="space" key={i} />);
      return;
    }

    const h = s.match(/^#{1,6}\s+(.*)$/);

    if (h) {
      flush();
      out.push(<h3 key={i}>{inline(h[1])}</h3>);
      return;
    }

    const n = s.match(/^\d+[.)]\s+(.*)$/);

    if (n) {
      if (type !== "ol") {
        flush();
        type = "ol";
      }

      list.push(<li key={i}>{inline(n[1])}</li>);
      return;
    }

    const b = s.match(/^(?:[-*•])\s+(.*)$/);

    if (b) {
      if (type !== "ul") {
        flush();
        type = "ul";
      }

      list.push(<li key={i}>{inline(b[1])}</li>);
      return;
    }

    flush();
    out.push(<p key={i}>{inline(s)}</p>);
  });

  flush();
  return out;
}

const QUICK = [
  [
    "📖",
    "Gita ka shlok",
    "Bhagavad Gita ka ek shlok batao, arth aur jeevan ka sandesh samjhao.",
  ],
  [
    "✨",
    "Aaj ka vichar",
    "Aaj ka ek chhota sa dharmik aur positive vichar batao.",
  ],
  [
    "🕉️",
    "Dharm gyaan",
    "Hindu dharm se juda ek rochak aur upyogi gyaan batao.",
  ],
];

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Namaste 🙏 Main Dharm AI hoon.\n\nApna sawaal poochho.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const endRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {}

      recognitionRef.current?.stop?.();
    };
  }, []);

  function speak(text) {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const clean = String(text)
      .replace(/[#*_`]/g, "")
      .replace(/\s+/g, " ");

    const u = new SpeechSynthesisUtterance(clean);

    u.lang = /[\u0900-\u097F]/.test(clean) ? "hi-IN" : "en-IN";
    u.rate = 0.92;

    window.speechSynthesis.speak(u);
  }

  function voice() {
    const SR =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) {
      alert("Is browser mein voice input supported nahi hai.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const r = new SR();

    r.lang = "hi-IN";
    r.interimResults = true;
    r.continuous = false;

    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);

    r.onresult = (e) => {
      let t = "";

      for (
        let i = e.resultIndex;
        i < e.results.length;
        i++
      ) {
        t += e.results[i][0].transcript;
      }

      setInput(t);
    };

    recognitionRef.current = r;
    r.start();
  }

  async function send(custom) {
    const message = String(custom ?? input).trim();

    if (!message || loading) return;

    setInput("");

    setMessages((p) => [
      ...p,
      {
        role: "user",
        text: message,
      },
    ]);

    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Server error");
      }

      const reply = String(
        data?.reply || "No response received."
      );

      let shown = "";

      setMessages((p) => [
        ...p,
        {
          role: "assistant",
          text: "",
          typing: true,
        },
      ]);

      for (const ch of reply) {
        shown += ch;

        setMessages((p) => {
          const a = [...p];

          a[a.length - 1] = {
            role: "assistant",
            text: shown,
            typing: true,
          };

          return a;
        });

        await new Promise((r) => setTimeout(r, 6));
      }

      setMessages((p) => {
        const a = [...p];

        a[a.length - 1] = {
          role: "assistant",
          text: reply,
          typing: false,
        };

        return a;
      });
    } catch (e) {
      setMessages((p) => [
        ...p,
        {
          role: "assistant",
          text:
            "Maaf kijiye, abhi jawab nahi aa paaya.\n\nError: " +
            e.message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="glow g1" />
      <div className="glow g2" />

      <section className="app">
        <header className="header">
          <div className="brand">
            <div className="flower">🌸</div>

            <div>
              <div className="title">
                Dharm AI <span>✨</span>
              </div>

              <div className="online">
                <i />
                Online
              </div>
            </div>
          </div>

          <button
            className="spark"
            onClick={() =>
              setInput("Aaj ka dharmik vichar batao.")
            }
          >
            ✦
          </button>
        </header>

        <div className="chat">
          <div className="inner">
            {messages.map((m, i) => (
              <div
                className={`row ${m.role}`}
                key={i}
              >
                <div
                  className={`bubble ${m.role}`}
                >
                  {m.role === "assistant" && (
                    <div className="identity">
                      <div className="mini">
                        🌸
                      </div>

                      <b>Dharm AI</b>
                    </div>
                  )}

                  <div className="text">
                    {formatMessage(m.text)}
                  </div>

                  {m.role === "assistant" &&
                    !m.typing && (
                      <button
                        className="listen"
                        onClick={() => speak(m.text)}
                      >
                        🔊 <span>सुनें</span>
                      </button>
                    )}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="quick">
                {QUICK.map(
                  ([icon, name, p], i) => (
                    <button
                      key={i}
                      onClick={() => send(p)}
                    >
                      {icon} {name}
                    </button>
                  )
                )}
              </div>
            )}

            {loading && (
              <div className="dots">
                <i />
                <i />
                <i />
              </div>
            )}

            <div ref={endRef} />
          </div>
        </div>

        <div className="inputArea">
          <div className="inputBox">
            <button
              className={
                listening
                  ? "voice active"
                  : "voice"
              }
              onClick={voice}
            >
              🎙️
            </button>

            <input
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey
                ) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={
                listening
                  ? "Bolna shuru karein..."
                  : "Ask Dharm AI..."
              }
              disabled={loading}
            />

            <button
              className="send"
              onClick={() => send()}
              disabled={!input.trim() || loading}
            >
              ➤
            </button>
          </div>
        </div>
      </section>

      <style jsx global>{`
              :global(*) {
          box-sizing: border-box;
        }

        :global(html),
        :global(body) {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background: #02040b;
        }

        :global(body) {
          overflow: hidden;
          font-family:
            Arial,
            "Noto Sans Devanagari",
            sans-serif;
        }

        :global(button),
        :global(input) {
          font: inherit;
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
              circle at 50% 20%,
              rgba(40, 45, 90, 0.18),
              transparent 45%
            ),
            #02040b;
          color: #fff;
        }

        .app {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .glow {
          position: fixed;
          pointer-events: none;
          filter: blur(70px);
          opacity: 0.18;
          border-radius: 50%;
          z-index: 0;
        }

        .g1 {
          width: 240px;
          height: 240px;
          background: #695cff;
          top: -100px;
          left: -90px;
        }

        .g2 {
          width: 260px;
          height: 260px;
          background: #ff5fa2;
          right: -120px;
          bottom: 60px;
        }

        .header {
          flex-shrink: 0;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding:
            max(16px, env(safe-area-inset-top))
            34px
            14px;
          border-bottom: 1px solid
            rgba(120, 130, 180, 0.18);
          background: rgba(5, 8, 22, 0.96);
          backdrop-filter: blur(18px);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 24px;
          min-width: 0;
        }

        .flower {
          width: 110px;
          height: 110px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 28px;
          background: #151a32;
          border: 2px solid
            rgba(125, 135, 190, 0.28);
          box-shadow:
            0 15px 40px rgba(0, 0, 0, 0.25),
            inset 0 0 20px
              rgba(120, 130, 255, 0.06);
          font-size: 58px;
        }

        .title {
          color: #fff;
          font-size: 54px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: -1.5px;
          white-space: nowrap;
        }

        .title span {
          margin-left: 8px;
        }

        .online {
          margin-top: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #9da3ba;
          font-size: 29px;
        }

        .online i {
          width: 23px;
          height: 23px;
          border-radius: 50%;
          background: #52e89a;
          box-shadow:
            0 0 14px #52e89a;
        }

        .spark {
          width: 96px;
          height: 96px;
          flex-shrink: 0;
          border-radius: 50%;
          border: 2px solid
            rgba(125, 135, 190, 0.24);
          background: #151a32;
          color: #aab0ff;
          font-size: 48px;
          cursor: pointer;
          box-shadow:
            0 12px 30px rgba(0, 0, 0, 0.22);
        }

        .chat {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: #303751 transparent;
        }

        .inner {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
          padding: 44px 34px 30px;
        }

        .row {
          width: 100%;
          display: flex;
          margin-bottom: 28px;
        }

        .row.assistant {
          justify-content: flex-start;
        }

        .row.user {
          justify-content: flex-end;
        }

        .bubble {
          border-radius: 34px;
          overflow: hidden;
          overflow-wrap: anywhere;
        }

        .bubble.assistant {
          width: 100%;
          background:
            linear-gradient(
              145deg,
              #171d31,
              #101525
            );
          border: 1px solid
            rgba(102, 111, 155, 0.32);
          padding: 38px 44px;
          box-shadow:
            0 20px 45px
              rgba(0, 0, 0, 0.28),
            inset 0 1px 0
              rgba(255, 255, 255, 0.035);
        }

        .bubble.user {
          width: auto;
          max-width: 82%;
          background: #252c48;
          border: 1px solid
            rgba(112, 122, 165, 0.34);
          padding: 20px 25px;
        }

        .identity {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 28px;
        }

        .mini {
          width: 76px;
          height: 76px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 24px;
          background: #303653;
          font-size: 38px;
        }

        .identity b {
          color: #aeb4ca;
          font-size: 37px;
          font-weight: 750;
        }

        .text {
          color: #f4f4f8;
          font-size: 25px;
          line-height: 1.62;
          letter-spacing: -0.15px;
          overflow-wrap: anywhere;
        }

        .user .text {
          font-size: 20px;
          line-height: 1.5;
        }

        .text p {
          margin: 0 0 20px;
        }

        .text p:last-child {
          margin-bottom: 0;
        }

        .text h3 {
          margin: 28px 0 14px;
          color: #fff;
          font-size: 27px;
          line-height: 1.35;
          font-weight: 800;
        }

        .text h3:first-child {
          margin-top: 0;
        }

        .text ul,
        .text ol {
          margin: 8px 0 22px;
          padding-left: 32px;
        }

        .text li {
          margin: 8px 0;
          padding-left: 5px;
        }

        .text strong {
          color: #fff;
          font-weight: 800;
        }

        .text em {
          color: #f0e7ff;
        }

        .text code {
          padding: 3px 8px;
          border-radius: 8px;
          background: #080c18;
          color: #c9cfff;
          font-size: 0.88em;
        }

        .space {
          height: 12px;
        }

        .listen {
          margin-top: 24px;
          padding: 13px 20px;
          border-radius: 17px;
          border: 1px solid
            rgba(150, 160, 190, 0.22);
          background: #262a39;
          color: #b9becb;
          font-size: 21px;
          cursor: pointer;
        }

        .listen:active,
        .quick button:active,
        .send:active,
        .spark:active {
          transform: scale(0.97);
        }

        .quick {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-top: 8px;
          margin-bottom: 28px;
        }

        .quick button {
          min-height: 70px;
          padding: 12px 18px;
          border-radius: 24px;
          border: 1px solid
            rgba(120, 130, 180, 0.28);
          background: #151a32;
          color: #aeb4ca;
          font-size: 23px;
          cursor: pointer;
          text-align: left;
        }

        .quick button:last-child {
          grid-column: 1 / 2;
        }

        .dots {
          display: flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          padding: 16px 20px;
          margin-bottom: 20px;
          border-radius: 20px;
          background: #171d31;
          border: 1px solid
            rgba(102, 111, 155, 0.25);
        }

        .dots i {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #aeb4ca;
          animation: blink 1.2s infinite ease-in-out;
        }

        .dots i:nth-child(2) {
          animation-delay: 0.15s;
        }

        .dots i:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes blink {
          0%,
          70%,
          100% {
            opacity: 0.3;
            transform: translateY(0);
          }

          35% {
            opacity: 1;
            transform: translateY(-4px);
          }
        }

        .inputArea {
          flex-shrink: 0;
          width: 100%;
          padding:
            8px
            24px
            max(12px, env(safe-area-inset-bottom));
          background: linear-gradient(
            to top,
            #02040b 70%,
            rgba(2, 4, 11, 0)
          );
        }

        .inputBox {
          width: 100%;
          max-width: 980px;
          min-height: 110px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px 10px 18px;
          border-radius: 34px;
          border: 1px solid
            rgba(105, 115, 165, 0.38);
          background: #0e1223;
          box-shadow:
            0 20px 50px
              rgba(0, 0, 0, 0.35),
            inset 0 1px 0
              rgba(255, 255, 255, 0.035);
        }

        .voice {
          width: 52px;
          height: 52px;
          flex-shrink: 0;
          border: 0;
          background: transparent;
          color: #b1b6c9;
          font-size: 25px;
          cursor: pointer;
        }

        .voice.active {
          color: #ff7aa8;
          filter: drop-shadow(
            0 0 8px rgba(255, 100, 160, 0.7)
          );
        }

        .inputBox input {
          flex: 1;
          min-width: 0;
          height: 72px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #fff;
          font-size: 27px;
        }

        .inputBox input::placeholder {
          color: #777d95;
          opacity: 1;
        }

        .send {
          width: 92px;
          height: 92px;
          flex-shrink: 0;
          border: 0;
          border-radius: 28px;
          background: #252064;
          color: #8e8baa;
          font-size: 46px;
          cursor: pointer;
          transition:
            transform 0.15s,
            opacity 0.15s,
            background 0.15s;
        }

        .send:not(:disabled) {
          background: #30277b;
          color: #a8a3ff;
        }

        .send:disabled {
          opacity: 0.7;
          cursor: default;
        }

        @media (max-width: 700px) {
          .header {
            padding-left: 34px;
            padding-right: 34
                padding-right: 34px;
  }

  .headerTitle {
    font-size: 31px;
  }

  .headerLogo {
    width: 92px;
    height: 92px;
  }

  .headerSpark {
    width: 92px;
    height: 92px;
    font-size: 43px;
  }

  .onlineText {
    font-size: 25px;
  }

  .chatArea {
    padding-left: 0;
    padding-right: 0;
  }

  .chatInner {
    padding: 38px 22px 24px;
  }

  .messageBubble {
    max-width: 100%;
    padding: 26px 22px;
    border-radius: 30px;
  }

  .assistantBubble {
    width: 100%;
  }

  .messageText {
    font-size: 23px;
    line-height: 1.62;
  }

  .userBubble {
    max-width: 88%;
    padding: 18px 20px;
  }

  .userText {
    font-size: 19px;
  }

  .messageIdentity {
    gap: 16px;
    margin-bottom: 20px;
  }

  .identityAvatar {
    width: 66px;
    height: 66px;
    font-size: 31px;
  }

  .identityName {
    font-size: 25px;
  }

  .quickActions {
    gap: 12px;
  }

  .quickButton {
    font-size: 17px;
    padding: 13px 17px;
  }

  .inputArea {
    padding: 10px 16px max(12px, env(safe-area-inset-bottom));
  }

  .inputBox {
    min-height: 78px;
    border-radius: 28px;
  }

  .input {
    font-size: 20px;
  }

  .send {
    width: 76px;
    height: 76px;
    border-radius: 24px;
    font-size: 39px;
  }

  .listenButton {
    padding: 14px 20px;
    font-size: 19px;
  }
}

@media (max-width: 480px) {
  .header {
    padding-left: 18px;
    padding-right: 18px;
  }

  .headerLogo {
    width: 82px;
    height: 82px;
    border-radius: 27px;
  }

  .headerTitle {
    font-size: 28px;
  }

  .headerSpark {
    width: 82px;
    height: 82px;
    border-radius: 50%;
    font-size: 37px;
  }

  .onlineText {
    font-size: 22px;
  }

  .chatInner {
    padding: 28px 12px 20px;
  }

  .messageBubble {
    padding: 22px 18px;
    border-radius: 27px;
  }

  .messageText {
    font-size: 21px;
    line-height: 1.6;
  }

  .userBubble {
    max-width: 90%;
    padding: 16px 18px;
  }

  .userText {
    font-size: 18px;
  }

  .identityAvatar {
    width: 58px;
    height: 58px;
    font-size: 27px;
  }

  .identityName {
    font-size: 22px;
  }

  .inputArea {
    padding-left: 12px;
    padding-right: 12px;
  }

  .inputBox {
    min-height: 72px;
    border-radius: 25px;
  }

  .input {
    font-size: 18px;
  }

  .send {
    width: 68px;
    height: 68px;
    border-radius: 22px;
    font-size: 35px;
  }
}

@media (max-height: 700px) {
  .header {
    min-height: 82px;
    padding-top: 10px;
    padding-bottom: 10px;
  }

  .headerLogo,
  .headerSpark {
    width: 70px;
    height: 70px;
  }

  .headerTitle {
    font-size: 25px;
  }

  .onlineText {
    font-size: 19px;
  }

  .chatInner {
    padding-top: 20px;
  }

  .inputBox {
    min-height: 66px;
  }

  .send {
    width: 62px;
    height: 62px;
    font-size: 32px;
  }
}
`}</style>
    </>
  );
}
