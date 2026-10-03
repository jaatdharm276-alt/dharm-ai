
"use client";

import { useEffect, useRef, useState } from "react";

const welcomeMessage =
  "Namaste 🙏\n\nMain ORION AI hoon — aapka intelligent companion. Aap mujhse sawaal pooch sakte ho.";

const suggestions = [
  { icon: "✧", title: "Email likho", prompt: "Mere liye ek professional email likho." },
  { icon: "◇", title: "Business ideas", prompt: "Mujhe kuch practical business ideas batao." },
  { icon: "✎", title: "Padhai mein help", prompt: "Mujhe kisi topic ko aasan bhasha mein samjhao." },
  { icon: "⌘", title: "Coding help", prompt: "Mujhe coding mein step-by-step help karo." },
  { icon: "◷", title: "Study plan", prompt: "Mere liye ek daily study plan banao." },
];

function renderInline(text) {
  return String(text || "")
    .split(/(\*\*.*?\*\*|\*[^*]+\*)/g)
    .map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return <em key={i}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
}

function formatText(text) {
  return String(text || "").split("\n").map((line, i) => {
    const trimmed = line.trim();

    if (!trimmed) return <div key={i} className="spaceLine" />;

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const Tag = heading[1].length === 1 ? "h1" : heading[1].length === 2 ? "h2" : "h3";
      return <Tag key={i}>{renderInline(heading[2])}</Tag>;
    }

    const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      return (
        <div className="textBullet" key={i}>
          <span>•</span>
          <span>{renderInline(bullet[1])}</span>
        </div>
      );
    }

    return <p key={i}>{renderInline(line)}</p>;
  });
}

function MicIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="12" rx="3" fill="currentColor" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
      <path d="m4 17 5-5 3 3 3-4 5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NewChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2v-5.5A7.5 7.5 0 1 1 20 11.5Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 7v7M8.5 10.5h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const chatAreaRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const recognitionRef = useRef(null);
  const requestRef = useRef(false);

  useEffect(() => {
    const el = chatAreaRef.current;
    if (!el || !shouldAutoScrollRef.current) return;

    const frame = requestAnimationFrame(() => {
      if (shouldAutoScrollRef.current && chatAreaRef.current) {
        chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function newChat() {
    recognitionRef.current?.stop();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    requestRef.current = false;
    setMessages([]);
    setInput("");
    setLoading(false);
    setListening(false);
    setSpeaking(false);
    setShowComingSoon(false);
    setShowMenu(false);
    shouldAutoScrollRef.current = true;
  }

  async function sendMessage(text) {
    const message = String(text !== undefined ? text : input).trim();
    if (!message || requestRef.current) return;

    requestRef.current = true;
    shouldAutoScrollRef.current = true;
    setInput("");
    setLoading(true);
    setShowMenu(false);

    setMessages((old) => [...old, { role: "user", content: message }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Server se response nahi mila.");
      }

      const reply = String(data?.reply || "Maaf kijiye 🙏 Abhi response nahi mila.");

      setMessages((old) => [...old, { role: "assistant", content: "" }]);

      // Jawab dheere-dheere type hoga.
      const charactersPerStep = 3;
      const typingDelay = 18;

      for (let i = 0; i < reply.length; i += charactersPerStep) {
        const visibleText = reply.slice(0, i + charactersPerStep);

        setMessages((old) => {
          const updated = [...old];
          const lastIndex = updated.length - 1;

          if (updated[lastIndex]?.role === "assistant") {
            updated[lastIndex] = { ...updated[lastIndex], content: visibleText };
          }

          return updated;
        });

        await new Promise((resolve) => setTimeout(resolve, typingDelay));
      }
    } catch (error) {
      setMessages((old) => [
        ...old,
        {
          role: "assistant",
          content: "Maaf kijiye 🙏\n\n" +
            (error?.message || "Technical problem aa gayi. Dobara try karein."),
        },
      ]);
    } finally {
      requestRef.current = false;
      setLoading(false);
    }
  }

  function handleChatScroll(event) {
    const el = event.currentTarget;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;

    if (distance <= 24) {
      shouldAutoScrollRef.current = true;
    } else if (distance > 48) {
      shouldAutoScrollRef.current = false;
    }
  }

  function startVoice() {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Aapke browser mein voice input supported nahi hai.");
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

    recognition.onstart = () => setListening(true);
    recognition.onerror = (event) => {
      setListening(false);
      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        alert("Mic permission allow karein, phir dobara try karein.");
      }
    };
    recognition.onend = () => setListening(false);

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript.trimStart());
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  }

  function speak(text) {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      alert("Aapke browser mein read aloud support nahi hai.");
      return;
    }

    if (window.speechSynthesis.speaking || speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const cleanText = String(text)
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .replace(/\n/g, " ");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = /[\u0900-\u097F]/.test(cleanText) ? "hi-IN" : "en-IN";
    utterance.rate = 0.95;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="page">
      <div className="ambient ambientOne" />
      <div className="ambient ambientTwo" />

      <div className="app">
        <header className="header">
          <button
            className="roundButton menuButton"
            onClick={() => setShowMenu((old) => !old)}
            aria-label="Menu"
            title="Menu"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <button
            className="upgradeButton"
            onClick={() => alert("Upgrade feature jald aa raha hai.")}
          >
            <span className="diamond">✦</span>
            <span>Upgrade</span>
          </button>

          <div className="headerSpacer" />

          <button className="roundButton assistantButton"
            onClick={newChat} aria-label="New chat" title="New chat">
            <NewChatIcon />
          </button>
        </header>

        {showMenu && (
          <div className="menuPanel">
            <button onClick={newChat}><NewChatIcon /> New Chat</button>
            <button onClick={() => { setShowComingSoon(true); setShowMenu(false); }}>
              <ImageIcon /> Create an image or sticker
            </button>
            <button onClick={() => { setInput("Mujhe likhne ya editing mein madad chahiye."); setShowMenu(false); }}>
              <span className="menuPencil">✎</span> Write or edit
            </button>
            <div className="menuCredit">Powered by Dharm AI</div>
          </div>
        )}

        <div className="newChatBar">
          <button className="newChatAction" onClick={newChat}>
            <span className="newChatIcon"><NewChatIcon /></span>
            <span>New Chat</span>
          </button>
          <span className="barDivider" />
          <button
            className={listening ? "headerMic active" : "headerMic"}
            onClick={startVoice}
            aria-label={listening ? "Mic band karein" : "Voice input"}
            title={listening ? "Mic band karein" : "Bolkar poochhein"}
          >
            {listening ? <span className="micStop">■</span> : <MicIcon size={24} />}
          </button>
        </div>
      
        <main
          ref={chatAreaRef}
          className="chatArea"
          onScroll={handleChatScroll}
        >
          {messages.length === 0 ? (
            <div className="welcomeScreen">
              <div className="welcomeLogo">
                <svg viewBox="0 0 100 100" fill="none" aria-label="ORION AI logo">
                  <ellipse cx="50" cy="50" rx="42" ry="17"
                    stroke="url(#orionGradient)" strokeWidth="3"
                    transform="rotate(-35 50 50)" />
                  <circle cx="50" cy="50" r="25"
                    fill="#0a1940" stroke="url(#orionGradient)" strokeWidth="2.5" />
                  <path d="M50 32 56 44 68 50 56 56 50 68 44 56 32 50 44 44Z"
                    fill="url(#orionGradient)" />
                  <defs>
                    <linearGradient id="orionGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#80edff" />
                      <stop offset="55%" stopColor="#668dff" />
                      <stop offset="100%" stopColor="#bd9bff" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <h1 className="welcomeTitle">ORION <span>AI</span></h1>
              <p className="welcomeSubtitle">Your Intelligent Companion</p>
              <p className="welcomeCredit">Powered by Dharm AI</p>

              <div className="quickActions">
                <button className="quickAction" onClick={() => setShowComingSoon(true)}>
                  <span className="quickIcon"><ImageIcon /></span>
                  <span>Create an image or sticker</span>
                  <span className="quickArrow">↗</span>
                </button>

                <button
                  className="quickAction"
                  onClick={() => {
                    setInput("Mujhe likhne ya editing mein madad chahiye.");
                    document.querySelector(".messageInput")?.focus();
                  }}
                >
                  <span className="quickIcon pencilIcon">✎</span>
                  <span>Write or edit</span>
                  <span className="quickArrow">↗</span>
                </button>
              </div>

              <div className="suggestions">
                <div className="suggestionHeading">AAP KYA JAANNA CHAHTE HAIN?</div>
                <div className="suggestionGrid">
                  {suggestions.map((item) => (
                    <button
                      key={item.title}
                      className="suggestionChip"
                      onClick={() => sendMessage(item.prompt)}
                    >
                      <span className="suggestionIcon">{item.icon}</span>
                      <span>{item.title}</span>
                      <span className="suggestionArrow">↗</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="chat">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={message.role === "user"
                    ? "message userMessage"
                    : "message assistantMessage"}
                >
                  {message.role === "assistant" && (
                    <div className="avatar">✦</div>
                  )}

                  <div className={message.role === "user"
                    ? "bubble userBubble"
                    : "bubble assistantBubble"}
                  >
                    {message.role === "assistant" && (
                      <div className="assistantTitle">
                        <span>✦</span>
                        <b>ORION AI</b>
                      </div>
                    )}

                    <div className="messageContent">
                      {formatText(message.content)}
                    </div>

                    {message.role === "assistant" && message.content && (
                      <button
                        className={speaking ? "speakButton active" : "speakButton"}
                        onClick={() => speak(message.content)}
                        title={speaking ? "Awaaz rokein" : "Jawab sunen"}
                        aria-label={speaking ? "Awaaz rokein" : "Jawab sunen"}
                      >
                        {speaking ? (
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
                            <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
                            <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"
                              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="loadingNote">
                  <span className="loadingDot" />
                  ORION AI jawab taiyar kar raha hai...
                </div>
              )}
            </div>
          )}
        </main>

        <footer className="bottomArea">
          {listening && (
            <div className="voiceStatus" role="status" aria-live="polite">
              <span className="voiceStatusDot" />
              <span className="voiceWaves">
                <i /><i /><i /><i /><i />
              </span>
              <span>Sun raha hoon... boliye</span>
              <span className="voiceStopHint">Mic dabakar rokein</span>
            </div>
          )}

          <div className={listening ? "inputBox listeningBox" : "inputBox"}>
            <button
              className="plusButton"
              onClick={() => setShowMenu((old) => !old)}
              aria-label="More options"
              title="More options"
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <textarea
              className="messageInput"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey &&
                    !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask ORION AI..."
              rows={1}
              aria-label="Message likhein"
            />

            <button
              className={listening ? "voiceButton active" : "voiceButton"}
              onClick={startVoice}
              title={listening ? "Sunna band karein" : "Bolkar poochhein"}
              aria-label={listening ? "Sunna band karein" : "Bolkar poochhein"}
            >
              {listening ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
                </svg>
              ) : <MicIcon size={23} />}
            </button>

            <button
              className="sendButton"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              title="Send"
              aria-label="Message bhejein"
            >
              {loading ? (
                <span className="sendSpinner" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>

          <div className="footerCredit">
            ORION AI <span>·</span> Powered by Dharm AI
          </div>
        </footer>

        {showComingSoon && (
          <div
            className="modalOverlay"
            onClick={() => setShowComingSoon(false)}
            role="presentation"
          >
            <div
              className="comingSoonCard"
              role="dialog"
              aria-modal="true"
              aria-labelledby="comingSoonTitle"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="modalClose"
                onClick={() => setShowComingSoon(false)}
                aria-label="Close"
              >×</button>

              <div className="comingSoonIcon">
                <ImageIcon />
                <span className="sparkle sparkleOne">✦</span>
                <span className="sparkle sparkleTwo">✧</span>
              </div>

              <div className="comingSoonEyebrow">ORION AI FEATURE</div>
              <h2 id="comingSoonTitle">Coming Soon</h2>
              <p>Create amazing images and stickers with AI.</p>
              <div className="comingSoonLine" />
              <div className="modalCredit">Powered by Dharm AI</div>
              <button className="modalDone" onClick={() => setShowComingSoon(false)}>
                Samajh gaya
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
            
        * { box-sizing: border-box; }
        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
        }
        body {
          overflow: hidden;
          background: #030a20;
        }
        button, textarea { font: inherit; }
        button { -webkit-tap-highlight-color: transparent; }

        .page {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          color: #eaf2ff;
          background:
            radial-gradient(ellipse at 12% 10%, rgba(0,75,210,.13), transparent 42%),
            radial-gradient(ellipse at 92% 88%, rgba(71,42,180,.12), transparent 38%),
            #03091c;
        }

        .ambient {
          position: absolute;
          width: 230px;
          height: 230px;
          border-radius: 50%;
          filter: blur(85px);
          opacity: .12;
          pointer-events: none;
          animation: ambientMove 9s ease-in-out infinite alternate;
        }
        .ambientOne { left: -130px; top: 12%; background: #0878ff; }
        .ambientTwo { right: -140px; bottom: 4%; background: #7749ff; animation-delay: -4s; }

        .app {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(3,10,31,.30), rgba(2,8,25,.18));
        }

        .header {
          position: relative;
          z-index: 10;
          flex: 0 0 auto;
          min-height: 76px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          padding-top: max(10px, env(safe-area-inset-top));
          background: rgba(3,10,29,.88);
          border-bottom: 1px solid rgba(71,133,255,.12);
        }

        .roundButton {
          width: 46px;
          height: 46px;
          flex: 0 0 46px;
          display: grid;
          place-items: center;
          padding: 0;
          border-radius: 50%;
          border: 1px solid rgba(85,157,255,.36);
          color: #eaf6ff;
          background: linear-gradient(145deg, rgba(15,39,87,.86), rgba(3,15,44,.94));
          box-shadow: 0 0 9px rgba(22,105,255,.14), inset 0 0 8px rgba(31,106,255,.06);
          cursor: pointer;
          transition: border-color .2s, background .2s, transform .2s;
        }
        .roundButton svg { width: 23px; height: 23px; }
        .roundButton:active { transform: scale(.95); }
        .roundButton:hover { border-color: rgba(93,190,255,.70); }

        .upgradeButton {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 44px;
          padding: 0 17px;
          border: 1px solid rgba(71,153,255,.40);
          border-radius: 25px;
          background: linear-gradient(110deg, rgba(8,65,144,.75), rgba(15,35,91,.82));
          color: #a9d9ff;
          font-size: 17px;
          font-weight: 750;
          box-shadow: 0 0 10px rgba(0,98,255,.12);
          cursor: pointer;
        }
        .diamond { color: #80eaff; font-size: 20px; }
        .headerSpacer { flex: 1; }

        .newChatBar {
          position: relative;
          z-index: 8;
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 61px;
          margin: 10px 13px 0;
          padding: 6px 10px 6px 13px;
          border: 1px solid rgba(49,126,255,.47);
          border-radius: 34px;
          background: linear-gradient(110deg, rgba(8,27,73,.88), rgba(4,17,51,.88));
          box-shadow: 0 0 12px rgba(0,87,255,.10), inset 0 0 10px rgba(22,100,255,.04);
        }

        .newChatAction {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 0;
          padding: 5px 0;
          background: transparent;
          color: #dcecff;
          font-size: 17px;
          font-weight: 650;
          text-align: left;
          cursor: pointer;
        }
        .newChatIcon {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(63,171,255,.72);
          border-radius: 50%;
          color: #9ceaff;
          box-shadow: 0 0 8px rgba(0,157,255,.17);
        }
        .newChatIcon svg { width: 23px; height: 23px; }
        .barDivider { width: 1px; height: 32px; background: rgba(65,139,255,.48); }

        .headerMic {
          width: 43px;
          height: 43px;
          flex: 0 0 43px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(66,167,255,.66);
          border-radius: 50%;
          background: linear-gradient(145deg, rgba(11,51,106,.88), rgba(4,18,50,.96));
          color: #b6efff;
          box-shadow: 0 0 8px rgba(0,133,255,.12);
          cursor: pointer;
        }
        .headerMic.active {
          color: #ff9ab9;
          border-color: rgba(255,104,150,.65);
          box-shadow: 0 0 12px rgba(255,65,124,.25);
        }
        .micStop { font-size: 16px; }

        .menuPanel {
          position: absolute;
          z-index: 30;
          top: 74px;
          left: 13px;
          width: min(285px, calc(100vw - 26px));
          padding: 9px;
          border: 1px solid rgba(74,141,255,.45);
          border-radius: 17px;
          background: rgba(5,16,43,.98);
          box-shadow: 0 10px 35px rgba(0,0,0,.38), 0 0 12px rgba(0,102,255,.12);
          backdrop-filter: blur(18px);
        }
        .menuPanel button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 10px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: #dcecff;
          text-align: left;
          cursor: pointer;
        }
        .menuPanel button:hover { background: rgba(41,91,175,.20); }
        .menuPanel svg { width: 20px; height: 20px; color: #8bdfff; }
        .menuPencil { width: 20px; color: #9bcaff; font-size: 21px; text-align: center; }
        .menuCredit {
          padding: 10px 10px 4px;
          border-top: 1px solid rgba(85,131,215,.16);
          color: #91a7cc;
          font-size: 11px;
        }

        .chatArea {
          flex: 1 1 0;
          min-height: 0;
          width: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: rgba(68,126,218,.45) transparent;
        }
        .welcomeScreen {
          width: 100%;
          min-height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 22px 16px 28px;
        }
        .welcomeLogo {
          width: 66px;
          height: 66px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(71,154,255,.55);
          border-radius: 21px;
          background: linear-gradient(145deg, rgba(9,34,81,.92), rgba(5,14,42,.92));
          box-shadow: 0 0 12px rgba(0,99,255,.18), inset 0 0 10px rgba(0,122,255,.08);
        }
        .welcomeLogo svg { width: 52px; height: 52px; }

        .welcomeTitle {
          margin: 13px 0 0;
          color: #e5f5ff;
          font-size: 29px;
          font-weight: 850;
          letter-spacing: 2px;
          text-shadow: 0 0 9px rgba(38,143,255,.20);
        }
        .welcomeTitle span { color: #82caff; }
        .welcomeSubtitle { margin: 4px 0 0; color: #a4badc; font-size: 13px; }
        .welcomeCredit { margin: 5px 0 0; color: #809bc4; font-size: 10px; letter-spacing: .4px; }

        .quickActions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          max-width: 450px;
          margin-top: 26px;
        }
        .quickAction {
          min-height: 57px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 9px 13px;
          border: 1px solid rgba(48,121,255,.43);
          border-radius: 18px;
          background: linear-gradient(110deg, rgba(7,28,72,.80), rgba(4,17,48,.86));
          color: #d8eaff;
          font-size: 15px;
          font-weight: 600;
          text-align: left;
          box-shadow: 0 0 9px rgba(0,86,255,.08);
          cursor: pointer;
          transition: border-color .2s, background .2s;
        }
        .quickAction:hover {
          border-color: rgba(91,174,255,.68);
          background: linear-gradient(110deg, rgba(10,41,97,.90), rgba(5,20,56,.94));
        }
        .quickIcon {
          width: 37px;
          height: 37px;
          flex: 0 0 37px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(67,160,255,.53);
          border-radius: 50%;
          color: #94dfff;
          box-shadow: 0 0 7px rgba(0,138,255,.12);
        }
        .quickIcon svg { width: 21px; height: 21px; }
        .pencilIcon { font-size: 25px; }
        .quickArrow { margin-left: auto; color: #6fa9ed; font-size: 18px; }

        .suggestions { width: 100%; max-width: 450px; margin-top: 23px; }
        .suggestionHeading {
          margin: 0 0 10px;
          color: #829bc4;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.1px;
          text-align: center;
        }
        .suggestionGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 7px;
        }
        .suggestionChip {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 10px 8px;
          border: 1px solid rgba(60,111,200,.28);
          border-radius: 12px;
          background: rgba(8,21,52,.72);
          color: #c7d8f2;
          font-size: 11px;
          text-align: left;
          cursor: pointer;
        }
        .suggestionIcon { color: #86caff; font-size: 15px; }
        .suggestionArrow { margin-left: auto; color: #6d9bd8; }

        .chat { width: 100%; max-width: 850px; margin: 0 auto; padding: 16px 11px 20px; }
        .message {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          width: 100%;
          margin-bottom: 13px;
          animation: messageEnter .20s ease-out both;
        }
        .assistantMessage { justify-content: flex-start; }
        .userMessage { justify-content: flex-end; }

        .avatar {
          width: 31px;
          height: 31px;
          flex: 0 0 31px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(78,151,255,.48);
          border-radius: 11px;
          background: #091b41;
          color: #94d9ff;
          box-shadow: 0 0 8px rgba(0,116,255,.12);
        }
        .bubble {
          min-width: 0;
          max-width: min(90%,720px);
          padding: 12px 13px;
          border-radius: 16px;
          overflow-wrap: anywhere;
        }
        .assistantBubble {
          border: 1px solid rgba(76,128,213,.25);
          background: linear-gradient(145deg, rgba(8,22,53,.96), rgba(5,15,39,.97));
          box-shadow: 0 2px 10px rgba(0,0,0,.10);
        }
        .userBubble {
          border: 1px solid rgba(69,133,255,.40);
          background: linear-gradient(135deg, rgba(14,46,105,.90), rgba(10,31,75,.96));
          box-shadow: 0 0 9px rgba(0,103,255,.08);
        }
        .assistantTitle {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 7px;
          color: #a4c9f9;
          font-size: 12px;
        }
        .assistantTitle span { color: #85dfff; }
        .messageContent {
          color: #e1eafa;
          font-size: 14px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }
        .messageContent p { margin: 0 0 8px; }
        .messageContent p:last-child { margin-bottom: 0; }
        .messageContent h1,.messageContent h2,.messageContent h3 {
          margin: 0 0 8px;
          color: #eff7ff;
          line-height: 1.4;
        }
        .messageContent h1 { font-size: 20px; }
        .messageContent h2 { font-size: 18px; }
        .messageContent h3 { font-size: 16px; }
        .spaceLine { height: 5px; }
        .textBullet { display: flex; gap: 8px; margin: 5px 0; }
        .textBullet span:first-child { color: #7fcaff; }

        .speakButton {
          width: 34px;
          height: 32px;
          margin-top: 9px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(71,145,235,.32);
          border-radius: 10px;
          background: rgba(13,34,77,.85);
          color: #9acfff;
          cursor: pointer;
        }
        .speakButton svg { width: 19px; height: 19px; }
        .speakButton.active { color: #e5f6ff; border-color: #63baff; }

        .loadingNote {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 10px 0 12px 39px;
          color: #9bbbe9;
          font-size: 12px;
        }
        .loadingDot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #72caff;
          animation: typing 1s ease-in-out infinite alternate;
        }

        .bottomArea {
          position: relative;
          z-index: 8;
          flex: 0 0 auto;
          width: 100%;
          padding: 9px 10px;
          padding-bottom: max(9px, env(safe-area-inset-bottom));
          border-top: 1px solid rgba(65,117,206,.14);
          background: rgba(3,10,29,.96);
        }
        .inputBox {
          display: flex;
          align-items: flex-end;
          gap: 5px;
          width: 100%;
          min-height: 56px;
          padding: 5px;
          border: 1px solid rgba(60,139,255,.46);
          border-radius: 30px;
          background: linear-gradient(110deg, rgba(8,25,63,.98), rgba(4,14,37,.99));
          box-shadow: 0 0 9px rgba(0,95,255,.09), inset 0 0 8px rgba(28,100,255,.03);
        }
        .inputBox:focus-within {
          border-color: rgba(84,173,255,.78);
          box-shadow: 0 0 0 1px rgba(44,122,255,.10), 0 0 13px rgba(0,100,255,.13);
        }
        .plusButton,.voiceButton,.sendButton {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          cursor: pointer;
        }
        .plusButton {
          border: 1px solid rgba(72,140,255,.35);
          background: rgba(8,27,67,.90);
          color: #b7d8ff;
        }
        .plusButton svg { width: 25px; height: 25px; }
        .messageInput {
          flex: 1 1 auto;
          width: 0;
          min-width: 0;
          height: 42px;
          max-height: 110px;
          resize: none;
          outline: none;
          border: 0;
          background: transparent;
          color: #eff6ff;
          padding: 11px 6px;
          font-size: 15px;
          line-height: 1.4;
        }
        .messageInput::placeholder { color: #8b9fbe; }

        .voiceButton {
          border: 1px solid rgba(70,147,244,.27);
          background: rgba(8,26,63,.85);
          color: #b1d8ff;
        }
        .voiceButton.active {
          color: #ff9cbd;
          border-color: rgba(255,104,150,.52);
          box-shadow: 0 0 10px rgba(255,65,124,.17);
        }
        .voiceButton svg { width: 23px; height: 23px; }

        .sendButton {
          border: 1px solid rgba(82,157,255,.62);
          background: linear-gradient(145deg, #1265c9, #183e96);
          color: #f1f9ff;
          box-shadow: 0 0 9px rgba(0,105,255,.16);
        }
        .sendButton svg { width: 22px; height: 22px; }
        .sendButton:disabled { opacity: .38; cursor: default; box-shadow: none; }
        .sendSpinner {
          width: 17px;
          height: 17px;
          border: 2px solid rgba(255,255,255,.30);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin .7s linear infinite;
        }
        .footerCredit {
          padding-top: 8px;
          color: #8196b9;
          text-align: center;
          font-size: 10px;
          letter-spacing: .35px;
        }
        .footerCredit span { color: #527fbf; }

        .voiceStatus {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 34px;
          margin-bottom: 7px;
          padding: 7px 9px;
          border: 1px solid rgba(255,105,155,.23);
          border-radius: 12px;
          background: rgba(49,15,43,.70);
          color: #ffc2d6;
          font-size: 12px;
        }
        .voiceStatusDot {
          width: 7px;
          height: 7px;
          flex: 0 0 7px;
          border-radius: 50%;
          background: #ff759f;
          animation: typing .7s infinite alternate;
        }
        .voiceWaves { display: inline-flex; align-items: center; gap: 2px; height: 18px; }
        .voiceWaves i {
          display: block;
          width: 3px;
          height: 6px;
          border-radius: 4px;
          background: #ff87ae;
          animation: voiceWave .7s ease-in-out infinite alternate;
        }
        .voiceWaves i:nth-child(2) { animation-delay: .12s; height: 12px; }
        .voiceWaves i:nth-child(3) { animation-delay: .24s; height: 17px; }
        .voiceWaves i:nth-child(4) { animation-delay: .36s; height: 10px; }
        .voiceWaves i:nth-child(5) { animation-delay: .48s; }
        .voiceStopHint { margin-left: auto; color: #c29aaf; font-size: 9px; }
        .listeningBox { border-color: rgba(255,105,155,.56); }

        .modalOverlay {
          position: absolute;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(1,5,19,.76);
          backdrop-filter: blur(7px);
          animation: fadeIn .18s ease-out;
        }
        .comingSoonCard {
          position: relative;
          width: 100%;
          max-width: 390px;
          padding: 32px 22px 24px;
          border: 1px solid rgba(66,137,255,.60);
          border-radius: 27px;
          background: linear-gradient(145deg, rgba(8,26,67,.99), rgba(3,12,36,.99));
          box-shadow: 0 0 18px rgba(0,95,255,.13), 0 20px 65px rgba(0,0,0,.36);
          text-align: center;
        }
        .modalClose {
          position: absolute;
          top: 10px;
          right: 13px;
          width: 34px;
          height: 34px;
          border: 1px solid rgba(94,143,217,.28);
          border-radius: 50%;
          background: rgba(9,26,61,.85);
          color: #bdd6fa;
          font-size: 25px;
          line-height: 1;
          cursor: pointer;
        }
        .comingSoonIcon {
          position: relative;
          width: 76px;
          height: 76px;
          display: grid;
          place-items: center;
          margin: 0 auto 16px;
          border: 1px solid rgba(71,164,255,.57);
          border-radius: 22px;
          background: rgba(10,36,86,.85);
          color: #92ddff;
          box-shadow: 0 0 12px rgba(0,112,255,.15);
        }
        .comingSoonIcon svg { width: 39px; height: 39px; }
        .sparkle { position: absolute; color: #8fe7ff; }
        .sparkleOne { top: -7px; right: -5px; font-size: 19px; }
        .sparkleTwo { bottom: 1px; left: -8px; font-size: 16px; }
        .comingSoonEyebrow {
          color: #82a9de;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2px;
        }
        .comingSoonCard h2 {
          margin: 10px 0;
          color: #c0e8ff;
          font-size: 29px;
          font-weight: 800;
              text-shadow: 0 0 10px rgba(0,132,255,.22);
        }
        .comingSoonCard p {
          max-width: 280px;
          margin: 0 auto;
          color: #b1c5e5;
          font-size: 14px;
          line-height: 1.6;
        }
        .comingSoonLine {
          width: 65px;
          height: 2px;
          margin: 21px auto 12px;
          border-radius: 3px;
          background: #438dff;
          opacity: .75;
        }
        .modalCredit { color: #819dc8; font-size: 10px; }
        .modalDone {
          min-height: 43px;
          margin-top: 23px;
          padding: 0 26px;
          border: 1px solid rgba(76,151,255,.55);
          border-radius: 24px;
          background: linear-gradient(110deg, #124eaa, #183b85);
          color: #e6f5ff;
          box-shadow: 0 0 9px rgba(0,105,255,.13);
          cursor: pointer;
        }

        @keyframes messageEnter {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ambientMove {
          from { transform: scale(.92); opacity: .08; }
          to { transform: scale(1.08); opacity: .14; }
        }
        @keyframes typing {
          from { opacity: .4; transform: scale(.9); }
          to { opacity: 1; transform: scale(1.1); }
        }
        @keyframes voiceWave {
          from { transform: scaleY(.45); }
          to { transform: scaleY(1.15); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        @media (max-width: 380px) {
          .header { gap: 8px; padding-left: 11px; padding-right: 11px; }
          .roundButton { width: 42px; height: 42px; flex-basis: 42px; }
          .upgradeButton { min-height: 41px; padding: 0 12px; font-size: 15px; }
          .newChatBar { margin-left: 9px; margin-right: 9px; }
          .newChatAction { font-size: 15px; gap: 9px; }
          .welcomeScreen { padding-left: 12px; padding-right: 12px; }
          .welcomeTitle { font-size: 26px; }
          .quickAction { font-size: 13px; }
          .suggestionGrid { gap: 5px; }
          .suggestionChip { padding: 9px 6px; font-size: 10px; }
          .plusButton,.voiceButton,.sendButton { width: 38px; height: 38px; flex-basis: 38px; }
          .messageInput { height: 38px; font-size: 14px; }
          .voiceStopHint { font-size: 8px; }
        }

        @media (max-height: 700px) {
          .welcomeScreen { justify-content: flex-start; padding-top: 17px; }
          .welcomeLogo { width: 54px; height: 54px; border-radius: 17px; }
          .welcomeLogo svg { width: 43px; height: 43px; }
          .welcomeTitle { margin-top: 8px; font-size: 25px; }
          .quickActions { margin-top: 18px; }
          .quickAction { min-height: 49px; }
          .suggestions { margin-top: 15px; }
        }

        @media (prefers-reduced-motion: reduce) {
          *,*::before,*::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
