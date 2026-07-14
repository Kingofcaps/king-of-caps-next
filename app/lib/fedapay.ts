import type { Order } from "./orders";

type FedaPayTransaction = { id: number };
type FedaPayToken = { url: string };

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

export async function createFedaPayCheckout(order: Order) {
  const { apiKey, baseUrl, siteUrl } = getConfig();
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  const transactionResponse = await fetch(`${baseUrl}/v1/transactions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      description: `Commande King Of Caps ${order.order_number}`,
      amount: order.total_amount,
      currency: { iso: "XOF" },
      callback_url: `${siteUrl}/commande-confirmee/${encodeURIComponent(order.order_number)}`,
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
  const transaction = (await transactionResponse.json()) as FedaPayTransaction;
  const tokenResponse = await fetch(`${baseUrl}/v1/transactions/${transaction.id}/token`, {
    method: "POST",
    headers,
  });
  if (!tokenResponse.ok) throw new Error("Impossible de créer le lien FedaPay.");
  return (await tokenResponse.json()) as FedaPayToken;
}

export async function verifyFedaPayTransaction(transactionId: string | number) {
  const { apiKey, baseUrl } = getConfig();
  const response = await fetch(`${baseUrl}/v1/transactions/${transactionId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Impossible de vérifier la transaction FedaPay.");
  return (await response.json()) as { status?: string; merchant_reference?: string };
}
