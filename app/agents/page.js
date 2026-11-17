"use client";

import { useRef, useState } from "react";

const SPECIALISTS = [
  { id: "planner", name: "Planner", detail: "Task breakdown and acceptance checks" },
  { id: "research_analyst", name: "Research", detail: "Evidence and source analysis" },
  { id: "coder", name: "Coder", detail: "Implementation proposals" },
  { id: "security_reviewer", name: "Security", detail: "Trust boundaries and risk review" },
  { id: "verifier", name: "Verifier", detail: "Independent result checking" },
];

export default function AgentControlRoom() {
  const [task, setTask] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const controllerRef = useRef(null);

  async function startTask(event) {
    event.preventDefault();
    const message = task.trim();
    if (!message || status === "running") return;

    const controller = new AbortController();
    controllerRef.current = controller;
    setAnswer("");
    setError("");
    setEvents([{ stage: "started", detail: "Task submitted to ORION Agent", timestamp: Date.now() }]);
    setStatus("running");

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ message, taskMode: "agent", messages: [] }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "ORION could not start this task.");
      }
      if (!response.body) throw new Error("The Agent response stream is unavailable.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullAnswer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith("data:") || line === "data: [DONE]") continue;
          try {
            const data = JSON.parse(line.slice(5).trim());
            if (data?.orion_status && typeof data.orion_status.stage === "string") {
              setEvents((current) => [...current.slice(-39), data.orion_status]);
            }
            const delta = data?.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta) {
              fullAnswer += delta;
              setAnswer(fullAnswer);
            }
          } catch {
            // Ignore malformed or non-content stream frames.
          }
        }
      }
      setStatus("completed");
    } catch (err) {
      if (err?.name === "AbortError") {
        setStatus("cancelled");
      } else {
        setError(err?.message || "The task failed.");
        setStatus("failed");
      }
    } finally {
      controllerRef.current = null;
    }
  }

  function stopTask() {
    controllerRef.current?.abort();
  }

  const running = status === "running";

  return (
    <main style={{ minHeight: "100vh", background: "#f7f8fb", color: "#172033", padding: "24px 16px 48px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <a href="/" style={{ color: "#4255a4", textDecoration: "none", fontWeight: 600 }}>← Back to ORION Chat</a>
        <header style={{ margin: "24px 0" }}>
          <div style={{ color: "#5365c5", fontWeight: 700, letterSpacing: 2, fontSize: 12 }}>DHARM AI · ORION WORKSPACE</div>
          <h1 style={{ fontSize: "clamp(30px, 7vw, 42px)", margin: "8px 0" }}>Agent Control Room</h1>
          <p style={{ color: "#5d6678", lineHeight: 1.6, margin: 0 }}>Give ORION one task. Its main Agent plans, delegates bounded specialist work, and verifies the result.</p>
        </header>

        <section style={{ background: "#fff", border: "1px solid #e1e5ee", borderRadius: 18, padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>Your task</h2>
            <span style={{ fontSize: 12, color: "#647087" }}>₹0-first · bounded execution</span>
          </div>
          <form onSubmit={startTask}>
            <textarea
              value={task}
              onChange={(event) => setTask(event.target.value)}
              placeholder="Example: Audit the ORION Agent for reliability issues and explain the safest next implementation step."
              rows={5}
              maxLength={12000}
              disabled={running}
              style={{ width: "100%", boxSizing: "border-box", marginTop: 14, padding: 14, border: "1px solid #cfd6e3", borderRadius: 12, resize: "vertical", font: "inherit", lineHeight: 1.5, background: running ? "#f2f4f8" : "#fff" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button type="submit" disabled={!task.trim() || running} style={{ border: 0, borderRadius: 10, padding: "12px 18px", background: !task.trim() || running ? "#aeb6cc" : "#4255a4", color: "#fff", fontWeight: 700, fontSize: 15 }}>
                {running ? "ORION is working…" : "Start Agent Task"}
              </button>
              {running && <button type="button" onClick={stopTask} style={{ border: "1px solid #d3d8e2", borderRadius: 10, padding: "11px 16px", background: "#fff", color: "#293247", fontWeight: 600 }}>Stop</button>}
              <span aria-live="polite" style={{ color: status === "failed" ? "#b42318" : "#667085", fontSize: 13 }}>
                {status === "idle" && "Ready"}
                {status === "running" && "Running through the ORION Agent API"}
                {status === "completed" && "Response stream completed"}
                {status === "cancelled" && "Task cancelled"}
                {status === "failed" && "Task failed"}
              </span>
            </div>
          </form>
          {error && <p role="alert" style={{ color: "#b42318", marginBottom: 0 }}>{error}</p>}
        </section>

        <section style={{ background: "#fff", border: "1px solid #e1e5ee", borderRadius: 18, padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>Live task activity</h2>
            <span style={{ color: "#667085", fontSize: 12 }}>{events.length} events · newest last</span>
          </div>
          {events.length ? (
            <ol aria-live="polite" style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gap: 8 }}>
              {events.map((item, index) => (
                <li key={`${item.timestamp || index}-${index}`} style={{ display: "flex", gap: 10, alignItems: "flex-start", borderBottom: "1px solid #edf0f5", padding: "8px 0" }}>
                  <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: item.stage === "complete" ? "#15945b" : item.stage?.includes("error") || item.stage === "partial_recovery" ? "#c47b18" : "#5365c5", marginTop: 6, flex: "0 0 auto" }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#344054" }}>{String(item.stage || "activity").replaceAll("_", " ")}</div>
                    <div style={{ color: "#667085", fontSize: 13, lineHeight: 1.5 }}>{item.detail || "Activity update"}</div>
                  </div>
                </li>
              ))}
            </ol>
          ) : <p style={{ color: "#7a8496", fontSize: 13, margin: "12px 0 0" }}>Start a task to see planning, tools, verification and completion events here.</p>}
        </section>

        <section style={{ background: "#fff", border: "1px solid #e1e5ee", borderRadius: 18, padding: 18, marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, margin: "0 0 14px" }}>ORION specialist roles</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
            {SPECIALISTS.map((agent) => (
              <div key={agent.id} style={{ border: "1px solid #e5e8ef", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700 }}>{agent.name}</div>
                <div style={{ color: "#687386", fontSize: 13, marginTop: 5, lineHeight: 1.45 }}>{agent.detail}</div>
              </div>
            ))}
          </div>
          <p style={{ color: "#667085", fontSize: 12, lineHeight: 1.55, margin: "14px 0 0" }}>
            These are ORION's role-specialized workers using the currently configured model provider. They are not separate Copilot, Codex, or Claude vendor sessions. Provider quotas and free-tier limits may apply.
          </p>
        </section>

        <section style={{ background: "#fff", border: "1px solid #e1e5ee", borderRadius: 18, padding: 18 }}>
          <h2 style={{ fontSize: 18, margin: "0 0 12px" }}>Task output</h2>
          {answer ? (
            <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", font: "inherit", lineHeight: 1.65, margin: 0 }}>{answer}</pre>
          ) : (
            <p style={{ color: "#7a8496", margin: 0 }}>ORION's response and verification summary will appear here.</p>
          )}
        </section>

        <footer style={{ color: "#7a8496", fontSize: 12, marginTop: 18, lineHeight: 1.6 }}>
          Powered by Dharm AI · Repository changes, commits, merges and production deployments remain approval-gated.
        </footer>
      </div>
    </main>
  );
}
