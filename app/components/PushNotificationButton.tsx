"use client";

import { useEffect, useState } from "react";

type Availability =
  | "checking"
  | "ready"
  | "active"
  | "denied"
  | "unsupported"
  | "needs-install";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PUBLIC_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

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
  if (value !== value.trim()) {
    throw new Error("La clé publique VAPID contient un espace ou un retour à la ligne.");
  }
  if (!VAPID_PUBLIC_KEY_PATTERN.test(value)) {
    throw new Error("La clé publique VAPID contient des caractères invalides ou des guillemets.");
  }

  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = window.atob(base64);
  const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  if (bytes.length !== 65 || bytes[0] !== 4) {
    throw new Error("La clé publique VAPID n’est pas une clé P-256 valide.");
  }
  return bytes;
}

async function registerPushServiceWorker() {
  console.info("[push][client] Service worker disponible.", {
    available: "serviceWorker" in navigator,
  });
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  await registration.update().catch((error) => {
    console.warn("[push][client] Mise à jour du service worker impossible.", error);
  });
  const readyRegistration = await navigator.serviceWorker.ready;
  console.info("[push][client] navigator.serviceWorker.ready résolu.", {
    scope: readyRegistration.scope,
    active: Boolean(readyRegistration.active),
    pushManager: Boolean(readyRegistration.pushManager),
  });
  return readyRegistration;
}

async function postJson(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const responseText = await response.text();
  type ApiResponse = { error?: string; success?: boolean };
  let payload: ApiResponse | null = null;
  try {
    payload = responseText ? JSON.parse(responseText) as ApiResponse : null;
  } catch {
    payload = null;
  }
  console.info("[push][client] Réponse de la route d’enregistrement.", {
    path,
    status: response.status,
    ok: response.ok,
    response: payload ?? responseText.slice(0, 500),
  });
  if (response.ok) return payload;

  throw new Error(
    payload?.error
      || responseText.slice(0, 500)
      || `La route d’enregistrement a répondu ${response.status}.`,
  );
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
      const ios = isIosDevice();
      const standalone = isStandalonePwa();
      console.info("[push][client] Vérification du support.", {
        ios,
        standalone,
        permission: "Notification" in window ? Notification.permission : "indisponible",
        vapidPublicKeyPresent: Boolean(vapidPublicKey),
        vapidPublicKeyLength: vapidPublicKey?.length ?? 0,
      });

      if (ios && !standalone) {
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

      if (Notification.permission === "default") {
        if (active) setAvailability("ready");
        return;
      }

      try {
        const registration = await registerPushServiceWorker();
        const existingSubscription =
          await registration.pushManager.getSubscription();
        console.info("[push][client] Résultat de pushManager.getSubscription().", {
          exists: Boolean(existingSubscription),
        });
        if (!active) return;
        if (!existingSubscription) {
          setSubscription(null);
          setAvailability("ready");
          return;
        }

        await postJson("/api/push/subscribe", existingSubscription.toJSON());
        if (!active) return;
        setSubscription(existingSubscription);
        setAvailability("active");
        console.info("[push][client] Abonnement existant confirmé côté serveur.");
      } catch (caughtError) {
        if (!active) return;
        setAvailability("ready");
        setError("Impossible de préparer les notifications.");
        console.error("[push][client] Échec de vérification de l’abonnement.", caughtError);
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
      if (!vapidPublicKey) {
        throw new Error("La clé publique VAPID n’est pas configurée.");
      }
      console.info("[push][client] Configuration VAPID publique.", {
        present: true,
        length: vapidPublicKey.length,
        hasWhitespace: /\s/.test(vapidPublicKey),
        hasQuotes: /["']/.test(vapidPublicKey),
      });
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      console.info("[push][client] Clé VAPID convertie.", {
        byteLength: applicationServerKey.byteLength,
      });

      console.info("[push][client] Demande d’activation déclenchée par l’utilisateur.");
      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      console.info("[push][client] Résultat de Notification.requestPermission().", {
        permission,
      });
      if (permission !== "granted") {
        setAvailability(permission === "denied" ? "denied" : "ready");
        console.warn("[push][client] Autorisation non accordée.", { permission });
        return;
      }

      const registration = await registerPushServiceWorker();
      let nextSubscription = await registration.pushManager.getSubscription();
      console.info("[push][client] Résultat de pushManager.getSubscription().", {
        exists: Boolean(nextSubscription),
      });
      if (!nextSubscription) {
        nextSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
        createdSubscription = nextSubscription;
        const serializedSubscription = nextSubscription.toJSON();
        console.info("[push][client] Résultat de pushManager.subscribe().", {
          created: true,
          endpointPresent: Boolean(serializedSubscription.endpoint),
          p256dhPresent: Boolean(serializedSubscription.keys?.p256dh),
          authPresent: Boolean(serializedSubscription.keys?.auth),
        });
      }

      await postJson("/api/push/subscribe", nextSubscription.toJSON());
      setSubscription(nextSubscription);
      setAvailability("active");
      console.info("[push][client] Notifications activées et abonnement enregistré.");
    } catch (caughtError) {
      if (createdSubscription) {
        await createdSubscription.unsubscribe().catch(() => false);
      }
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible d’activer les notifications.",
      );
      setAvailability("ready");
      console.error("[push][client] Échec d’activation des notifications.", caughtError);
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
      setAvailability("ready");
      console.info("[push][client] Notifications désactivées.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de désactiver les notifications.",
      );
      console.error("[push][client] Échec de désactivation des notifications.", caughtError);
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
        Notifications bloquées dans les réglages de l’iPhone
      </p>
    );
  }

  const notificationsActive = availability === "active" && subscription !== null;
  const label = availability === "checking"
    ? "Vérification…"
    : busy
      ? "Chargement…"
      : notificationsActive
        ? "Notifications activées"
        : "Activer les notifications";

  return (
    <div className="flex max-w-64 flex-col items-start gap-1.5">
      <button
        type="button"
        aria-pressed={notificationsActive}
        disabled={availability === "checking" || busy}
        onClick={notificationsActive ? disableNotifications : enableNotifications}
        className="rounded-full border border-[#d4af37]/70 px-3.5 py-2 text-xs font-bold text-white transition hover:border-[#d4af37] hover:text-[#d4af37] disabled:cursor-wait disabled:opacity-60"
      >
        {label}
      </button>
      {notificationsActive && !busy && (
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
