"use client";

import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(e) {
    e.preventDefault();

    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [
      ...messages,
      { role: "user", content: text }
    ];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: newMessages
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: data.text
        }
      ]);
    } catch (error) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Error: " + error.message
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#ffffff",
      color: "#171717",
      fontFamily: "Arial, sans-serif"
    }}>
      <header style={{
        height: "60px",
        borderBottom: "1px solid #e5e5e5",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px"
      }}>
        <strong style={{ fontSize: "20px" }}>
          Dharm AI
        </strong>

        <span style={{
          fontSize: "12px",
          color: "#666",
          border: "1px solid #ddd",
          padding: "6px 10px",
          borderRadius: "20px"
        }}>
          AI Assistant
        </span>
      </header>

      <section style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "40px 18px 130px"
      }}>

        {messages.length === 0 ? (
          <div style={{
            textAlign: "center",
            marginTop: "15vh"
          }}>
            <h1 style={{ fontSize: "36px" }}>
              How can I help you?
            </h1>

            <p style={{ color: "#777" }}>
              Welcome to Dharm AI
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginTop: "30px"
            }}>
              {[
                "Explain something simply",
                "Write an email",
                "Give me business ideas",
                "Help me learn coding"
              ].map((item) => (
                <button
                  key={item}
                  onClick={() => setInput(item)}
                  style={{
                    padding: "15px",
                    border: "1px solid #ddd",
                    borderRadius: "12px",
                    background: "white",
                    textAlign: "left",
                    cursor: "pointer"
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent:
                  message.role === "user"
                    ? "flex-end"
                    : "flex-start",
                marginBottom: "20px"
              }}
            >
              <div style={{
                maxWidth: "80%",
                padding: "12px 16px",
                borderRadius: "16px",
                background:
                  message.role === "user"
                    ? "#171717"
                    : "#f2f2f2",
                color:
                  message.role === "user"
                    ? "white"
                    : "#171717",
                whiteSpace: "pre-wrap",
                lineHeight: "1.5"
              }}>
                {message.content}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div style={{
            color: "#777",
            marginBottom: "20px"
          }}>
            Dharm AI is thinking...
          </div>
        )}
      </section>

      <form
        onSubmit={sendMessage}
        style={{
          position: "fixed",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(800px, calc(100% - 30px))",
          display: "flex",
          gap: "8px",
          padding: "8px",
          border: "1px solid #ddd",
          borderRadius: "16px",
          background: "white",
          boxShadow: "0 5px 25px rgba(0,0,0,0.08)"
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message Dharm AI..."
          disabled={loading}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            padding: "12px",
            fontSize: "16px"
          }}
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            border: "none",
            borderRadius: "10px",
            padding: "0 18px",
            background: "#171717",
            color: "white"
          }}
        >
          Send
        </button>
      </form>
    </main>
  );
          }
