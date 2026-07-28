"use client";

import { useEffect } from "react";
import { generateClientId } from "@/app/lib/client-id";

const INSTALLATION_ID_KEY = "king-of-caps-pwa-installation-id";

function isStandalone() {
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches
    || standaloneNavigator.standalone === true;
}

function detectPlatform(): "ios" | "android" | "desktop" {
  const userAgent = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

export default function PwaInstallationTracker() {
  useEffect(() => {
    if (!isStandalone()) return;

    async function recordStandaloneOpen() {
      try {
        let installationId = window.localStorage.getItem(INSTALLATION_ID_KEY)?.trim();
        if (!installationId) {
          installationId = generateClientId("pwa");
          window.localStorage.setItem(INSTALLATION_ID_KEY, installationId);
        }

        const response = await fetch("/api/pwa/installations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ installationId, platform: detectPlatform() }),
        });
        if (!response.ok) {
          const message = await response.text().catch(() => "");
          throw new Error(message || `La route PWA a répondu ${response.status}.`);
        }
      } catch (error) {
        console.error("[pwa][installation] Enregistrement de l’ouverture impossible.", error);
      }
    }

    void recordStandaloneOpen();
  }, []);

  return null;
}
