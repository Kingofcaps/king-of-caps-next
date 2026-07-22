import { createHash, timingSafeEqual } from "node:crypto";
import type { PaymentMethod } from "./orders";

const PAYDUNYA_ENDPOINTS = {
  test: "https://app.paydunya.com/sandbox-api/v1/checkout-invoice",
  production: "https://app.paydunya.com/api/v1/checkout-invoice",
} as const;

type CheckoutOrder = {
  order_number: string;
  total_amount: number;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string | null;
  customer_phone: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
};

type PayDunyaCreateResponse = {
  response_code?: string;
  response_text?: string;
  description?: string;
  token?: string;
};

export type PayDunyaPaymentStatus = "pending" | "completed" | "cancelled" | "failed";

export type PayDunyaConfirmation = {
  response_code?: string;
  response_text?: string;
  hash?: string;
  invoice?: {
    token?: string;
    total_amount?: number | string;
  };
  custom_data?: {
    order_number?: string;
    currency?: string;
  };
  status?: string;
  fail_reason?: string;
};

export const ONLINE_PAYMENT_UNAVAILABLE_MESSAGE = "Le paiement en ligne est temporairement indisponible. Choisissez le paiement à la livraison.";

export function isPayDunyaConfigured() {
  return Boolean(
    process.env.PAYDUNYA_MASTER_KEY?.trim()
    && process.env.PAYDUNYA_PRIVATE_KEY?.trim()
    && process.env.PAYDUNYA_PUBLIC_KEY?.trim()
    && process.env.PAYDUNYA_TOKEN?.trim()
    && process.env.NEXT_PUBLIC_SITE_URL?.trim(),
  );
}

export function payDunyaCheckoutUrl(token: string) {
  const mode = process.env.PAYDUNYA_MODE === "production" ? "production" : "test";
  const path = mode === "production" ? "checkout/invoice" : "sandbox-checkout/invoice";
  return `https://app.paydunya.com/${path}/${encodeURIComponent(token)}`;
}

function getConfig() {
  const masterKey = process.env.PAYDUNYA_MASTER_KEY?.trim();
  const privateKey = process.env.PAYDUNYA_PRIVATE_KEY?.trim();
  const publicKey = process.env.PAYDUNYA_PUBLIC_KEY?.trim();
  const token = process.env.PAYDUNYA_TOKEN?.trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const mode = process.env.PAYDUNYA_MODE === "production" ? "production" : "test";

  if (!masterKey || !privateKey || !publicKey || !token || !siteUrl) {
    throw new Error("PayDunya n’est pas encore configuré.");
  }

  return {
    masterKey,
    privateKey,
    publicKey,
    token,
    siteUrl: siteUrl.replace(/\/$/, ""),
    baseUrl: PAYDUNYA_ENDPOINTS[mode],
  };
}

function apiHeaders(config: ReturnType<typeof getConfig>) {
  return {
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": config.masterKey,
    "PAYDUNYA-PRIVATE-KEY": config.privateKey,
    "PAYDUNYA-TOKEN": config.token,
  };
}

function isSecurePayDunyaUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "app.paydunya.com";
  } catch {
    return false;
  }
}

function normalizeStatus(value: string | undefined): PayDunyaPaymentStatus {
  const status = value?.trim().toLowerCase();
  if (status === "completed") return "completed";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "failed" || status === "expired") return "failed";
  return "pending";
}

function hashesMatch(left: string, right: string) {
  if (!/^[a-f\d]{128}$/i.test(left) || !/^[a-f\d]{128}$/i.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function verifyPayDunyaHash(hash: string) {
  const { masterKey } = getConfig();
  const expectedHash = createHash("sha512").update(masterKey, "utf8").digest("hex");
  return hashesMatch(hash, expectedHash);
}

export async function createPayDunyaCheckout(
  order: CheckoutOrder,
  paymentMethod: Extract<PaymentMethod, "mobile_money" | "card">,
  fetcher: typeof fetch = fetch,
) {
  const config = getConfig();
  const response = await fetcher(`${config.baseUrl}/create`, {
    method: "POST",
    headers: apiHeaders(config),
    body: JSON.stringify({
      invoice: {
        items: Object.fromEntries(order.items.map((item, index) => [`item_${index}`, {
          name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.line_total,
          description: `Commande ${order.order_number}`,
        }])),
        customer: {
          name: `${order.customer_first_name} ${order.customer_last_name}`.trim(),
          email: order.customer_email ?? "",
          phone: order.customer_phone,
        },
        channels: paymentMethod === "card" ? ["card"] : ["mtn-benin", "moov-benin"],
        total_amount: order.total_amount,
        description: `Commande KING OF CAPS ${order.order_number}`,
      },
      store: {
        name: "KING OF CAPS",
        tagline: "Plus qu’une casquette, une identité.",
        phone: "+22950687515",
        website_url: config.siteUrl,
      },
      custom_data: {
        order_number: order.order_number,
        currency: "XOF",
      },
      actions: {
        cancel_url: `${config.siteUrl}/api/payments/paydunya/cancel`,
        return_url: `${config.siteUrl}/api/payments/paydunya/return`,
        callback_url: `${config.siteUrl}/api/payments/paydunya/ipn`,
      },
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as PayDunyaCreateResponse;
  if (!response.ok || payload.response_code !== "00") {
    throw new Error(payload.description || payload.response_text || "Impossible de créer la facture PayDunya.");
  }

  const checkoutUrl = payload.response_text?.trim() ?? "";
  const invoiceToken = payload.token?.trim() ?? "";
  if (!invoiceToken || !isSecurePayDunyaUrl(checkoutUrl)) {
    throw new Error("PayDunya n’a pas retourné une facture de paiement valide.");
  }

  return { token: invoiceToken, url: checkoutUrl };
}

export async function verifyPayDunyaPayment(
  invoiceToken: string,
  fetcher: typeof fetch = fetch,
) {
  const token = invoiceToken.trim();
  if (!token) throw new Error("Token PayDunya manquant.");

  const config = getConfig();
  const response = await fetcher(`${config.baseUrl}/confirm/${encodeURIComponent(token)}`, {
    method: "GET",
    headers: apiHeaders(config),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as PayDunyaConfirmation;

  if (
    !response.ok
    || payload.response_code !== "00"
    || payload.invoice?.token !== token
    || !payload.hash
    || !verifyPayDunyaHash(payload.hash)
  ) {
    throw new Error("La transaction PayDunya n’a pas pu être vérifiée.");
  }

  return {
    token,
    status: normalizeStatus(payload.status),
    totalAmount: Number(payload.invoice.total_amount),
    orderNumber: payload.custom_data?.order_number?.trim() || null,
    currency: payload.custom_data?.currency?.trim().toUpperCase() || null,
    failReason: payload.fail_reason?.trim() || null,
  };
}
