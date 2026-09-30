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
      {
        role: "user",
        content: text,
      },
    ];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch (error) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Error: " + error.message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: "700px",
        margin: "0 auto",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>Dharm AI 🤖</h1>

      <div
        style={{
          minHeight: "400px",
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "15px",
          marginBottom: "15px",
        }}
      >
        {messages.length === 0 && (
          <p>Namaste! Mujhse kuch bhi poochho 👋</p>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: "15px",
              padding: "10px",
              background:
                msg.role === "user" ? "#e8f0fe" : "#f3f3f3",
              borderRadius: "10px",
            }}
          >
            <strong>
              {msg.role === "user" ? "You" : "Dharm AI"}:
            </strong>

            <div style={{ marginTop: "5px" }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && <p>Dharm AI is thinking... 🤔</p>}
      </div>

      <form onSubmit={sendMessage}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          rows={4}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "16px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            boxSizing: "border-box",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: "10px",
            padding: "12px 20px",
            fontSize: "16px",
            borderRadius: "8px",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Thinking..." : "Send"}
        </button>
      </form>
    </main>
  );
          }
