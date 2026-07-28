import "server-only";

import webPush from "web-push";

let configured = false;

export function getWebPushClient() {
  if (configured) return webPush;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim()
    || "mailto:contact@kingofcaps.bj";

  if (!publicKey || !privateKey) {
    throw new Error("Les clés VAPID ne sont pas configurées côté serveur.");
  }
  if (!subject.startsWith("mailto:") && !subject.startsWith("https://")) {
    throw new Error("VAPID_SUBJECT doit commencer par mailto: ou https://.");
  }

  console.info("[push][vapid] Initialisation de web-push.", {
    publicKeyPresent: Boolean(publicKey),
    publicKeyLength: publicKey.length,
    privateKeyPresent: Boolean(privateKey),
    privateKeyLength: privateKey.length,
    subject,
  });
  webPush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  console.info("[push][vapid] web-push initialisé avec succès.");
  return webPush;
}
