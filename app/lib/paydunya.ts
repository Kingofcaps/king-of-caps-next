import { createHash, timingSafeEqual } from "node:crypto";
import type { PaymentMethod } from "./orders";

const PAYDUNYA_API_URL = "https://app.paydunya.com/api/v1/checkout-invoice";
const SITE_URL = "https://kingofcaps.bj";

type CheckoutOrder = {
  order_number: string;
  total_amount: number;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string | null;
  customer_phone: string;
  customer_address?: string;
  customer_city?: string;
  customer_note?: string | null;
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
  errors?: {
    message?: string;
    description?: string;
  };
};

export type PayDunyaPaymentStatus = "pending" | "completed" | "cancelled" | "failed";

export type PayDunyaConfirmation = {
  response_code?: string;
  response_text?: string;
  errors?: {
    message?: string;
    description?: string;
  };
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
    && process.env.PAYDUNYA_TOKEN?.trim(),
  );
}

function getConfig() {
  const masterKey = process.env.PAYDUNYA_MASTER_KEY?.trim();
  const privateKey = process.env.PAYDUNYA_PRIVATE_KEY?.trim();
  const token = process.env.PAYDUNYA_TOKEN?.trim();

  if (!masterKey || !privateKey || !token) {
    throw new Error("PayDunya n’est pas encore configuré.");
  }

  return {
    masterKey,
    privateKey,
    token,
    siteUrl: SITE_URL,
    baseUrl: PAYDUNYA_API_URL,
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

function payDunyaCheckoutUrlFromResponse(value: string) {
  try {
    const url = new URL(value);
    const isPayDunyaHost = url.hostname === "paydunya.com" || url.hostname.endsWith(".paydunya.com");
    return url.protocol === "https:" && isPayDunyaHost ? url.toString() : "";
  } catch {
    return "";
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safePayDunyaMessage(
  value: unknown,
  config: ReturnType<typeof getConfig>,
  order?: CheckoutOrder,
  additionalSensitiveValues: string[] = [],
) {
  if (typeof value !== "string" || !value.trim()) return "Aucun message exploitable retourné par PayDunya.";

  let message = value.slice(0, 1_000);
  for (const sensitiveValue of [
    config.masterKey,
    config.privateKey,
    config.token,
    ...(order ? [
      `${order.customer_first_name} ${order.customer_last_name}`.trim(),
      order.order_number,
      order.customer_first_name,
      order.customer_last_name,
      order.customer_email ?? "",
      order.customer_phone,
      order.customer_address ?? "",
      order.customer_city ?? "",
      order.customer_note ?? "",
    ] : []),
    ...additionalSensitiveValues,
  ]) {
    if (sensitiveValue.length > 1) {
      message = message.replace(new RegExp(escapeRegExp(sensitiveValue), "gi"), "[EXPURGÉ]");
    }
  }

  return message
    .replace(/https?:\/\/[^\s"'<>]+/gi, "[URL EXPURGÉE]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Z]{2,}/gi, "[EMAIL EXPURGÉ] ")
    .replace(/\b(token|authorization|api[-_ ]?key|secret|card|pan)\s*[:=]\s*[^\s,;]+/gi, "$1=[EXPURGÉ]")
    .replace(/(?:\+?\d[\d\s().-]{5,}\d)/g, "[NUMÉRO EXPURGÉ]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[NUMÉRO EXPURGÉ]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function safeResponseCode(value: unknown) {
  return typeof value === "string" && /^[a-z\d_-]{1,32}$/i.test(value) ? value : null;
}

function payDunyaResponseMessage(payload: PayDunyaCreateResponse) {
  return payload.errors?.description
    ?? payload.errors?.message
    ?? payload.description
    ?? payload.response_text
    ?? "Aucun message exploitable retourné par PayDunya.";
}

function logPayDunyaCreateError(
  paymentMethod: Extract<PaymentMethod, "mobile_money" | "card">,
  httpStatus: number | null,
  responseCode: string | null,
  message: unknown,
  config: ReturnType<typeof getConfig>,
  order: CheckoutOrder,
) {
  console.error("Échec de création de facture PayDunya", {
    phase: "invoice_creation",
    paymentMethod,
    httpStatus,
    responseCode,
    errorMessage: safePayDunyaMessage(message, config, order),
  });
}

export function safePayDunyaErrorName(error: unknown) {
  const name = error instanceof Error ? error.name : "Error";
  return /^[A-Za-z][A-Za-z0-9_.-]{0,39}$/.test(name) ? name : "Error";
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
  let response: Response;
  try {
    response = await fetcher(`${config.baseUrl}/create`, {
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
          channels: paymentMethod === "card" ? ["card"] : ["mtn-benin", "moov-benin", "celtiis-cash"],
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
          callback_url: `${config.siteUrl}/api/paydunya/ipn`,
        },
      }),
      cache: "no-store",
    });
  } catch (error) {
    logPayDunyaCreateError(
      paymentMethod,
      null,
      null,
      error instanceof Error ? error.message : "Échec de connexion à PayDunya.",
      config,
      order,
    );
    throw new Error("Impossible de joindre PayDunya pour créer la facture.");
  }

  const rawBody = await response.text();
  let payload: PayDunyaCreateResponse = {};
  try {
    payload = JSON.parse(rawBody) as PayDunyaCreateResponse;
  } catch {
    logPayDunyaCreateError(paymentMethod, response.status, null, "Réponse non JSON.", config, order);
    throw new Error("PayDunya a retourné une réponse illisible.");
  }

  const responseCode = safeResponseCode(payload.response_code);
  if (!response.ok || payload.response_code !== "00") {
    const errorMessage = payDunyaResponseMessage(payload);
    logPayDunyaCreateError(paymentMethod, response.status, responseCode, errorMessage, config, order);
    throw new Error("PayDunya a refusé la création de la facture.");
  }

  const responseUrl = payload.response_text?.trim() ?? "";
  const responseToken = payload.token?.trim() ?? "";
  const checkoutUrl = payDunyaCheckoutUrlFromResponse(responseUrl);

  console.info("Facture PayDunya créée", {
    phase: "invoice_creation",
    paymentMethod,
    httpStatus: response.status,
    responseCode,
    tokenPresent: Boolean(responseToken),
    checkoutUrlHost: checkoutUrl ? new URL(checkoutUrl).hostname : null,
  });

  if (!responseToken || !checkoutUrl) {
    logPayDunyaCreateError(
      paymentMethod,
      response.status,
      responseCode,
      "Token ou URL de facture manquant.",
      config,
      order,
    );
    throw new Error("PayDunya n’a pas retourné une facture de paiement valide.");
  }

  return { token: responseToken, url: checkoutUrl };
}

export async function verifyPayDunyaPayment(
  invoiceToken: string,
  fetcher: typeof fetch = fetch,
) {
  const token = invoiceToken.trim();
  if (!token) throw new Error("Token PayDunya manquant.");

  const config = getConfig();
  let response: Response;
  try {
    response = await fetcher(`${config.baseUrl}/confirm/${encodeURIComponent(token)}`, {
      method: "GET",
      headers: apiHeaders(config),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Échec de vérification de paiement PayDunya", {
      phase: "payment_confirmation",
      httpStatus: null,
      responseCode: null,
      errorType: safePayDunyaErrorName(error),
    });
    throw new Error("Impossible de vérifier le paiement PayDunya.");
  }

  const rawBody = await response.text();
  let payload: PayDunyaConfirmation = {};
  try {
    payload = JSON.parse(rawBody) as PayDunyaConfirmation;
  } catch {
    console.error("Réponse de vérification PayDunya illisible", {
      phase: "payment_confirmation",
      httpStatus: response.status,
      responseCode: null,
      errorMessage: "Réponse non JSON.",
    });
    throw new Error("La réponse de vérification PayDunya est illisible.");
  }

  const responseCode = safeResponseCode(payload.response_code);
  if (
    !response.ok
    || payload.response_code !== "00"
    || payload.invoice?.token !== token
    || !payload.hash
    || !verifyPayDunyaHash(payload.hash)
  ) {
    console.error("Échec de vérification de paiement PayDunya", {
      phase: "payment_confirmation",
      httpStatus: response.status,
      responseCode,
      errorMessage: "PayDunya n’a pas confirmé la transaction.",
    });
    throw new Error("La transaction PayDunya n’a pas pu être vérifiée.");
  }

  console.info("Paiement PayDunya vérifié", {
    phase: "payment_confirmation",
    httpStatus: response.status,
    responseCode,
    paymentStatus: normalizeStatus(payload.status),
  });

  return {
    token,
    status: normalizeStatus(payload.status),
    totalAmount: Number(payload.invoice.total_amount),
    orderNumber: payload.custom_data?.order_number?.trim() || null,
    currency: payload.custom_data?.currency?.trim().toUpperCase() || null,
    failReason: payload.fail_reason?.trim() || null,
  };
}
