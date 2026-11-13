"use client";
import { useState } from "react";
import { MAX_MEMORY_ITEMS, createMemoryBackup, normalizeMemories, parseMemoryBackup } from "../lib/orion-memory.mjs";

export default function OrionMemoryPanel({ memories, onChange }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  function addMemory(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onChange(normalizeMemories([...memories, { id: globalThis.crypto?.randomUUID?.() || `memory-${Date.now()}`, text }]));
    setDraft("");
    setNotice("Memory saved on this device.");
  }

  function togglePinned(item) {
    onChange(normalizeMemories(memories.map((entry) => entry.id === item.id ? { ...entry, pinned: !entry.pinned } : entry)));
    setNotice(item.pinned ? "Memory unpinned." : "Memory pinned — it can be used across topics.");
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(createMemoryBackup(memories), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "orion-memory-backup.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Backup exported. Keep the file somewhere safe.");
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 16 * 1024) throw new Error("Backup file is too large.");
      const imported = parseMemoryBackup(await file.text());
      const before = normalizeMemories(memories);
      const combined = normalizeMemories([...before, ...imported]);
      onChange(combined);
      setNotice("Backup restored. " + Math.max(0, combined.length - before.length) + " new item(s) added.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not import this backup.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button type="button" className="top-button" aria-label="Manage ORION memory" aria-expanded={open} onClick={() => setOpen((value) => !value)} title="Memory">✧</button>
      {open && <section aria-label="ORION saved memory" style={{ position: "absolute", zIndex: 20, top: "46px", right: 0, width: "min(340px, calc(100vw - 28px))", padding: "14px", border: "1px solid rgba(70,50,110,.14)", borderRadius: "16px", background: "#fff", boxShadow: "0 14px 40px rgba(40,30,70,.16)", color: "#292235" }}>
        <strong style={{ display: "block", fontSize: "14px" }}>ORION Memory</strong>
        <p style={{ margin: "6px 0 12px", color: "#746b80", fontSize: "11px", lineHeight: 1.5 }}>Only facts you add here are saved. They stay in this browser on this device. Pin important preferences to make them available across topics. Do not save passwords or sensitive information.</p>
        <form onSubmit={addMemory} style={{ display: "flex", gap: "6px" }}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={300} placeholder="Add a preference or useful fact" aria-label="New memory" style={{ flex: 1, minWidth: 0, padding: "9px", border: "1px solid #e5dfed", borderRadius: "9px", fontSize: "12px" }} />
          <button type="submit" disabled={!draft.trim() || memories.length >= MAX_MEMORY_ITEMS} style={{ border: 0, borderRadius: "9px", padding: "0 11px", background: "#7040d2", color: "#fff", fontSize: "12px" }}>Add</button>
        </form>
        <div style={{ display: "flex", gap: "7px", marginTop: "9px" }}>
          <button type="button" onClick={exportBackup} disabled={memories.length === 0} style={{ flex: 1, border: "1px solid #e5dfed", borderRadius: "8px", background: "#fff", padding: "7px", fontSize: "11px" }}>Export backup</button>
          <label style={{ flex: 1, border: "1px solid #e5dfed", borderRadius: "8px", background: "#fff", padding: "7px", fontSize: "11px", textAlign: "center", cursor: "pointer" }}>Import backup<input type="file" accept="application/json,.json" onChange={importBackup} style={{ display: "none" }} /></label>
        </div>
        {notice && <p role="status" style={{ margin: "8px 0 0", color: "#66528a", fontSize: "10px", lineHeight: 1.4 }}>{notice}</p>}
        <div style={{ marginTop: "10px", maxHeight: "190px", overflowY: "auto" }}>
          {memories.length === 0 ? <p style={{ color: "#8a8195", fontSize: "12px" }}>No saved memories yet.</p> : memories.map((item) => <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "8px 0", borderBottom: "1px solid #f0edf4" }}>
            <span style={{ flex: 1, fontSize: "12px", lineHeight: 1.45 }}>{item.text}{item.pinned ? <strong style={{ color: "#7040d2" }}> · Pinned</strong> : null}</span>
            <button type="button" onClick={() => togglePinned(item)} aria-label={item.pinned ? "Unpin memory" : "Pin memory"} style={{ border: 0, background: "transparent", color: "#7040d2", fontSize: "11px" }}>{item.pinned ? "Unpin" : "Pin"}</button>
            <button type="button" onClick={() => onChange(memories.filter((entry) => entry.id !== item.id))} aria-label={`Delete memory: ${item.text}`} style={{ border: 0, background: "transparent", color: "#9b5260", fontSize: "11px" }}>Delete</button>
          </div>)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "9px" }}>
          <span style={{ color: "#8a8195", fontSize: "10px" }}>{memories.length}/{MAX_MEMORY_ITEMS} saved · {memories.filter((item) => item.pinned).length} pinned</span>
          <button type="button" onClick={() => setOpen(false)} style={{ border: "1px solid #e5dfed", borderRadius: "8px", background: "#fff", padding: "6px 10px", fontSize: "11px" }}>Close</button>
        </div>
      </section>}
    </div>
  );
}
