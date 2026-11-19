"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_MEMORY_ITEMS,
  MAX_MEMORY_CHARS,
  createMemoryBackup,
  normalizeMemories,
  parseMemoryBackup,
} from "../lib/orion-memory.mjs";

const panelButton = {
  border: "1px solid #e5dfed",
  borderRadius: "9px",
  background: "#fff",
  color: "#292235",
  padding: "9px 11px",
  fontSize: "12px",
  minHeight: "38px",
};

export default function OrionMemoryPanel({ memories = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef(null);
  const normalized = useMemo(() => normalizeMemories(memories), [memories]);
  const visibleMemories = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return normalized;
    return normalized.filter((item) => item.text.toLocaleLowerCase().includes(needle));
  }, [normalized, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function commit(next, message) {
    onChange(normalizeMemories(next));
    setNotice(message);
  }

  function addMemory(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    if (normalized.some((item) => item.text.toLocaleLowerCase() === text.toLocaleLowerCase())) {
      setNotice("This memory is already saved.");
      return;
    }
    if (normalized.length >= MAX_MEMORY_ITEMS) {
      setNotice(`Memory limit reached (${MAX_MEMORY_ITEMS}). Delete an item before adding another.`);
      return;
    }
    const now = new Date().toISOString();
    commit([...normalized, {
      id: globalThis.crypto?.randomUUID?.() || `memory-${Date.now()}`,
      text: text.slice(0, MAX_MEMORY_CHARS),
      createdAt: now,
      updatedAt: now,
    }], "Memory saved on this device.");
    setDraft("");
  }

  function togglePinned(item) {
    commit(normalized.map((entry) => entry.id === item.id
      ? { ...entry, pinned: !entry.pinned, updatedAt: new Date().toISOString() }
      : entry), item.pinned ? "Memory unpinned." : "Memory pinned.");
  }

  function saveEdit(event) {
    event.preventDefault();
    const text = editDraft.trim();
    if (!text || !editingId) return;
    if (normalized.some((item) => item.id !== editingId && item.text.toLocaleLowerCase() === text.toLocaleLowerCase())) {
      setNotice("Another saved memory already contains this text.");
      return;
    }
    commit(normalized.map((item) => item.id === editingId
      ? { ...item, text: text.slice(0, MAX_MEMORY_CHARS), updatedAt: new Date().toISOString() }
      : item), "Memory updated.");
    setEditingId(null);
    setEditDraft("");
  }

  function deleteMemory(item) {
    commit(normalized.filter((entry) => entry.id !== item.id), "Memory deleted from this browser.");
    if (editingId === item.id) setEditingId(null);
  }

  function exportBackup() {
    try {
      const blob = new Blob([JSON.stringify(createMemoryBackup(normalized), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "orion-memory-backup.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Backup exported. Store the JSON file somewhere safe.");
    } catch {
      setNotice("Could not export the backup on this device.");
    }
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 16 * 1024) throw new Error("Backup file is too large (maximum 16 KB).");
      const imported = parseMemoryBackup(await file.text());
      const combined = normalizeMemories([...normalized, ...imported]);
      const added = combined.length - normalized.length;
      commit(combined, `Backup imported: ${added} new item(s) added.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not import this backup.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <>
      <button
        type="button"
        className="top-button"
        aria-label="Manage ORION memory"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        title="Memory"
      >✧</button>
      {open && (
        <div
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))",
            background: "rgba(3, 12, 32, .66)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="orion-memory-title"
            style={{
              boxSizing: "border-box", width: "min(100%, 520px)",
              maxHeight: "min(82dvh, 720px)", overflow: "hidden",
              display: "flex", flexDirection: "column",
              padding: "clamp(14px, 4vw, 20px)",
              border: "1px solid rgba(70,50,110,.16)", borderRadius: "20px",
              background: "#fff", boxShadow: "0 22px 70px rgba(0,0,0,.32)",
              color: "#292235", minWidth: 0,
            }}
          >
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexShrink: 0 }}>
              <div>
                <strong id="orion-memory-title" style={{ display: "block", fontSize: "17px" }}>ORION Memory</strong>
                <span style={{ color: "#81778d", fontSize: "11px" }}>Your saved preferences and useful facts</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close memory manager" style={{ ...panelButton, width: "40px", padding: 0, fontSize: "20px" }}>×</button>
            </header>

            <p style={{ margin: "12px 0", color: "#746b80", fontSize: "12px", lineHeight: 1.55, flexShrink: 0 }}>
              Only facts you add here are saved in this browser on this device. Pin important preferences to help ORION use them across topics. Do not save passwords or sensitive information.
            </p>

            <form onSubmit={addMemory} style={{ display: "flex", gap: "8px", minWidth: 0, flexShrink: 0 }}>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={MAX_MEMORY_CHARS}
                placeholder="Add a preference or useful fact"
                aria-label="New memory"
                style={{ boxSizing: "border-box", flex: 1, width: 0, minWidth: 0, padding: "11px", border: "1px solid #ded8e8", borderRadius: "10px", fontSize: "13px" }}
              />
              <button type="submit" disabled={!draft.trim() || normalized.length >= MAX_MEMORY_ITEMS} style={{ border: 0, borderRadius: "10px", padding: "0 16px", minHeight: "42px", background: "#7040d2", color: "#fff", fontSize: "13px", fontWeight: 600, opacity: !draft.trim() || normalized.length >= MAX_MEMORY_ITEMS ? .5 : 1 }}>Add</button>
            </form>
            <div style={{ display: "flex", gap: "8px", marginTop: "9px", flexShrink: 0 }}>
              <button type="button" onClick={exportBackup} disabled={normalized.length === 0} style={{ ...panelButton, flex: 1, opacity: normalized.length === 0 ? .5 : 1 }}>Export backup</button>
              <button type="button" onClick={() => fileInputRef.current?.click()} style={{ ...panelButton, flex: 1 }}>Import backup</button>
              <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={importBackup} aria-label="Import memory backup" style={{ display: "none" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginTop: "14px", flexShrink: 0 }}>
              <strong style={{ fontSize: "13px" }}>Saved memories</strong>
              <span style={{ color: "#81778d", fontSize: "11px", whiteSpace: "nowrap" }}>{normalized.length}/{MAX_MEMORY_ITEMS} saved · {normalized.filter((item) => item.pinned).length} pinned</span>
            </div>
            {normalized.length > 0 && (
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search saved memories"
                aria-label="Search saved memories"
                style={{ boxSizing: "border-box", width: "100%", marginTop: "8px", padding: "10px", border: "1px solid #e5dfed", borderRadius: "9px", fontSize: "12px", flexShrink: 0 }}
              />
            )}

            <div style={{ marginTop: "8px", minHeight: "72px", overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", flex: "1 1 auto" }}>
              {normalized.length === 0 ? (
                <div style={{ padding: "22px 10px", textAlign: "center", color: "#81778d" }}>
                  <div style={{ fontSize: "26px", marginBottom: "6px" }}>✧</div>
                  <strong style={{ display: "block", color: "#51475f", fontSize: "13px" }}>No saved memories yet</strong>
                  <span style={{ fontSize: "11px" }}>Add a preference above to get started.</span>
                </div>
              ) : visibleMemories.length === 0 ? (
                <p style={{ padding: "14px 4px", color: "#81778d", fontSize: "12px" }}>No memories match your search.</p>
              ) : visibleMemories.map((item) => (
                <div key={item.id} style={{ padding: "10px 0", borderBottom: "1px solid #f0edf4" }}>
                  {editingId === item.id ? (
                    <form onSubmit={saveEdit} style={{ display: "grid", gap: "7px" }}>
                      <textarea value={editDraft} onChange={(event) => setEditDraft(event.target.value)} maxLength={MAX_MEMORY_CHARS} aria-label="Edit memory" rows={2} style={{ boxSizing: "border-box", width: "100%", resize: "vertical", padding: "9px", border: "1px solid #ded8e8", borderRadius: "9px", font: "inherit", fontSize: "12px" }} />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "7px" }}>
                        <button type="button" onClick={() => setEditingId(null)} style={panelButton}>Cancel</button>
                        <button type="submit" disabled={!editDraft.trim()} style={{ ...panelButton, background: "#7040d2", color: "#fff", borderColor: "#7040d2" }}>Save</button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <div style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere", fontSize: "13px", lineHeight: 1.5 }}>
                        {item.text}
                        {item.pinned && <span style={{ display: "inline-block", marginLeft: "6px", color: "#7040d2", fontSize: "10px", fontWeight: 700 }}>PINNED</span>}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "3px", flexShrink: 0 }}>
                        <button type="button" onClick={() => togglePinned(item)} aria-label={item.pinned ? "Unpin memory" : "Pin memory"} style={{ border: 0, background: "transparent", color: "#7040d2", padding: "4px", fontSize: "11px" }}>{item.pinned ? "Unpin" : "Pin"}</button>
                        <button type="button" onClick={() => { setEditingId(item.id); setEditDraft(item.text); }} aria-label={`Edit memory: ${item.text}`} style={{ border: 0, background: "transparent", color: "#4c668f", padding: "4px", fontSize: "11px" }}>Edit</button>
                        <button type="button" onClick={() => deleteMemory(item)} aria-label={`Delete memory: ${item.text}`} style={{ border: 0, background: "transparent", color: "#a04456", padding: "4px", fontSize: "11px" }}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {notice && <p role="status" aria-live="polite" style={{ margin: "8px 0 0", color: "#66528a", fontSize: "11px", lineHeight: 1.4, flexShrink: 0 }}>{notice}</p>}
            <footer style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px", flexShrink: 0 }}>
              <button type="button" onClick={() => setOpen(false)} style={panelButton}>Close</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
