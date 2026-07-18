import type { Order } from "./orders";
import { createHmac, timingSafeEqual } from "node:crypto";

type FedaPayTransaction = {
  id: number;
  status?: string;
  merchant_reference?: string;
};
type FedaPayToken = { url: string };
type CheckoutOrder = Pick<
  Order,
  | "order_number"
  | "total_amount"
  | "customer_first_name"
  | "customer_last_name"
  | "customer_email"
  | "customer_phone"
>;

export type FedaPayWebhookEvent = {
  id?: string | number;
  name?: string;
  type?: string;
  object_id?: string | number;
  entity?: { id?: string | number };
};

export const ONLINE_PAYMENT_UNAVAILABLE_MESSAGE = "Le paiement en ligne est temporairement indisponible. Choisissez le paiement à la livraison.";

export function isFedaPayConfigured() {
  return Boolean(
    process.env.FEDAPAY_SECRET_KEY?.trim()
    && process.env.FEDAPAY_WEBHOOK_SECRET?.trim()
    && process.env.NEXT_PUBLIC_SITE_URL?.trim(),
  );
}

function getConfig() {
  const apiKey = process.env.FEDAPAY_SECRET_KEY;
  const environment = process.env.FEDAPAY_ENVIRONMENT === "live" ? "live" : "sandbox";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!apiKey || !siteUrl) throw new Error("FedaPay n’est pas encore configuré.");

  return {
    apiKey,
    baseUrl: environment === "live" ? "https://api.fedapay.com" : "https://sandbox-api.fedapay.com",
    siteUrl: siteUrl.replace(/\/$/, ""),
  };
}

function unwrapTransaction(payload: FedaPayTransaction | { "v1/transaction"?: FedaPayTransaction }): FedaPayTransaction | undefined {
  return (payload as { "v1/transaction"?: FedaPayTransaction })["v1/transaction"]
    ?? (payload as FedaPayTransaction);
}

function unwrapToken(payload: FedaPayToken | { token?: FedaPayToken }): FedaPayToken | undefined {
  return typeof (payload as { token?: FedaPayToken }).token === "object"
    ? (payload as { token?: FedaPayToken }).token
    : (payload as FedaPayToken);
}

export async function createFedaPayCheckout(order: CheckoutOrder) {
  const { apiKey, baseUrl, siteUrl } = getConfig();
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  const transactionResponse = await fetch(`${baseUrl}/v1/transactions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      description: `Commande King Of Caps ${order.order_number}`,
      amount: order.total_amount,
      currency: { iso: "XOF" },
      callback_url: `${siteUrl}/checkout/success`,
      merchant_reference: order.order_number,
      custom_metadata: { order_number: order.order_number },
      customer: {
        firstname: order.customer_first_name,
        lastname: order.customer_last_name,
        email: order.customer_email ?? undefined,
        phone_number: { number: order.customer_phone, country: "bj" },
      },
    }),
  });

  if (!transactionResponse.ok) throw new Error("Impossible de créer la transaction FedaPay.");
  const transaction = unwrapTransaction((await transactionResponse.json()) as FedaPayTransaction | { "v1/transaction"?: FedaPayTransaction });
  if (!transaction?.id) throw new Error("FedaPay n’a pas retourné d’identifiant de transaction.");
  const tokenResponse = await fetch(`${baseUrl}/v1/transactions/${transaction.id}/token`, {
    method: "POST",
    headers,
  });
  if (!tokenResponse.ok) throw new Error("Impossible de créer le lien FedaPay.");
  const token = unwrapToken((await tokenResponse.json()) as FedaPayToken | { token?: FedaPayToken });
  if (!token?.url) throw new Error("FedaPay n’a pas retourné d’URL de paiement.");
  return { transactionId: String(transaction.id), url: token.url };
}

export async function verifyFedaPayTransaction(transactionId: string | number) {
  const { apiKey, baseUrl } = getConfig();
  const response = await fetch(`${baseUrl}/v1/transactions/${transactionId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Impossible de vérifier la transaction FedaPay.");
  const transaction = unwrapTransaction((await response.json()) as FedaPayTransaction | { "v1/transaction"?: FedaPayTransaction });
  return {
    id: String(transaction?.id ?? transactionId),
    status: transaction?.status,
    merchantReference: transaction?.merchant_reference,
  };
}

export function verifyFedaPayWebhook(rawBody: string, signature: string) {
  const webhookSecret = process.env.FEDAPAY_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) throw new Error("Le secret du webhook FedaPay n’est pas configuré.");

  const signatureParts = signature.split(",").map((part) => part.trim());
  const timestamp = Number(signatureParts.find((part) => part.startsWith("t="))?.slice(2));
  const signatures = signatureParts
    .filter((part) => part.startsWith("s="))
    .map((part) => part.slice(2));

  if (!Number.isInteger(timestamp) || signatures.length === 0) {
    throw new Error("En-tête de signature FedaPay invalide.");
  }
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) {
    throw new Error("Signature FedaPay expirée.");
  }

  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureIsValid = signatures.some((candidate) => {
    if (!/^[a-f\d]{64}$/i.test(candidate)) return false;
    const candidateBuffer = Buffer.from(candidate, "hex");
    return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
  });
  if (!signatureIsValid) throw new Error("Signature FedaPay invalide.");

  return JSON.parse(rawBody) as FedaPayWebhookEvent;
}
