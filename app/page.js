"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const suggestions = [
  { icon: "✧", title: "Email likho", prompt: "Mere liye ek professional email likho." },
  { icon: "◇", title: "Business ideas", prompt: "Mujhe kuch practical business ideas batao." },
  { icon: "✎", title: "Padhai mein help", prompt: "Mujhe kisi topic ko aasan bhasha mein samjhao." },
  { icon: "⌘", title: "Coding help", prompt: "Mujhe coding mein step-by-step help karo." },
  { icon: "◷", title: "Study plan", prompt: "Mere liye ek daily study plan banao." },
  { icon: "✦", title: "Creative ideas", prompt: "Mujhe kuch naye aur creative ideas do." },
];

function renderInline(text) {
  const parts = String(text || "").split(/(\*\*.*?\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
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
  const lines = String(text || "").split("\n");
  let inCode = false;
  let codeLines = [];
  const output = [];

  lines.forEach((line, index) => {
    if (/^\s*```/.test(line)) {
      if (!inCode) {
        inCode = true;
        codeLines = [];
      } else {
        output.push(
          <pre className="codeBlock" key={`code-${index}`}>
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        inCode = false;
      }
      return;
    }
    if (inCode) {
      codeLines.push(line);
      return;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      output.push(<div key={`space-${index}`} className="spaceLine" />);
      return;
    }

    // Markdown headings: ##, ###, #### आदि raw text की तरह नहीं दिखेंगे।
    const heading = trimmed.match(/^(#{1,6})(?:\s+|$)(.*)$/);
    if (heading) {
      const Tag = heading[1].length === 1 ? "h2" : heading[1].length === 2 ? "h3" : "h4";
      output.push(<Tag key={index}>{renderInline(heading[2])}</Tag>);
      return;
    }

    if (/^(---+|___+|\*\*\*+)$/.test(trimmed)) {
      output.push(<hr className="markdownDivider" key={index} />);
      return;
    }

    const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      output.push(
        <div className="textBullet" key={index}>
          <span className="bulletDot">•</span>
          <span>{renderInline(bullet[1])}</span>
        </div>
      );
      return;
    }

    const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (numbered) {
      output.push(
        <div className="numberedLine" key={index}>
          <span className="numberLabel">{trimmed.match(/^\d+[.)]/)[0]}</span>
          <span>{renderInline(numbered[1])}</span>
        </div>
      );
      return;
    }

    output.push(<p key={index}>{renderInline(line)}</p>);
  });

  if (inCode && codeLines.length) {
    output.push(
      <pre className="codeBlock" key="unfinished-code">
        <code>{codeLines.join("\n")}</code>
      </pre>
    );
  }
  return output;
}

function getErrorMessage(data, fallback) {
  return data?.error || data?.reply || fallback || "Kuch technical problem aa gayi. Dobara try karein.";
}

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Namaste 🙏\n\nMain ORION AI hoon — aapka intelligent companion. Aap mujhse kisi bhi topic par sawaal pooch sakte ho.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState("");
  const [reactions, setReactions] = useState({});
  const [feedbackForms, setFeedbackForms] = useState({});
  const [feedbackText, setFeedbackText] = useState({});

  const chatAreaRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const abortControllerRef = useRef(null);
  const recognitionRef = useRef(null);
  const messagesRef = useRef(messages);
  const requestIdRef = useRef(0);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
      abortControllerRef.current?.abort();
      recognitionRef.current?.stop();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setNotice("Jawaab rok di gayi. Aap chahein to dobara pooch sakte hain.");
    }
  }, []);

  async function sendMessage(text) {
    const message = String(text !== undefined ? text : input).trim();
    if (!message || loading) return;

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    shouldAutoScrollRef.current = true;
    setNotice("");
    setInput("");
    setLoading(true);

    const previous = messagesRef.current
      .filter((item, index) => index !== 0 && !item.partial && item.content && (item.role === "user" || item.role === "assistant"))
      .slice(-20)
      .map(({ role, content }) => ({ role, content }));
    const conversation = [...previous, { role: "user", content: message }];

    setMessages((old) => [
      ...old,
      { role: "user", content: message },
      { role: "assistant", content: "", partial: false },
    ]);

    let assistantText = "";
    let gotContent = false;

    const updateAssistant = (content, partial = false) => {
      if (requestId !== requestIdRef.current) return;
      setMessages((old) => {
        const updated = [...old];
        let index = updated.length - 1;
        while (index >= 0 && updated[index].role !== "assistant") index -= 1;
        if (index >= 0) updated[index] = { ...updated[index], content, partial };
        return updated;
      });
    };
            const updated = [...old];
        let index = updated.length - 1;
        while (index >= 0 && updated[index].role !== "assistant") index -= 1;
        if (index >= 0) updated[index] = { ...updated[index], content, partial };
        return updated;
      });
    };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, messages: conversation }),
        signal: controller.signal,
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || contentType.includes("application/json")) {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.error) {
          throw new Error(getErrorMessage(data, `Server error (${response.status})`));
        }
        if (data?.reply) {
          assistantText = String(data.reply);
          gotContent = true;
          updateAssistant(assistantText);
          return;
        }
      }

      if (!response.body) throw new Error("Browser ko streaming response nahi mila.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamFinished = false;

      while (!streamFinished) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || "";

        for (const eventText of events) {
          const dataLines = eventText
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trim());
          if (!dataLines.length) continue;
          const payload = dataLines.join("\n");
          if (payload === "[DONE]") {
            streamFinished = true;
            break;
          }
          try {
            const packet = JSON.parse(payload);
            if (packet?.error) throw new Error(packet.error);
            const piece = packet?.choices?.[0]?.delta?.content;
            if (typeof piece === "string" && piece.length) {
              assistantText += piece;
              gotContent = true;
              updateAssistant(assistantText);
            }
          } catch (parseError) {
            if (parseError instanceof Error && parseError.message && !parseError.message.includes("JSON")) {
              throw parseError;
            }
          }
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) {
        for (const line of buffer.split(/\r?\n/)) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const packet = JSON.parse(payload);
            const piece = packet?.choices?.[0]?.delta?.content;
            if (typeof piece === "string" && piece.length) {
              assistantText += piece;
              gotContent = true;
              updateAssistant(assistantText);
            }
          } catch {}
        }
      }

      if (!gotContent && !controller.signal.aborted) {
        throw new Error("AI se khaali response mila. Kripya dobara try karein.");
      }
      updateAssistant(assistantText, controller.signal.aborted);
    } catch (error) {
      if (error?.name === "AbortError" || controller.signal.aborted) {
        updateAssistant(assistantText, true);
      } else {
        const messageText = `Maaf kijiye 🙏\n\n${error?.message || "Kuch technical problem aa gayi. Dobara try karein."}`;
        updateAssistant(messageText);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        abortControllerRef.current = null;
      }
    }
  }

  function handleChatScroll(event) {
    const el = event.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom <= 80) {
      shouldAutoScrollRef.current = true;
    } else {
      shouldAutoScrollRef.current = false;
    }
  }

  function startVoice() {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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

  async function copyAnswer(text) {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      setNotice("Jawaab copy ho gaya.");
    } catch {
      setNotice("Copy nahi ho paya. Text ko long-press karke copy karein.");
    }
  }

  function saveFeedback(index, message) {
    try {
      const stored = JSON.parse(window.localStorage.getItem("orion-ai-feedback") || "[]");
      stored.push({
        answer: String(message.content || "").slice(0, 8000),
        feedback: String(feedbackText[index] || "").trim(),
        reaction: "down",
        createdAt: new Date().toISOString(),
      });
      window.localStorage.setItem("orion-ai-feedback", JSON.stringify(stored.slice(-100)));
      setFeedbackForms((old) => ({ ...old, [index]: false }));
      setNotice("Feedback is device par save ho gaya. Server par bhejne ke liye database/API alag se connect karna hoga.");
    } catch {
      setNotice("Feedback save nahi ho paya. Browser storage check karein.");
    }
  }

  function speak(text) {
    if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const cleanText = String(text)
      .replace(/^#{1,3}\s/gm, "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .replace(/\n/g, " ");
    const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = /[\u0900-\u097F]/.test(cleanText) ? "hi-IN" : "en-IN";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="page">
      <div className="backgroundGlow glowOne" />
      <div className="backgroundGlow glowTwo" />
      <div className="app">
        <header className="header">
          <div className="brand">
            <div className="logo" aria-hidden="true">
              <svg viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="orionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#70eaff" />
                    <stop offset="50%" stopColor="#9b86ff" />
                    <stop offset="100%" stopColor="#dba2ff" />
                  </linearGradient>
                </defs>
                <ellipse cx="50" cy="50" rx="42" ry="17" fill="none" stroke="url(#orionGradient)" strokeWidth="3" transform="rotate(-35 50 50)" />
                <circle cx="50" cy="50" r="25" fill="#ffffff" stroke="url(#orionGradient)" strokeWidth="2.5" />
                <path d="M50 32 L56 44 L68 50 L56 56 L50 68 L44 56 L32 50 L44 44 Z" fill="url(#orionGradient)" />
              </svg>
            </div>
            <div className="brandInfo">
              <div className="brandName">ORION <span>AI</span></div>
              <div className="brandTagline">Your Intelligent Companion</div>
              <div className="brandCredit">Powered by Dharm AI</div>
              <div className="online"><span /> Online</div>
            </div>
          </div>
          <div className="headerStatus"><span className="statusDot" /> Ready to help</div>
        </header>

        <main ref={chatAreaRef} className="chatArea" onScroll={handleChatScroll}>
          <div className="chat">
            {messages.map((message, index) => (
              <div key={`${index}-${message.role}`} className={`message ${message.role === "user" ? "userMessage" : "assistantMessage"}`}>
                {message.role === "assistant" && (
                  <div className="avatar" aria-hidden="true">
                    <svg viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id={`avatarGradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#70eaff" />
                          <stop offset="55%" stopColor="#9f8aff" />
                          <stop offset="100%" stopColor="#e4a5ff" />
                        </linearGradient>
                      </defs>
                      <path d="M50 17 L62 39 L83 50 L62 61 L50 83 L38 61 L17 50 L38 39 Z" fill={`url(#avatarGradient-${index})`} />
                    </svg>
                  </div>
                )}
                <div className={`bubble ${message.role === "user" ? "userBubble" : index === 0 ? "assistantBubble welcomeBubble" : "assistantBubble"}`}>
                  {message.role === "assistant" && <div className="assistantTitle"><span>✦</span><b>ORION AI</b>{message.partial && <small>Stopped</small>}</div>}
                  <div className="messageContent">
                    {formatText(message.content)}
                    {loading && index === messages.length - 1 && message.role === "assistant" && <span className="streamCursor" aria-label="Jawaab aa raha hai" />}
                  </div>
                  {message.role === "assistant" && message.content && index !== 0 && (
                    <div className="messageActions">
                      <button className="actionButton" onClick={() => copyAnswer(message.content)} aria-label="Jawab copy karein" title="Copy">▢</button>
                      <button className="actionButton speakButton" onClick={() => speak(message.content)} aria-label="Jawab sunen" title="Jawab sunen">🔊</button>
                      <button className={`actionButton ${reactions[index] === "up" ? "selected" : ""}`} onClick={() => { setReactions((old) => ({ ...old, [index]: old[index] === "up" ? "" : "up" })); setFeedbackForms((old) => ({ ...old, [index]: false })); }} aria-label="Achha jawab" title="Achha jawab">👍</button>
                      <button className={`actionButton ${reactions[index] === "down" ? "selected" : ""}`} onClick={() => { setReactions((old) => ({ ...old, [index]: old[index] === "down" ? "" : "down" })); setFeedbackForms((old) => ({ ...old, [index]: !old[index] })); }} aria-label="Jawab pasand nahi aaya" title="Jawab pasand nahi aaya">👎</button>
                    </div>
                  )}
                  {message.role === "assistant" && feedbackForms[index] && (
                    <div className="feedbackPanel">
                      <div className="feedbackTitle">Is jawab mein kya sudhaar chahiye?</div>
                      <textarea value={feedbackText[index] || ""} onChange={(event) => setFeedbackText((old) => ({ ...old, [index]: event.target.value }))} placeholder="Jaise: jawab galat tha, adhoora tha..." rows={2} />
                      <div className="feedbackButtons">
                        <button onClick={() => setFeedbackForms((old) => ({ ...old, [index]: false }))}>Cancel</button>
                        <button onClick={() => saveFeedback(index, message)}>Feedback bhejein</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {messages.length === 1 && !loading && (
              <div className="suggestions">
                <div className="suggestionHeading"><span className="headingLine" /><span>AAP KYA JAANNA CHAHTE HAIN?</span><span className="headingLine" /></div>
                <div className="suggestionGrid">
                  {suggestions.map((item) => <button key={item.title} className="suggestionChip" onClick={() => sendMessage(item.prompt)}><span className="suggestionIcon">{item.icon}</span><span className="suggestionText">{item.title}</span><span className="suggestionArrow">↗</span></button>)}
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="bottomArea">
          {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Notice band karein">×</button></div>}
          <div className="inputBox">
            <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (loading) return; sendMessage(); } }} placeholder="ORION AI se kuch poochiye..." rows={1} aria-label="Apna message likhein" />
            <button className={listening ? "voiceButton active" : "voiceButton"} onClick={startVoice} aria-label="Voice input" title="Voice input">🎙️</button>
            {loading ? <button className="stopButton" onClick={stopGeneration} aria-label="Jawaab rokein" title="Jawaab rokein"><span /></button> : <button className="sendButton" onClick={() => sendMessage()} disabled={!input.trim()} aria-label="Message bhejein" title="Send">➤</button>}
          </div>
          <div className="footerCredit">ORION AI · Powered by Dharm AI</div>
        </footer>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; }
        html, body { width: 100%; height: 100%; margin: 0; padding: 0; }
        body { overflow: hidden; background: #fbfaff; color: #29243a; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        button, textarea { font: inherit; }
        button { -webkit-tap-highlight-color: transparent; }
        .page { position: fixed; inset: 0; width: 100%; height: 100vh; height: 100dvh; overflow: hidden; color: #29243a; background: radial-gradient(circle at 8% 0%, rgba(187, 171, 255, .20), transparent 34%), #fbfaff; }
        .backgroundGlow { position: absolute; width: 210px; height: 210px; border-radius: 50%; pointer-events: none; filter: blur(90px); opacity: .22; animation: orionGlow 8s ease-in-out infinite alternate; }
        .glowOne { left: -120px; top: -120px; background: #9b83ff; }
        .glowTwo { right: -125px; bottom: -120px; background: #bca5ff; animation-delay: 3s; }
        .app { position: absolute; inset: 0; display: flex; flex-direction: column; min-height: 0; overflow: hidden; background: rgba(255,255,255,.62); }
        .header { position: relative; z-index: 5; flex: 0 0 auto; min-height: 86px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 16px; border-bottom: 1px solid #e8e1ff; background: rgba(255,255,255,.96); box-shadow: 0 4px 20px rgba(111, 82, 188, .06); }
        .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .logo { width: 48px; height: 48px; flex: 0 0 48px; display: grid; place-items: center; border: 1px solid #d9caff; border-radius: 16px; background: linear-gradient(145deg,#fff,#f5f0ff); box-shadow: 0 0 18px rgba(146, 117, 245, .20); }
        .logo svg { width: 39px; height: 39px; }
        .brandInfo { min-width: 0; }
        .brandName { color: #30264c; font-family: Georgia, "Times New Roman", serif; font-size: 21px; font-weight: 900; letter-spacing: 1.25px; line-height: 1.15; }
        .brandName span { color: #8c6ae5; text-shadow: 0 0 9px rgba(157, 125, 255, .25); }
        .brandTagline { margin-top: 3px; color: #625d70; font-family: Georgia, "Times New Roman", serif; font-size: 12px; }
        .brandCredit { margin-top: 2px; color: #9587b7; font-family: Georgia, "Times New Roman", serif; font-size: 10px; }
        .online { display: flex; align-items: center; gap: 6px; margin-top: 3px; color: #777182; font-family: Georgia, "Times New Roman", serif; font-size: 12px; }
        .online span, .statusDot { width: 7px; height: 7px; border-radius: 50%; background: #2bb981; box-shadow: 0 0 8px rgba(43,185,129,.25); }
        .headerStatus { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; color: #8d82ad; font-size: 10px; }
        .chatArea { flex: 1 1 0; min-height: 0; width: 100%; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #d5c9f8 transparent; }
        .chatArea::-webkit-scrollbar { width: 4px; }
        .chatArea::-webkit-scrollbar-thumb { background: #d5c9f8; border-radius: 8px; }
        .chat { width: 100%; max-width: 900px; margin: 0 auto; padding: 16px 13px 24px; }
        .message { display: flex; align-items: flex-start; gap: 8px; width: 100%; margin-bottom: 13px; animation: messageEnter .18s ease-out both; }
        .assistantMessage { justify-content: flex-start; }
        .userMessage { justify-content: flex-end; }
        .avatar { width: 36px; height: 36px; flex: 0 0 36px; display: grid; place-items: center; border: 1px solid #dfd4ff; border-radius: 13px; background: linear-gradient(145deg,#fff,#f7f1ff); box-shadow: 0 3px 12px rgba(137, 111, 221, .10); }
        .avatar svg { width: 26px; height: 26px; }
        .bubble { min-width: 0; max-width: min(91%, 760px); padding: 13px 15px; border-radius: 21px; overflow-wrap: anywhere; }
        .assistantBubble { border: 1px solid #e0d7fb; background: linear-gradient(145deg, rgba(255,255,255,.98), rgba(250,247,255,.98)); box-shadow: 0 5px 18px rgba(111, 82, 188, .07); }
        .userBubble { border: 1px solid #d3c1ff; background: linear-gradient(135deg,#f2ecff,#ebe2ff); color: #34284f; border-bottom-right-radius: 8px; }
        .welcomeBubble { padding: 10px 13px; border-radius: 17px; background: linear-gradient(145deg,#fff,#fcfaff); }
        .assistantTitle { display: flex; align-items: center; gap: 7px; margin-bottom: 9px; color: #7760b9; font-size: 13px; }
        .assistantTitle span { color: #9d83f4; font-size: 16px; text-shadow: 0 0 8px rgba(170,143,255,.28); }
        .assistantTitle small { margin-left: auto; color: #8c7caa; font-size: 10px; font-weight: 500; }
        .welcomeBubble .assistantTitle { margin-bottom: 4px; font-size: 11px; }
        .messageContent { color: #302d40; font-size: 15px; line-height: 1.7; overflow-wrap: anywhere; }
        .welcomeBubble .messageContent { font-size: 14px; line-height: 1.55; }
        .messageContent strong { color: #4d3d83; font-weight: 750; }
        .messageContent em { font-style: italic; }
        .messageContent p { margin: 0 0 10px; white-space: pre-wrap; }
        .messageContent p:last-child { margin-bottom: 0; }
        .messageContent h2, .messageContent h3, .messageContent h4 { margin: 0 0 9px; color: #57458e; line-height: 1.4; }
        .messageContent h2 { font-size: 21px; }
        .messageContent h3 { font-size: 18px; }
        .messageContent h4 { font-size: 16px; }
        .spaceLine { height: 7px; }
        .textBullet, .numberedLine { display: flex; align-items: flex-start; gap: 8px; margin: 5px 0; }
        .bulletDot, .numberLabel { flex: 0 0 auto; color: #8b70df; font-weight: 700; }
        .codeBlock { max-width: 100%; overflow-x: auto; margin: 9px 0; padding: 12px; border: 1px solid #e3dcf7; border-radius: 12px; background: #f3f0fa; color: #342c49; font-size: 12px; line-height: 1.55; white-space: pre; }
        .messageActions { display: flex; align-items: center; gap: 5px; margin-top: 10px; }
        .actionButton { min-width: 31px; height: 31px; padding: 0 7px; border: 1px solid transparent; border-radius: 9px; background: transparent; color: #81769e; font-size: 14px; cursor: pointer; transition: background .15s ease, border-color .15s ease; }
        .actionButton:hover, .actionButton.selected { border-color: #e0d6fa; background: #f1ebff; color: #7258bf; }
        .speakButton { border-color: #e1d8fa; background: #f8f4ff; }
        .feedbackPanel { margin-top: 9px; padding: 10px; border: 1px solid #e4dafb; border-radius: 12px; background: #fbf9ff; }
        .feedbackTitle { margin-bottom: 7px; color: #5f4e8f; font-size: 12px; font-weight: 700; }
        .feedbackPanel textarea { display: block; width: 100%; min-height: 54px; resize: vertical; padding: 8px; border: 1px solid #ddd2f6; border-radius: 8px; outline: none; background: white; color: #302d40; font: inherit; font-size: 12px; }
        .feedbackButtons { display: flex; justify-content: flex-end; gap: 7px; margin-top: 8px; }
        .feedbackButtons button { padding: 6px 9px; border: 1px solid #ded3f8; border-radius: 8px; background: #fff; color: #66558f; font-size: 11px; cursor: pointer; }
        .feedbackButtons button:last-child { border-color: #bca8f1; background: #eee7ff; color: #57408e; font-weight: 700; }
        .markdownDivider { height: 1px; margin: 12px 0; border: 0; background: #e6def7; }
        .streamCursor { display: inline-block; width: 2px; height: 1em; margin-left: 2px; vertical-align: -2px; background: #987ce9; animation: cursorBlink 1s step-end infinite; }
        .suggestions { margin: 4px 0 18px 44px; max-width: 680px; animation: messageEnter .25s ease-out both; }
        .suggestionHeading { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 4px 0 11px; color: #8b80a7; font-size: 9px; font-weight: 750; letter-spacing: 1px; text-align: center; }
        .headingLine { width: 20px; height: 1px; background: #ddd2fa; }
        .suggestionGrid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; }
        .suggestionChip { min-width: 0; display: flex; align-items: center; gap: 8px; padding: 10px 10px; border: 1px solid #e4dbfb; border-radius: 13px; background: linear-gradient(145deg,#fff,#faf7ff); color: #5a4e7c; font-size: 12px; text-align: left; cursor: pointer; transition: background .18s ease,border-color .18s ease,transform .18s ease; }
        .suggestionIcon { flex: 0 0 25px; width: 25px; height: 25px; display: grid; place-items: center; border: 1px solid #e3d8ff; border-radius: 8px; background: #f4efff; color: #8d73db; font-size: 15px; }
        .suggestionText { flex: 1; min-width: 0; line-height: 1.35; }
        .suggestionArrow { color: #a08ed4; font-size: 13px; }
        .suggestionChip:active { background: #f0eaff; border-color: #c9b5ff; transform: scale(.99); }
        .bottomArea { position: relative; z-index: 5; flex: 0 0 auto; width: 100%; padding: 9px 12px; padding-bottom: max(8px,env(safe-area-inset-bottom)); border-top: 1px solid #eee8fc; background: rgba(255,255,255,.97); box-shadow: 0 -5px 22px rgba(111,82,188,.04); }
        .inputBox { display: flex; align-items: flex-end; gap: 7px; width: 100%; min-height: 56px; padding: 5px; border: 1px solid #d8cafa; border-radius: 19px; background: #fff; box-shadow: 0 3px 12px rgba(126,98,200,.08); transition: border-color .2s,box-shadow .2s; }
        .inputBox:focus-within { border-color: #bba6f4; box-shadow: 0 0 0 3px rgba(177,153,245,.10); }
        .inputBox textarea { flex: 1 1 auto; width: 0; min-width: 0; min-height: 42px; max-height: 110px; resize: none; outline: none; border: 0; background: transparent; color: #302d40; padding: 10px 8px; font-size: 14px; line-height: 1.45; }
        .inputBox textarea::placeholder { color: #9a94a8; }
        .voiceButton, .sendButton, .stopButton { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; border: 0; border-radius: 14px; cursor: pointer; transition: transform .18s ease,background .18s ease; }
        .voiceButton { background: #f4efff; color: #7c67c5; font-size: 17px; }
        .voiceButton.active { background: #fce8f3; color: #bf458d; box-shadow: 0 0 0 3px rgba(226,125,180,.12); }
        .sendButton { background: linear-gradient(135deg,#c9b6ff,#a990f0); color: #fff; font-size: 22px; box-shadow: 0 3px 8px rgba(148,120,222,.18); }
        .sendButton:disabled { opacity: .42; cursor: default; }
        .stopButton { background: #f5efff; border: 1px solid #d9cbfa; }
        .stopButton span { width: 13px; height: 13px; border-radius: 3px; background: #8d6bdb; }
        .sendButton:not(:disabled):active, .voiceButton:active, .stopButton:active { transform: scale(.94); }
        .footerCredit { padding-top: 7px; color: #9185ae; text-align: center; font-family: Georgia,"Times New Roman",serif; font-size: 10px; letter-spacing: .25px; }
        .notice { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 0 2px 7px; padding: 7px 10px; border: 1px solid #e5dcfa; border-radius: 10px; background: #faf7ff; color: #71638e; font-size: 11px; }
        .notice button { border: 0; background: transparent; color: #8171a3; font-size: 18px; }
        @keyframes messageEnter { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes orionGlow { from { opacity: .14; } to { opacity: .24; } }
        @keyframes cursorBlink { 50% { opacity: 0; } }
        @media (max-width: 420px) { .header { min-height: 82px; padding: 8px 12px; } .headerStatus { display: none; } .brandName { font-size: 20px; } .brandTagline { font-size: 11px; } .brandCredit { font-size: 9px; } .logo { width: 44px; height: 44px; flex-basis: 44px; } .logo svg { width: 36px; height: 36px; } .chat { padding: 12px 9px 20px; } .avatar { width: 32px; height: 32px; flex-basis: 32px; } .avatar svg { width: 23px; height: 23px; } .bubble { max-width: 92%; padding: 11px 12px; } .messageContent { font-size: 14px; line-height: 1.65; } .suggestions { margin-left: 39px; } .suggestionGrid { gap: 6px; } .suggestionChip { padding: 8px 7px; font-size: 11px; } .bottomArea { padding-left: 9px; padding-right: 9px; } }
        @media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: .01ms !important; } }
      `}</style>
    </div>
  );
    }
