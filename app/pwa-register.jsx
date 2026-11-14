"use client";

import { useEffect, useState } from "react";

export default function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("ORION service worker registration failed:", error);
      });
    }

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  if (installed || !installPrompt) return null;

  return (
    <>
    <style>{`@media (max-width: 700px) { .orion-install-prompt { display: none !important; } }`}</style>
    <button
      className="orion-install-prompt"
      type="button"
      onClick={installApp}
      aria-label="Install ORION AI"
      style={{
        position: "fixed",
        right: 16,
        bottom: "calc(16px + env(safe-area-inset-bottom))",
        zIndex: 1000,
        border: "1px solid rgba(99, 102, 241, .25)",
        borderRadius: 999,
        padding: "9px 13px",
        maxWidth: "calc(100vw - 24px)",
        color: "#fff",
        background: "linear-gradient(135deg, #6d5dfc, #269bd8)",
        boxShadow: "0 8px 24px rgba(50, 70, 180, .22)",
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      ↓ Install ORION AI
    </button>
    </>
  );
}
