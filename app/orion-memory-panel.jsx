"use client";
import { useState } from "react";
import { MAX_MEMORY_ITEMS, normalizeMemories } from "../lib/orion-memory.mjs";

export default function OrionMemoryPanel({ memories, onChange }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  function addMemory(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onChange(normalizeMemories([...memories, { id: globalThis.crypto?.randomUUID?.() || `memory-${Date.now()}`, text }]));
    setDraft("");
  }
  return (
    <div style={{ position: "relative" }}>
      <button type="button" className="top-button" aria-label="Manage ORION memory" aria-expanded={open} onClick={() => setOpen((value) => !value)} title="Memory">✧</button>
      {open && <section aria-label="ORION saved memory" style={{ position: "absolute", zIndex: 20, top: "46px", right: 0, width: "min(340px, calc(100vw - 28px))", padding: "14px", border: "1px solid rgba(70,50,110,.14)", borderRadius: "16px", background: "#fff", boxShadow: "0 14px 40px rgba(40,30,70,.16)", color: "#292235" }}>
        <strong style={{ display: "block", fontSize: "14px" }}>ORION Memory</strong>
        <p style={{ margin: "6px 0 12px", color: "#746b80", fontSize: "11px", lineHeight: 1.5 }}>Only facts you add here are saved. They stay in this browser on this device and are sent with your chat to personalize replies. Do not save passwords or sensitive information.</p>
        <form onSubmit={addMemory} style={{ display: "flex", gap: "6px" }}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={300} placeholder="Add a preference or useful fact" aria-label="New memory" style={{ flex: 1, minWidth: 0, padding: "9px", border: "1px solid #e5dfed", borderRadius: "9px", fontSize: "12px" }} />
          <button type="submit" disabled={!draft.trim() || memories.length >= MAX_MEMORY_ITEMS} style={{ border: 0, borderRadius: "9px", padding: "0 11px", background: "#7040d2", color: "#fff", fontSize: "12px" }}>Add</button>
        </form>
        <div style={{ marginTop: "10px", maxHeight: "190px", overflowY: "auto" }}>
          {memories.length === 0 ? <p style={{ color: "#8a8195", fontSize: "12px" }}>No saved memories yet.</p> : memories.map((item) => <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "8px 0", borderBottom: "1px solid #f0edf4" }}>
            <span style={{ flex: 1, fontSize: "12px", lineHeight: 1.45 }}>{item.text}</span>
            <button type="button" onClick={() => onChange(memories.filter((entry) => entry.id !== item.id))} aria-label={`Delete memory: ${item.text}`} style={{ border: 0, background: "transparent", color: "#9b5260", fontSize: "11px" }}>Delete</button>
          </div>)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "9px" }}>
          <span style={{ color: "#8a8195", fontSize: "10px" }}>{memories.length}/{MAX_MEMORY_ITEMS} saved</span>
          <button type="button" onClick={() => setOpen(false)} style={{ border: "1px solid #e5dfed", borderRadius: "8px", background: "#fff", padding: "6px 10px", fontSize: "11px" }}>Close</button>
        </div>
      </section>}
    </div>
  );
}
