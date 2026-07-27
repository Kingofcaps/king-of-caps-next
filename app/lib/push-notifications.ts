import "server-only";

import { createHash } from "node:crypto";
import type { Product } from "./products";
import {
  claimPushNotificationEvent,
  completePushNotificationEvent,
  deletePushSubscription,
  listPushSubscriptions,
  type PushSubscriptionRecord,
} from "./push-subscriptions";
import { getWebPushClient } from "./web-push";
import { PRODUCT_IMAGE_FALLBACK } from "./product-image-url";

const PUSH_BATCH_SIZE = 10;

type WebPushError = Error & {
  statusCode?: number;
  body?: string;
};

export type ProductPushResult = {
  skipped: boolean;
  subscriptionCount: number;
  deliveredCount: number;
  failedCount: number;
  removedCount: number;
};

function endpointReference(endpoint: string) {
  return createHash("sha256").update(endpoint).digest("hex").slice(0, 12);
}

function isExpiredOrInvalidSubscription(error: unknown) {
  const pushError = error as WebPushError;
  if (pushError?.statusCode === 404 || pushError?.statusCode === 410) return true;
  if (pushError?.statusCode !== 400) return false;
  return /expired|invalid|unregistered|subscription/i.test(pushError.body ?? pushError.message ?? "");
}

function notificationTopic(productId: string) {
  return createHash("sha256").update(`new-product:${productId}`).digest("base64url").slice(0, 32);
}

async function sendToSubscription(
  subscription: PushSubscriptionRecord,
  payload: string,
  topic: string,
) {
  const webPush = getWebPushClient();
  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      payload,
      { TTL: 60 * 60 * 24, urgency: "normal", topic },
    );
    return { delivered: true, removed: false };
  } catch (error) {
    const endpoint = endpointReference(subscription.endpoint);
    if (isExpiredOrInvalidSubscription(error)) {
      try {
        await deletePushSubscription(subscription.endpoint);
        console.info("[push][cleanup] Abonnement expiré ou invalide supprimé.", { endpoint });
        return { delivered: false, removed: true };
      } catch (cleanupError) {
        console.error("[push][cleanup] Échec de suppression d’un abonnement invalide.", { endpoint, error: cleanupError });
      }
    }

    const pushError = error as WebPushError;
    console.error("[push][send] Échec d’envoi d’une notification.", {
      endpoint,
      statusCode: pushError?.statusCode ?? null,
      message: pushError instanceof Error ? pushError.message : "Erreur inconnue",
    });
    return { delivered: false, removed: false };
  }
}

export async function sendNewProductPushNotification(product: Product): Promise<ProductPushResult> {
  const eventKey = `new-product:${product.id}`;
  const claimed = await claimPushNotificationEvent(eventKey, product.id);
  if (!claimed) {
    console.info("[push][product] Notification déjà traitée, envoi ignoré.", { productId: product.id });
    return { skipped: true, subscriptionCount: 0, deliveredCount: 0, failedCount: 0, removedCount: 0 };
  }

  let subscriptionCount = 0;
  let deliveredCount = 0;
  let failedCount = 0;
  let removedCount = 0;

  try {
    const subscriptions = await listPushSubscriptions();
    subscriptionCount = subscriptions.length;
    const payload = JSON.stringify({
      title: "Nouvel article disponible",
      message: `Découvrez maintenant : ${product.name}`,
      url: `/product/${encodeURIComponent(product.id)}`,
      image: product.image && product.image !== PRODUCT_IMAGE_FALLBACK ? product.image : undefined,
      tag: eventKey,
    });
    const topic = notificationTopic(product.id);

    for (let index = 0; index < subscriptions.length; index += PUSH_BATCH_SIZE) {
      const batch = subscriptions.slice(index, index + PUSH_BATCH_SIZE);
      const results = await Promise.all(batch.map((subscription) => sendToSubscription(subscription, payload, topic)));
      results.forEach((result) => {
        if (result.delivered) deliveredCount += 1;
        else failedCount += 1;
        if (result.removed) removedCount += 1;
      });
    }

    await completePushNotificationEvent(eventKey, {
      status: "completed",
      subscriptionCount,
      deliveredCount,
      failedCount,
      removedCount,
    });
    console.info("[push][product] Diffusion terminée.", {
      productId: product.id,
      subscriptionCount,
      deliveredCount,
      failedCount,
      removedCount,
    });
    return { skipped: false, subscriptionCount, deliveredCount, failedCount, removedCount };
  } catch (error) {
    await completePushNotificationEvent(eventKey, {
      status: "failed",
      subscriptionCount,
      deliveredCount,
      failedCount: Math.max(failedCount, subscriptionCount - deliveredCount),
      removedCount,
    }).catch((eventError) => {
      console.error("[push][product] Impossible d’enregistrer l’échec de diffusion.", eventError);
    });
    throw error;
  }
}
