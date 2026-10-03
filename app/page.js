
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const suggestions = [
  { icon: "✧", title: "Email likho", prompt: "Mere liye ek professional email likho." },
  { icon: "◇", title: "Business ideas", prompt: "Mujhe kuch practical business ideas batao." },
  { icon: "⌂", title: "Padhai mein help", prompt: "Mujhe kisi topic ko aasan bhasha mein samjhao." },
  { icon: "</>", title: "Coding help", prompt: "Mujhe coding mein step-by-step help karo." },
  { icon: "◷", title: "Study plan", prompt: "Mere liye ek daily study plan banao." },
];

function renderInline(text) {
  return String(text || "").split(/(\*\*.*?\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function formatText(text) {
  const lines = String(text || "").split("\n");
  const output = [];
  let code = false;
  let codeLines = [];

  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) {
      if (code) output.push(<pre className="codeBlock" key={`code-${i}`}><code>{codeLines.join("\n")}</code></pre>);
      code = !code;
      codeLines = [];
      return;
    }

    if (code) {
      codeLines.push(line);
      return;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      output.push(<div className="spaceLine" key={`space-${i}`} />);
      return;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const Tag = heading[1].length === 1 ? "h2" : heading[1].length === 2 ? "h3" : "h4";
      output.push(<Tag key={i}>{renderInline(heading[2])}</Tag>);
      return;
    }

    const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      output.push(<div className="textBullet" key={i}><span>•</span><span>{renderInline(bullet[1])}</span></div>);
      return;
    }

    const numbered = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (numbered) {
      output.push(<div className="numberedLine" key={i}><span>{numbered[1]}.</span><span>{renderInline(numbered[2])}</span></div>);
      return;
    }

    output.push(<p key={i}>{renderInline(line)}</p>);
  });

  if (code && codeLines.length) {
    output.push(<pre className="codeBlock" key="unfinished-code"><code>{codeLines.join("\n")}</code></pre>);
  }

  return output;
}

function extractReplyFromJson(data) {
  if (typeof data?.reply === "string") return data.reply;
  if (typeof data?.text === "string") return data.text;
  if (typeof data?.choices?.[0]?.message?.content === "string") return data.choices[0].message.content;
  if (typeof data?.choices?.[0]?.delta?.content === "string") return data.choices[0].delta.content;

  const parts = data?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) return parts.map((p) => p?.text || "").join("");

  return "";
}

function parseServerResponse(raw) {
  const trimmed = String(raw || "").trim();

  if (!trimmed) {
    return { reply: "", error: "API se khaali response mila." };
  }

  // Normal JSON response.
  try {
    const json = JSON.parse(trimmed);
    if (json?.error) return { reply: "", error: String(json.error) };
    return { reply: extractReplyFromJson(json), error: "" };
  } catch {
    // JSON nahi hai to SSE format check karein.
  }

  // OpenAI/Groq aur Gemini SSE responses.
  if (trimmed.includes("data:")) {
    let reply = "";
    const events = trimmed.split(/\r?\n\r?\n/);

    for (const event of events) {
      const payload = event.split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .filter(Boolean)
        .join("\n");

      if (!payload || payload === "[DONE]") continue;

      try {
        const packet = JSON.parse(payload);

        if (packet?.error) {
          return {
            reply: "",
            error: String(packet.error?.message || packet.error),
          };
        }

        const piece = extractReplyFromJson(packet);
        if (piece) reply += piece;
      } catch {
        // Khali ya non-JSON event ko ignore karein.
      }
    }

    return { reply, error: "" };
  }

  return {
    reply: "",
    error: "Server ka response samajh nahi aaya. /api/chat/route.js check karein.",
  };
}

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const chatAreaRef = useRef(null);
  const inputRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const recognitionRef = useRef(null);
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const loadingRef = useRef(false);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

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

  useEffect(() => () => {
    abortControllerRef.current?.abort();
    recognitionRef.current?.stop();

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const newChat = useCallback(() => {
    abortControllerRef.current?.abort();
    requestIdRef.current += 1;
    loadingRef.current = false;
    setMessages([]);
    setInput("");
    setLoading(false);
    setNotice("");
    setMenuOpen(false);
    shouldAutoScrollRef.current = true;
  }, []);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  async function sendMessage(text) {
    const message = String(text !== undefined ? text : input).trim();

    if (!message || loadingRef.current) return;

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    abortControllerRef.current = controller;
    loadingRef.current = true;
    shouldAutoScrollRef.current = true;

    setNotice("");
    setInput("");
    setMenuOpen(false);
    setLoading(true);

    setMessages((old) => [
      ...old,
      { role: "user", content: message },
      { role: "assistant", content: "", pending: true },
    ]);

    const updateAssistant = (content, pending = false) => {
      if (requestId !== requestIdRef.current) return;

      setMessages((old) => {
        const updated = [...old];
        let index = updated.length - 1;

        while (index >= 0 && updated[index].role !== "assistant") index--;

        if (index >= 0) {
          updated[index] = { ...updated[index], content, pending };
        }

        return updated;
      });
    };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });

      // response.json() ki jagah pehle text padhein.
      // Isse JSON aur data: SSE dono handle ho sakte hain.
      const raw = await response.text();

      if (!response.ok) {
        let serverError = `Server error (${response.status})`;
        const parsedError = parseServerResponse(raw);

        if (parsedError.error) serverError = parsedError.error;
        else if (parsedError.reply) serverError = parsedError.reply;

        throw new Error(serverError);
      }

      const parsed = parseServerResponse(raw);
      if (parsed.error) throw new Error(parsed.error);

      const reply = String(parsed.reply || "").trim();

      if (!reply) {
        throw new Error("AI se khaali response mila. API route aur key check karein.");
      }

      // Valid reply ko dheere-dheere type karein.
      const chunkSize = 3;
      const delay = 16;

      for (let i = 0; i < reply.length; i += chunkSize) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) break;

        updateAssistant(reply.slice(0, i + chunkSize), true);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      updateAssistant(reply, false);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      if (error?.name === "AbortError") {
        setMessages((old) => old.map((item, index) =>
          index === old.length - 1 && item.role === "assistant"
            ? { ...item, pending: false }
            : item
        ));
      } else {
        updateAssistant(
          `Maaf kijiye 🙏\n\n${error?.message || "Technical problem aa gayi. Dobara try karein."}`,
          false
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        loadingRef.current = false;
        setLoading(false);
        abortControllerRef.current = null;
      }
    }
  }

  function handleChatScroll(event) {
    const el = event.currentTarget;
    shouldAutoScrollRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight <= 85;
  }

  function startVoice() {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setNotice("Is browser mein voice input supported nahi hai. Chrome mein try karein.");
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
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  }

  function speak(text) {
    if (typeof window === "undefined" || !window.speechSynthesis || !text) return;

    window.speechSynthesis.cancel();

    const cleanText = String(text)
      .replace(/^#{1,6}\s/gm, "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .replace(/\n/g, " ");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = /[\u0900-\u097F]/.test(cleanText) ? "hi-IN" : "en-IN";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  function focusComposer(prefix = "") {
    setInput(prefix);
    setMenuOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

        
  return (
    <div className="page">
      <div className="ambient ambientOne" />
      <div className="ambient ambientTwo" />

      <div className="app">
        <header className="header">
          <button
            className="roundButton"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            title="Menu"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <button className="upgradeButton" onClick={() => setNotice("Upgrade feature jald hi aayega.")}>
            <span className="diamond">✦</span> Upgrade
          </button>

          <div className="headerSpacer" />

          <button className="roundButton newChatTop" onClick={newChat} aria-label="New chat" title="New chat">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4M15 17h6M18 14v6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m8 9 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity=".0" />
            </svg>
          </button>
        </header>

        {menuOpen && (
          <div className="menuPanel">
            <button onClick={newChat}><span>＋</span> New Chat</button>
            <button onClick={() => { setShowComingSoon(true); setMenuOpen(false); }}>
              <span>▧</span> Create an image or sticker
            </button>
            <div className="menuCredit">ORION AI · Powered by Dharm AI</div>
          </div>
        )}

        <main ref={chatAreaRef} className="chatArea" onScroll={handleChatScroll}>
          {messages.length === 0 ? (
            <div className="homeScreen">
              <div className="heroLogo">
                <svg viewBox="0 0 100 100" fill="none">
                  <defs>
                    <linearGradient id="heroGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#66f0ff" />
                      <stop offset="55%" stopColor="#6485ff" />
                      <stop offset="100%" stopColor="#bb86ff" />
                    </linearGradient>
                  </defs>
                  <ellipse cx="50" cy="50" rx="42" ry="17" stroke="url(#heroGradient)" strokeWidth="4" transform="rotate(-35 50 50)" />
                  <circle cx="50" cy="50" r="24" fill="#09163a" stroke="url(#heroGradient)" strokeWidth="2" />
                  <path d="M50 32 56 44 68 50 56 56 50 68 44 56 32 50 44 44Z" fill="url(#heroGradient)" />
                </svg>
              </div>

              <h1 className="heroTitle">ORION <span>AI</span></h1>
              <p className="heroSubtitle">Your Intelligent Companion</p>
              <p className="heroCredit">Powered by Dharm AI</p>

              <div className="quickActions">
                <button className="quickAction" onClick={() => setShowComingSoon(true)}>
                  <span className="quickIcon">
                    <svg viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                      <path d="m4 17 5-5 3 3 3-4 5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span>Create an image or sticker</span>
                  <span className="quickArrow">↗</span>
                </button>

                <button className="quickAction" onClick={() => focusComposer("Mujhe likhne ya editing mein madad chahiye. ")}>
                  <span className="quickIcon">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="m14 5 5 5M3 21l4.5-1 12-12a2.1 2.1 0 0 0-3-3l-12 12L3 21Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span>Write or edit</span>
                  <span className="quickArrow">↗</span>
                </button>
              </div>

              <div className="suggestions">
                <div className="suggestionHeading">
                  <span className="headingLine" />
                  <span>AAP KYA JAANNA CHAHTE HAIN?</span>
                  <span className="headingLine" />
                </div>

                <div className="suggestionGrid">
                  {suggestions.map((item) => (
                    <button key={item.title} className="suggestionChip" onClick={() => sendMessage(item.prompt)}>
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
                  key={`${index}-${message.role}`}
                  className={`message ${message.role === "user" ? "userMessage" : "assistantMessage"}`}
                >
                  {message.role === "assistant" && <div className="avatar">✦</div>}

                  <div className={`bubble ${message.role === "user" ? "userBubble" : "assistantBubble"}`}>
                    {message.role === "assistant" && (
                      <div className="assistantTitle"><span>✦</span><b>ORION AI</b></div>
                    )}

                    <div className="messageContent">
                      {message.content
                        ? formatText(message.content)
                        : message.pending && loading
                          ? <span className="typingDots" aria-label="ORION AI jawab likh raha hai"><i /><i /><i /></span>
                          : null}

                      {loading && index === messages.length - 1 && message.role === "assistant" && message.content && (
                        <span className="streamCursor" />
                      )}
                    </div>

                    {message.role === "assistant" && message.content && (
                      <button
                        className="speakButton"
                        onClick={() => speak(message.content)}
                        aria-label="Jawab sunen"
                        title="Jawab sunen"
                      >
                        🔊
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <footer className="bottomArea">
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button onClick={() => setNotice("")} aria-label="Notice band karein">×</button>
            </div>
          )}

          {listening && (
            <div className="voiceStatus">
              <span className="voiceStatusDot" />
              <span className="voiceWaves"><i /><i /><i /><i /><i /></span>
              <span>Sun raha hoon... boliye</span>
              <span className="voiceStopHint">Mic dabakar rokein</span>
            </div>
          )}

          <div className="inputBox">
            <button className="plusButton" onClick={() => setMenuOpen((v) => !v)} aria-label="More options" title="More options">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <textarea
              ref={inputRef}
              className="messageInput"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
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
              aria-label={listening ? "Voice input band karein" : "Voice input"}
              title="Voice input"
            >
              {listening ? (
                <span className="micStop">■</span>
              ) : (
                <svg viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
            </button>

            {loading ? (
              <button className="sendButton stopSend" onClick={stopGeneration} aria-label="Jawaab rokein" title="Jawaab rokein">
                <span className="stopSquare" />
              </button>
            ) : (
              <button className="sendButton" onClick={() => sendMessage()} disabled={!input.trim()} aria-label="Message bhejein" title="Send">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>

          <div className="footerCredit">ORION AI <span>·</span> Powered by Dharm AI</div>
        </footer>

        {showComingSoon && (
          <div className="modalOverlay" onClick={() => setShowComingSoon(false)}>
            <div
              className="comingSoonCard"
              role="dialog"
              aria-modal="true"
              aria-labelledby="comingSoonTitle"
              onClick={(event) => event.stopPropagation()}
            >
              <button className="modalClose" onClick={() => setShowComingSoon(false)} aria-label="Close">×</button>
              <div className="comingSoonIcon">▧<span>✦</span></div>
              <div className="modalEyebrow">ORION AI FEATURE</div>
              <h2 id="comingSoonTitle">Coming Soon</h2>
              <p>Create amazing images and stickers with AI.</p>
              <div className="modalLine" />
              <div className="modalCredit">Powered by Dharm AI</div>
              <button className="modalDone" onClick={() => setShowComingSoon(false)}>Samajh gaya</button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
             
        * { box-sizing: border-box; }
        html, body { width:100%; height:100%; margin:0; padding:0; }
        body { overflow:hidden; background:#03091c; color:#e6f2ff; font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
        button, textarea { font:inherit; }
        button { -webkit-tap-highlight-color:transparent; }

        .page { position:fixed; inset:0; width:100%; height:100vh; height:100dvh; overflow:hidden; color:#e8f3ff; background:radial-gradient(ellipse at 12% 10%,rgba(0,75,210,.13),transparent 42%),radial-gradient(ellipse at 92% 88%,rgba(71,42,180,.12),transparent 38%),#03091c; }
        .ambient { position:absolute; width:230px; height:230px; border-radius:50%; filter:blur(85px); opacity:.10; pointer-events:none; animation:ambientMove 9s ease-in-out infinite alternate; }
        .ambientOne { left:-130px; top:12%; background:#0878ff; }
        .ambientTwo { right:-140px; bottom:4%; background:#7749ff; animation-delay:-4s; }

        .app { position:absolute; inset:0; display:flex; flex-direction:column; min-height:0; overflow:hidden; background:linear-gradient(180deg,rgba(3,10,31,.30),rgba(2,8,25,.18)); }

        .header { position:relative; z-index:10; flex:0 0 auto; min-height:76px; display:flex; align-items:center; gap:12px; padding:10px 16px; padding-top:max(10px,env(safe-area-inset-top)); background:rgba(3,10,29,.92); border-bottom:1px solid rgba(71,133,255,.12); }
        .roundButton { width:46px; height:46px; flex:0 0 46px; display:grid; place-items:center; padding:0; border-radius:50%; border:1px solid rgba(85,157,255,.36); color:#eaf6ff; background:linear-gradient(145deg,rgba(15,39,87,.86),rgba(3,15,44,.94)); box-shadow:0 0 9px rgba(22,105,255,.14),inset 0 0 8px rgba(31,106,255,.06); cursor:pointer; transition:border-color .2s,transform .2s; }
        .roundButton svg { width:23px; height:23px; }
        .roundButton:active { transform:scale(.95); }
        .roundButton:hover { border-color:rgba(93,190,255,.70); }

        .upgradeButton { display:flex; align-items:center; justify-content:center; gap:9px; min-height:44px; padding:0 17px; border:1px solid rgba(71,153,255,.40); border-radius:25px; background:linear-gradient(110deg,rgba(8,65,144,.75),rgba(15,35,91,.82)); color:#a9d9ff; font-size:17px; font-weight:750; box-shadow:0 0 10px rgba(0,98,255,.12); cursor:pointer; }
        .diamond { color:#80eaff; font-size:20px; }
        .headerSpacer { flex:1; }

        .menuPanel { position:absolute; z-index:30; top:calc(max(76px, env(safe-area-inset-top) + 65px)); left:13px; width:min(285px,calc(100vw - 26px)); padding:9px; border:1px solid rgba(74,141,255,.45); border-radius:17px; background:rgba(5,16,43,.98); box-shadow:0 10px 35px rgba(0,0,0,.38),0 0 12px rgba(0,102,255,.12); backdrop-filter:blur(18px); }
        .menuPanel button { width:100%; display:flex; align-items:center; gap:10px; padding:12px 10px; border:0; border-radius:10px; background:transparent; color:#dcecff; text-align:left; cursor:pointer; }
        .menuPanel button:hover { background:rgba(41,91,175,.20); }
        .menuPanel button span { color:#8bdfff; font-size:21px; }
        .menuCredit { padding:10px 10px 4px; border-top:1px solid rgba(85,131,215,.16); color:#91a7cc; font-size:11px; }

        .chatArea { flex:1 1 0; min-height:0; width:100%; overflow-y:auto; overflow-x:hidden; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; scrollbar-width:thin; scrollbar-color:rgba(68,126,218,.45) transparent; }

        .homeScreen { width:100%; min-height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px 16px 26px; }
        .heroLogo { width:68px; height:68px; display:grid; place-items:center; border:1px solid rgba(71,154,255,.48); border-radius:21px; background:linear-gradient(145deg,rgba(9,34,81,.92),rgba(5,14,42,.92)); box-shadow:0 0 12px rgba(0,99,255,.16),inset 0 0 10px rgba(0,122,255,.07); }
        .heroLogo svg { width:57px; height:57px; filter:drop-shadow(0 0 4px rgba(41,139,255,.18)); }
        .heroTitle { margin:12px 0 0; color:#e5f5ff; font-family:Georgia,"Times New Roman",serif; font-size:31px; font-weight:850; letter-spacing:2px; text-shadow:0 0 9px rgba(38,143,255,.20); }
        .heroTitle span { color:#82caff; }
        .heroSubtitle { margin:4px 0 0; color:#a4badc; font-family:Georgia,"Times New Roman",serif; font-size:15px; text-align:center; }
        .heroCredit { margin:5px 0 0; color:#809bc4; font-family:Georgia,"Times New Roman",serif; font-size:11px; letter-spacing:.4px; }

        .quickActions { display:flex; gap:10px; width:100%; max-width:490px; margin-top:25px; }
        .quickAction { min-width:0; min-height:57px; flex:1; display:flex; align-items:center; gap:9px; padding:8px 10px; border:1px solid rgba(48,121,255,.43); border-radius:18px; background:linear-gradient(110deg,rgba(7,28,72,.80),rgba(4,17,48,.86)); color:#d8eaff; font-size:13px; font-weight:600; text-align:left; box-shadow:0 0 9px rgba(0,86,255,.08); cursor:pointer; transition:border-color .2s,background .2s; }
        .quickAction:hover { border-color:rgba(91,174,255,.68); background:linear-gradient(110deg,rgba(10,41,97,.90),rgba(5,20,56,.94)); }
        .quickIcon { width:36px; height:36px; flex:0 0 36px; display:grid; place-items:center; border:1px solid rgba(67,160,255,.53); border-radius:50%; color:#94dfff; box-shadow:0 0 7px rgba(0,138,255,.12); }
        .quickIcon svg { width:22px; height:22px; }
        .quickArrow { margin-left:auto; color:#6fa9ed; font-size:18px; }

        .suggestions { width:100%; max-width:490px; margin-top:25px; }
        .suggestionHeading { display:flex; align-items:center; justify-content:center; gap:9px; margin:4px 0 12px; color:#82a9de; font-size:10px; font-weight:750; letter-spacing:1.2px; text-align:center; }
        .headingLine { flex:1; max-width:40px; height:1px; background:rgba(55,132,255,.7); }
        .suggestionGrid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
        .suggestionChip { min-width:0; display:flex; align-items:center; gap:8px; padding:10px 9px; border:1px solid rgba(60,111,200,.36); border-radius:13px; background:linear-gradient(145deg,rgba(8,21,52,.92),rgba(4,15,39,.94)); color:#c7d8f2; font-size:12px; text-align:left; cursor:pointer; transition:background .18s,border-color .18s; }
        .suggestionChip:hover { border-color:rgba(84,160,255,.62); background:rgba(9,31,76,.95); }
        .suggestionIcon { flex:0 0 auto; color:#86caff; font-size:17px; }
        .suggestionArrow { margin-left:auto; color:#6d9bd8; }

        .chat { width:100%; max-width:850px; margin:0 auto; padding:16px 11px 20px; }
        .message { display:flex; align-items:flex-start; gap:8px; width:100%; margin-bottom:14px; animation:messageEnter .20s ease-out both; }
        .assistantMessage { justify-content:flex-start; }
        .userMessage { justify-content:flex-end; }
        .avatar { width:34px; height:34px; flex:0 0 34px; display:grid; place-items:center; border:1px solid rgba(78,151,255,.48); border-radius:12px; background:#091b41; color:#94d9ff; font-size:20px; box-shadow:0 0 8px rgba(0,116,255,.12); }
        .bubble { min-width:0; max-width:min(90%,720px); padding:12px 13px; border-radius:16px; overflow-wrap:anywhere; }
        .assistantBubble { border:1px solid rgba(76,128,213,.28); background:linear-gradient(145deg,rgba(8,22,53,.96),rgba(5,15,39,.97)); box-shadow:0 2px 10px rgba(0,0,0,.10); }
        .userBubble { border:1px solid rgba(69,133,255,.43); background:linear-gradient(135deg,rgba(14,46,105,.92),rgba(10,31,75,.97)); border-bottom-right-radius:7px; }
        .assistantTitle { display:flex; align-items:center; gap:6px; margin-bottom:7px; color:#a4c9f9; font-size:12px; }
        .assistantTitle span { color:#85dfff; text-shadow:0 0 6px rgba(0,157,255,.22); }

        .messageContent { color:#e1eafa; font-size:14px; line-height:1.65; overflow-wrap:anywhere; }
        .messageContent p { margin:0 0 8px; white-space:pre-wrap; }
        .messageContent p:last-child { margin-bottom:0; }
        .messageContent h2,.messageContent h3,.messageContent h4 { margin:0 0 8px; color:#eff7ff; line-height:1.4; }
        .messageContent h2 { font-size:20px; }
        .messageContent h3 { font-size:18px; }
        .messageContent h4 { font-size:16px; }
        .messageContent strong { color:#b8dfff; }
        .spaceLine { height:5px; }
        .textBullet,.numberedLine { display:flex; gap:8px; margin:5px 0; }
        .textBullet span:first-child,.numberedLine span:first-child { flex:0 0 auto; color:#7fcaff; font-weight:700; }

        .codeBlock { max-width:100%; overflow-x:auto; margin:9px 0; padding:12px; border:1px solid rgba(76,128,213,.35); border-radius:12px; background:#020a20; color:#c8e8ff; font-size:12px; line-height:1.55; white-space:pre; }
        .speakButton { width:34px; height:32px; margin-top:9px; display:grid; place-items:center; border:1px solid rgba(71,145,235,.32); border-radius:10px; background:rgba(13,34,77,.85); color:#9acfff; font-size:15px; cursor:pointer; }
        .streamCursor { display:inline-block; width:2px; height:1em; margin-left:2px; vertical-align:-2px; background:#83d8ff; box-shadow:0 0 5px rgba(57,181,255,.35); animation:cursorBlink 1s step-end infinite; }

        /* Teen halki blue glow wale typing dots */
        .typingDots { display:inline-flex; align-items:center; gap:7px; min-height:23px; padding:3px 0; }
        .typingDots i { display:block; width:7px; height:7px; border-radius:50%; background:#76d9ff; box-shadow:0 0 7px rgba(58,190,255,.48); animation:dotPulse 1s ease-in-out infinite; }
        .typingDots i:nth-child(2) { animation-delay:.16s; }
        .typingDots i:nth-child(3) { animation-delay:.32s; }

        .bottomArea { position:relative; z-index:8; flex:0 0 auto; width:100%; padding:9px 10px; padding-bottom:max(9px,env(safe-area-inset-bottom)); border-top:1px solid rgba(65,117,206,.14); background:rgba(3,10,29,.97); }
        .inputBox { display:flex; align-items:flex-end; gap:5px; width:100%; min-height:56px; padding:5px; border:1px solid rgba(60,139,255,.46); border-radius:30px; background:linear-gradient(110deg,rgba(8,25,63,.98),rgba(4,14,37,.99)); box-shadow:0 0 9px rgba(0,95,255,.09),inset 0 0 8px rgba(28,100,255,.03); }
        .inputBox:focus-within { border-color:rgba(84,173,255,.78); box-shadow:0 0 0 1px rgba(44,122,255,.10),0 0 13px rgba(0,100,255,.13); }
        .plusButton,.voiceButton,.sendButton { width:42px; height:42px; flex:0 0 42px; display:grid; place-items:center; border-radius:50%; cursor:pointer; }
        .plusButton { border:1px solid rgba(72,140,255,.35); background:rgba(8,27,67,.90); color:#b7d8ff; }
        .plusButton svg { width:25px; height:25px; }
        .messageInput { flex:1 1 auto; width:0; min-width:0; height:42px; max-height:110px; resize:none; outline:none; border:0; background:transparent; color:#eff6ff; padding:11px 6px; font-size:15px; line-height:1.4; }
        .messageInput::placeholder { color:#8b9fbe; }
        .voiceButton { border:1px solid rgba(70,147,244,.27); background:rgba(8,26,63,.85); color:#b1d8ff; }
        .voiceButton svg { width:23px; height:23px; }
        .voiceButton.active { color:#ff9cbd; border-color:rgba(255,104,150,.52); box-shadow:0 0 10px rgba(255,65,124,.17); }
        .micStop { font-size:15px; }

        .sendButton { border:1px solid rgba(82,157,255,.62); background:linear-gradient(145deg,#1265c9,#183e96); color:#f1f9ff; box-shadow:0 0 9px rgba(0,105,255,.16); }
        .sendButton svg { width:22px; height:22px; }
        .sendButton:disabled { opacity:.38; cursor:default; box-shadow:none; }
        .stopSend { border-color:rgba(255,114,156,.42); background:linear-gradient(145deg,#a93266,#6d214d); }
        .stopSquare { width:12px; height:12px; border-radius:3px; background:#fff; }
        .footerCredit { padding-top:8px; color:#8196b9; text-align:center; font-family:Georgia,"Times New Roman",serif; font-size:10px; letter-spacing:.35px; }
        .footerCredit span { color:#527fbf; }

        .voiceStatus { display:flex; align-items:center; justify-content:center; gap:7px; min-height:34px; margin-bottom:7px; padding:7px 9px; border:1px solid rgba(255,105,155,.23); border-radius:12px; background:rgba(49,15,43,.70); color:#ffc2d6; font-size:12px; }
        .voiceStatusDot { width:7px; height:7px; flex:0 0 7px; border-radius:50%; background:#ff759f; animation:dotPulse .7s infinite alternate; }
        .voiceWaves { display:inline-flex; align-items:center; gap:2px; height:18px; }
        .voiceWaves i { display:block; width:3px; height:6px; border-radius:4px; background:#ff87ae; animation:voiceWave .7s ease-in-out infinite alternate; }
        .voiceWaves i:nth-child(2) { animation-delay:.12s; height:12px; }
        .voiceWaves i:nth-child(3) { animation-delay:.24s; height:17px; }
        .voiceWaves i:nth-child(4) { animation-delay:.36s; height:10px; }
        .voiceWaves i:nth-child(5) { animation-delay:.48s; }
        .voiceStopHint { margin-left:auto; color:#c29aaf; font-size:9px; }

        .notice { display:flex; align-items:center; justify-content:space-between; gap:8px; margin:0 2px 7px; padding:8px 10px; border:1px solid rgba(75,139,235,.28); border-radius:10px; background:rgba(7,24,59,.96); color:#b7d3f5; font-size:11px; }
        .notice button { border:0; background:transparent; color:#9fc5fa; font-size:19px; }

        .modalOverlay { position:absolute; inset:0; z-index:50; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(1,5,19,.76); backdrop-filter:blur(7px); animation:fadeIn .18s ease-out; }
        .comingSoonCard { position:relative; width:100%; max-width:390px; padding:32px 22px 24px; border:1px solid rgba(66,137,255,.60); border-radius:27px; background:linear-gradient(145deg,rgba(8,26,67,.99),rgba(3,12,36,.99)); box-shadow:0 0 18px rgba(0,95,255,.13),0 20px 65px rgba(0,0,0,.36); text-align:center; }
        .modalClose { position:absolute; top:10px; right:13px; width:34px; height:34px; border:1px solid rgba(94,143,217,.28); border-radius:50%; background:rgba(9,26,61,.85); color:#bdd6fa; font-size:25px; line-height:1; cursor:pointer; }
        .comingSoonIcon { position:relative; width:76px; height:76px; display:grid; place-items:center; margin:0 auto 16px; border:1px solid rgba(71,164,255,.57); border-radius:22px; background:rgba(10,36,86,.85); color:#92ddff; font-size:39px; box-shadow:0 0 12px rgba(0,112,255,.15); }
        .comingSoonIcon span { position:absolute; top:-7px; right:-5px; color:#8fe7ff; font-size:19px; }
        .modalEyebrow { color:#82a9de; font-size:9px; font-weight:700; letter-spacing:2px; }
        .comingSoonCard h2 { margin:10px 0; color:#c0e8ff; font-size:29px; font-weight:800; text-shadow:0 0 10px rgba(0,132,255,.22); }
        .comingSoonCard p { max-width:280px; margin:0 auto; color:#b1c5e5; font-size:14px; line-height:1.6; }
        .modalLine { width:65px; height:2px; margin:21px auto 12px; border-radius:3px; background:#438dff; opacity:.75; }
        .modalCredit { color:#819dc8; font-size:10px; }
        .modalDone { min-height:43px; margin-top:23px; padding:0 26px; border:1px solid rgba(76,151,255,.55); border-radius:24px; background:linear-gradient(110deg,#124eaa,#183b85); color:#e6f5ff; box-shadow:0 0 9px rgba(0,105,255,.13); cursor:pointer; }

        @keyframes messageEnter { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ambientMove { from { transform:scale(.92); opacity:.07; } to { transform:scale(1.08); opacity:.13; } }
        @keyframes dotPulse { 0%,80%,100% { opacity:.45; transform:scale(.78); } 40% { opacity:1; transform:scale(1.13); } }
        @keyframes voiceWave { from { transform:scaleY(.45); } to { transform:scaleY(1.15); } }
        @keyframes cursorBlink { 50% { opacity:0; } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }

        @media (max-width:420px) {
          .header { gap:8px; padding-left:12px; padding-right:12px; }
          .roundButton { width:42px; height:42px; flex-basis:42px; }
          .upgradeButton { min-height:41px; padding:0 13px; font-size:15px; }
          .homeScreen { padding-left:12px; padding-right:12px; }
          .heroTitle { font-size:28px; }
          .quickActions { gap:7px; }
          .quickAction { gap:6px; padding:7px; font-size:11px; border-radius:15px; }
          .quickIcon { width:31px; height:31px; flex-basis:31px; }
          .suggestionGrid { gap:6px; }
          .suggestionChip { padding:9px 7px; font-size:11px; }
          .plusButton,.voiceButton,.sendButton { width:39px; height:39px; flex-basis:39px; }
          .messageInput { height:39px; font-size:14px; }
          .voiceStopHint { font-size:8px; }
        }

        @media (max-height:720px) {
          .homeScreen { justify-content:flex-start; padding-top:13px; }
          .heroLogo { width:54px; height:54px; border-radius:17px; }
          .heroLogo svg { width:45px; height:45px; }
          .heroTitle { margin-top:8px; font-size:26px; }
          .quickActions { margin-top:16px; }
          .quickAction { min-height:49px; }
          .suggestions { margin-top:17px; }
        }

        @media (prefers-reduced-motion:reduce) {
          *,*::before,*::after {
            animation-duration:.01ms !important;
            animation-iteration-count:1 !important;
            transition-duration:.01ms !important;
            scroll-behavior:auto !important;
          }
        }
      `}</style>
    </div>
  );
              }
              
