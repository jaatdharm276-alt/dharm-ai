"use client";

import { useEffect, useRef, useState } from "react";

const css = `
*{box-sizing:border-box}
html,body{margin:0;padding:0;width:100%;height:100%}
body{background:#02040b;color:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;overflow:hidden}
button,input{font:inherit}

.page{
position:fixed;
inset:0;
width:100%;
height:100dvh;
overflow:hidden;
background:
radial-gradient(circle at 15% 10%,rgba(40,70,180,.2),transparent 35%),
radial-gradient(circle at 90% 70%,rgba(100,30,180,.15),transparent 35%),
#02040b
}

.app{
width:100%;
height:100%;
display:flex;
flex-direction:column;
overflow:hidden;
background:linear-gradient(180deg,#070c1d,#02050d)
}

.header{
flex-shrink:0;
display:flex;
align-items:center;
justify-content:space-between;
padding:max(16px,env(safe-area-inset-top)) 18px 14px;
border-bottom:1px solid rgba(150,160,200,.14);
background:rgba(5,9,22,.9)
}

.brand{display:flex;align-items:center}
.logo{
width:58px;height:58px;
display:grid;place-items:center;
border-radius:18px;
border:1px solid rgba(150,160,205,.25);
background:#171b30;
font-size:30px
}

.brandText{margin-left:13px}
.title{font-size:27px;font-weight:800}
.status{
display:flex;align-items:center;gap:7px;
margin-top:5px;color:#9298a9;font-size:16px
}
.dot{
width:10px;height:10px;border-radius:50%;
background:#55e39d;
box-shadow:0 0 12px #55e39d
}

.magic{
width:50px;height:50px;
border-radius:50%;
border:1px solid rgba(150,160,205,.2);
background:#181d31;
color:#aeb9ff;
font-size:25px
}

.chat{
flex:1;
min-height:0;
overflow-y:auto;
padding:26px 20px 20px
}

.row{display:flex;margin-bottom:18px}
.userRow{justify-content:flex-end}

.bubble{
max-width:700px;
padding:23px 25px;
border-radius:28px;
overflow-wrap:anywhere
}

.ai{
border:1px solid rgba(140,150,190,.18);
background:linear-gradient(145deg,rgba(31,39,62,.82),rgba(15,18,31,.8));
box-shadow:0 20px 50px rgba(0,0,0,.18)
}

.user{
max-width:82%;
background:linear-gradient(145deg,rgba(48,58,135,.85),rgba(38,42,94,.8));
border:1px solid rgba(90,105,220,.35)
}

.aiName{
display:flex;
align-items:center;
gap:10px;
margin-bottom:17px;
color:#a6aabd;
font-size:18px;
font-weight:700
}

.mini{
width:40px;height:40px;
display:grid;place-items:center;
border-radius:13px;
background:#303553
}
.text{
font-size:18px;
line-height:1.55;
white-space:pre-wrap
}

.user .text{font-size:18px}

.listen{
margin-top:18px;
padding:10px 16px;
border:1px solid rgba(150,160,190,.2);
border-radius:16px;
background:#262a39;
color:#b9becb
}

.inputArea{
flex-shrink:0;
padding:8px 12px max(12px,env(safe-area-inset-bottom));
background:linear-gradient(180deg,transparent,#02050d 30%)
}

.inputBox{
height:66px;
display:flex;
align-items:center;
gap:10px;
padding:7px 8px 7px 18px;
border:1px solid rgba(125,140,180,.23);
border-radius:24px;
background:#0c1020;
box-shadow:0 12px 35px rgba(0,0,0,.3)
}

.inputBox input{
flex:1;
min-width:0;
height:50px;
border:0;
outline:0;
background:transparent;
color:#fff;
font-size:20px
}

.inputBox input::placeholder{color:#74798a}

.send{
width:52px;height:52px;
border:0;
border-radius:18px;
background:linear-gradient(145deg,#303d91,#4430a0);
color:#aeb8ed;
font-size:25px
}

.send:disabled{opacity:.45}

.dots{display:flex;gap:7px;padding:5px}
.dots span{
width:8px;height:8px;border-radius:50%;
background:#9ca7dc;
animation:blink 1s infinite
}
.dots span:nth-child(2){animation-delay:.15s}
.dots span:nth-child(3){animation-delay:.3s}

@keyframes blink{
0%,100%{opacity:.3;transform:translateY(0)}
50%{opacity:1;transform:translateY(-5px)}
}

.quick{
display:flex;
flex-wrap:wrap;
gap:9px;
margin-top:4px
}

.quick button{
padding:10px 14px;
border-radius:15px;
border:1px solid rgba(130,145,200,.2);
background:#151a2d;
color:#aeb6d5
}

@media(max-width:520px){
.chat{padding:23px 18px 18px}
.bubble{padding:21px 23px}
.text{font-size:21px}
}
`;

function MessageText({ text }) {
  return (
    <div className="text">
      {String(text)
        .split("\n")
        .map((line, i) => (
          <div key={i}>{line || "\u00A0"}</div>
        ))}
    </div>
  );
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
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function speak(text) {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(
      String(text).replace(/[#*_`]/g, "")
    );

    u.lang = "hi-IN";
    u.rate = 0.95;

    window.speechSynthesis.speak(u);
  }

  async function sendMessage(value) {
    const message = String(value ?? input).trim();

    if (!message || loading) return;

    setInput("");

    setMessages((old) => [
      ...old,
      { role: "user", content: message },
    ]);

    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Response nahi mila");
      }

      const reply =
        data?.reply || "Mujhe abhi response nahi mila.";

      setLoading(false);

      setMessages((old) => [
        ...old,
        { role: "assistant", content: "" },
      ]);

      let text = "";

      for (const char of reply) {
        text += char;

        setMessages((old) => {
          const copy = [...old];

          copy[copy.length - 1] = {
            role: "assistant",
            content: text,
          };

          return copy;
        });

        await new Promise((r) => setTimeout(r, 9));
      }
    } catch (error) {
      console.error(error);

      setLoading(false);

      setMessages((old) => [
        ...old,
        {
          role: "assistant",
          content:
            "⚠️ Abhi response nahi aa raha. Thodi der baad dobara try karo.",
        },
      ]);
    }
  }

  function quick(text) {
    setInput(text);
    sendMessage(text);
  }

  return (
    <>
      <style>{css}</style>

      <main className="page">
        <section className="app">

          <header className="header">
            <div className="brand">
              <div className="logo">🌸</div>

              <div className="brandText">
                <div className="title">
                  Dharm AI ✨
                </div>

                <div className="status">
                  <span className="dot"></span>
                  Online
                </div>
              </div>
            </div>

            <button
              className="magic"
              onClick={() =>
                quick("Aaj ka ek chhota sa dharmik vichar batao.")
              }
            >
              ✦
            </button>
          </header>

          <div className="chat">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={
                  msg.role === "user"
                    ? "row userRow"
                    : "row"
                }
              >
                <div
                  className={
                    msg.role === "user"
                      ? "bubble user"
                      : "bubble ai"
                  }
                >
                  {msg.role === "assistant" && (
                    <div className="aiName">
                      <div className="mini">🌸</div>
                      Dharm AI
                    </div>
                  )}

                  <MessageText text={msg.content} />

                  {msg.role === "assistant" &&
                    msg.content && (
                      <button
                        className="listen"
                        onClick={() => speak(msg.content)}
                      >
                        🔊 सुनें
                      </button>
                    )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="row">
                <div className="bubble ai">
                  <div className="aiName">
                    <div className="mini">🌸</div>
                    Dharm AI
                  </div>

                  <div className="dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            {!loading && messages.length === 1 && (
              <div className="quick">
                <button
                  onClick={() =>
                    quick("Bhagavad Gita ka ek shlok batao aur uska arth samjhao.")
                  }
                >
                  📖 Gita ka shlok
                </button>

                <button
                  onClick={() =>
                    quick("Aaj ka dharmik vichar batao.")
                  }
                >
                  ✨ Aaj ka vichar
                </button>

                <button
                  onClick={() =>
                    quick("Hindu dharm ke baare me ek rochak baat batao.")
                  }
                >
                  🕉️ Dharm gyaan
                </button>
              </div>
            )}

            <div ref={endRef}></div>
          </div>

          <div className="inputArea">
            <div className="inputBox">
              <span>✨</span>

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask Dharm AI..."
                disabled={loading}
              />

              <button
                className="send"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
              >
                ➤
              </button>
            </div>
          </div>

        </section>
      </main>
    </>
  );
    }
