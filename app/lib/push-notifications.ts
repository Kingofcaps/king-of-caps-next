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

function isExpiredSubscription(error: unknown) {
  const pushError = error as WebPushError;
  return pushError?.statusCode === 404 || pushError?.statusCode === 410;
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
  const endpoint = endpointReference(subscription.endpoint);
  console.info("[push][send] Appel de webpush.sendNotification().", {
    endpoint,
    topic,
  });
  try {
    const result = await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      payload,
      { TTL: 60 * 60 * 24, urgency: "normal", topic },
    );
    console.info("[push][send] Notification envoyée avec succès.", {
      endpoint,
      statusCode: result.statusCode,
    });
    return { delivered: true, removed: false };
  } catch (error) {
    if (isExpiredSubscription(error)) {
      try {
        await deletePushSubscription(subscription.endpoint);
        console.info("[push][cleanup] Abonnement 404/410 supprimé.", { endpoint });
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
      responseBody: pushError?.body?.slice(0, 500) ?? null,
      removed: false,
    });
    return { delivered: false, removed: false };
  }
}

export async function sendNewProductPushNotification(product: Product): Promise<ProductPushResult> {
  const eventKey = `new-product:${product.id}`;
  let eventTrackingAvailable = true;
  try {
    const claimed = await claimPushNotificationEvent(eventKey, product.id);
    if (!claimed) {
      console.info("[push][product] Notification déjà traitée, envoi ignoré.", { productId: product.id });
      return { skipped: true, subscriptionCount: 0, deliveredCount: 0, failedCount: 0, removedCount: 0 };
    }
    console.info("[push][product] Événement anti-doublon réservé.", {
      productId: product.id,
      eventKey,
    });
  } catch (eventError) {
    eventTrackingAvailable = false;
    console.warn("[push][product] Suivi anti-doublon indisponible, diffusion maintenue.", {
      productId: product.id,
      error: eventError instanceof Error ? eventError.message : "Erreur inconnue",
    });
  }

  let subscriptionCount = 0;
  let deliveredCount = 0;
  let failedCount = 0;
  let removedCount = 0;

  try {
    const subscriptions = await listPushSubscriptions();
    subscriptionCount = subscriptions.length;
    const notificationPayload = {
      title: "Nouvel article disponible",
      body: `Découvrez maintenant : ${product.name}`,
      url: `/product/${encodeURIComponent(product.id)}`,
      image: product.image && product.image !== PRODUCT_IMAGE_FALLBACK ? product.image : null,
      tag: eventKey,
    };
    const payload = JSON.stringify(notificationPayload);
    const topic = notificationTopic(product.id);
    console.info("[push][product] Abonnements chargés, diffusion démarrée.", {
      productId: product.id,
      subscriptionCount,
      payload: notificationPayload,
    });

    for (let index = 0; index < subscriptions.length; index += PUSH_BATCH_SIZE) {
      const batch = subscriptions.slice(index, index + PUSH_BATCH_SIZE);
      const results = await Promise.all(batch.map((subscription) => sendToSubscription(subscription, payload, topic)));
      results.forEach((result) => {
        if (result.delivered) deliveredCount += 1;
        else failedCount += 1;
        if (result.removed) removedCount += 1;
      });
    }

    if (eventTrackingAvailable) {
      await completePushNotificationEvent(eventKey, {
        status: "completed",
        subscriptionCount,
        deliveredCount,
        failedCount,
        removedCount,
      }).catch((eventError) => {
        console.error("[push][product] Diffusion faite, mais suivi impossible à finaliser.", {
          productId: product.id,
          error: eventError instanceof Error ? eventError.message : "Erreur inconnue",
        });
      });
    }
    console.info("[push][product] Diffusion terminée.", {
      productId: product.id,
      subscriptionCount,
      deliveredCount,
      failedCount,
      removedCount,
    });
    return { skipped: false, subscriptionCount, deliveredCount, failedCount, removedCount };
  } catch (error) {
    if (eventTrackingAvailable) {
      await completePushNotificationEvent(eventKey, {
        status: "failed",
        subscriptionCount,
        deliveredCount,
        failedCount: Math.max(failedCount, subscriptionCount - deliveredCount),
        removedCount,
      }).catch((eventError) => {
        console.error("[push][product] Impossible d’enregistrer l’échec de diffusion.", eventError);
      });
    }
    throw error;
  }
}
