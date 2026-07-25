"use client";

import { useEffect, useState } from "react";

type Availability =
  | "checking"
  | "ready"
  | "denied"
  | "unsupported"
  | "needs-install";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalonePwa() {
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };
  return window.matchMedia("(display-mode: standalone)").matches
    || navigatorWithStandalone.standalone === true;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = window.atob(base64);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

async function registerPushServiceWorker() {
  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

async function postJson(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  if (response.ok) return;

  const payload = await response.json().catch(() => null) as {
    error?: string;
  } | null;
  throw new Error(payload?.error || "La requête a échoué.");
}

export default function PushNotificationButton() {
  const [availability, setAvailability] =
    useState<Availability>("checking");
  const [subscription, setSubscription] =
    useState<PushSubscription | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function inspectPushSupport() {
      if (isIosDevice() && !isStandalonePwa()) {
        if (active) setAvailability("needs-install");
        return;
      }
      if (
        !("serviceWorker" in navigator)
        || !("PushManager" in window)
        || !("Notification" in window)
      ) {
        if (active) setAvailability("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (active) setAvailability("denied");
        return;
      }

      try {
        const registration = await registerPushServiceWorker();
        const existingSubscription =
          await registration.pushManager.getSubscription();
        if (!active) return;
        setSubscription(existingSubscription);
        setAvailability("ready");
      } catch {
        if (!active) return;
        setAvailability("ready");
        setError("Impossible de préparer les notifications.");
      }
    }

    void inspectPushSupport();
    return () => {
      active = false;
    };
  }, []);

  async function enableNotifications() {
    setBusy(true);
    setError(null);
    let createdSubscription: PushSubscription | null = null;

    try {
      if (!vapidPublicKey?.trim()) {
        throw new Error("La clé publique VAPID n’est pas configurée.");
      }

      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission !== "granted") {
        setAvailability("denied");
        return;
      }

      const registration = await registerPushServiceWorker();
      let nextSubscription = await registration.pushManager.getSubscription();
      if (!nextSubscription) {
        nextSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        createdSubscription = nextSubscription;
      }

      await postJson("/api/push/subscribe", nextSubscription.toJSON());
      setSubscription(nextSubscription);
      setAvailability("ready");
    } catch (caughtError) {
      if (createdSubscription) {
        await createdSubscription.unsubscribe().catch(() => false);
      }
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible d’activer les notifications.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disableNotifications() {
    setBusy(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const currentSubscription =
        subscription || await registration.pushManager.getSubscription();
      if (!currentSubscription) {
        setSubscription(null);
        return;
      }

      await postJson("/api/push/unsubscribe", {
        endpoint: currentSubscription.endpoint,
      });
      await currentSubscription.unsubscribe();
      setSubscription(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de désactiver les notifications.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (availability === "needs-install") {
    return (
      <p className="max-w-56 text-xs leading-5 text-zinc-400">
        Sur iPhone, ajoutez KING OF CAPS à l’écran d’accueil puis ouvrez la PWA
        pour activer les notifications.
      </p>
    );
  }

  if (availability === "unsupported") {
    return (
      <p className="max-w-56 text-xs leading-5 text-zinc-400">
        Les notifications ne sont pas compatibles avec ce navigateur.
      </p>
    );
  }

  if (availability === "denied") {
    return (
      <p className="max-w-56 text-xs leading-5 text-zinc-400">
        Notifications refusées. Vous pouvez les autoriser dans les réglages du
        navigateur.
      </p>
    );
  }

  const active = subscription !== null;
  const label = availability === "checking"
    ? "Vérification…"
    : busy
      ? "Chargement…"
      : active
        ? "Notifications activées"
        : "Activer les notifications";

  return (
    <div className="flex max-w-64 flex-col items-start gap-1.5">
      <button
        type="button"
        aria-pressed={active}
        disabled={availability === "checking" || busy}
        onClick={active ? disableNotifications : enableNotifications}
        className="rounded-full border border-[#d4af37]/70 px-3.5 py-2 text-xs font-bold text-white transition hover:border-[#d4af37] hover:text-[#d4af37] disabled:cursor-wait disabled:opacity-60"
      >
        {label}
      </button>
      {active && !busy && (
        <span className="text-[11px] leading-4 text-zinc-400">
          Cliquez à nouveau pour désactiver.
        </span>
      )}
      {error && (
        <span role="alert" className="text-[11px] leading-4 text-red-300">
          {error}
        </span>
      )}
    </div>
  );
}
