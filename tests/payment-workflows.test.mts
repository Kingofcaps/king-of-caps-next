import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, test } from "node:test";
import { createPayDunyaCheckout, verifyPayDunyaPayment } from "../app/lib/paydunya.ts";
import { processPayDunyaPayment, startOrderPayment } from "../app/lib/payment-workflows.ts";

const originalEnvironment = { ...process.env };

beforeEach(() => {
  process.env.PAYDUNYA_MASTER_KEY = "master-key";
  process.env.PAYDUNYA_PRIVATE_KEY = "private-key";
  process.env.PAYDUNYA_PUBLIC_KEY = "public-key";
  process.env.PAYDUNYA_TOKEN = "application-token";
});

afterEach(() => {
  process.env = { ...originalEnvironment };
});

const checkoutOrder = {
  order_number: "KOC-0001",
  total_amount: 5000,
  customer_first_name: "Awa",
  customer_last_name: "Mensah",
  customer_email: "awa@example.com",
  customer_phone: "97000000",
  items: [{ product_name: "Produit A", quantity: 1, unit_price: 5000, line_total: 5000 }],
};

function payDunyaFetcher(onBody: (body: Record<string, unknown>) => void) {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    assert.equal(String(input), "https://app.paydunya.com/api/v1/checkout-invoice/create");
    assert.equal(init?.method, "POST");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("PAYDUNYA-MASTER-KEY"), "master-key");
    assert.equal(headers.get("PAYDUNYA-PRIVATE-KEY"), "private-key");
    assert.equal(headers.get("PAYDUNYA-TOKEN"), "application-token");
    assert.equal(headers.get("PAYDUNYA-PUBLIC-KEY"), null);
    onBody(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return Response.json({
      response_code: "00",
      response_text: "https://app.paydunya.com/payment/session/test-token?locale=fr",
      token: "test-token",
    });
  }) as typeof fetch;
}

test("paiement à la livraison crée la commande, réserve le stock et notifie", async () => {
  const calls: string[] = [];
  const order = { id: "order-cash" };

  const result = await startOrderPayment("cash_on_delivery", {
    createCashOnDeliveryOrder: async () => { calls.push("create"); return order; },
    reserveCashOnDeliveryStock: async () => { calls.push("stock"); },
    notifyCashOnDelivery: async () => { calls.push("notify"); },
    createOnlineInvoice: async () => { throw new Error("PayDunya ne doit pas être appelé."); },
    createAwaitingPaymentOrder: async () => { throw new Error("Commande en attente inattendue."); },
    reserveOnlineStock: async () => { throw new Error("Réservation en ligne inattendue."); },
  });

  assert.equal(result.kind, "cash_on_delivery");
  assert.deepEqual(calls, ["create", "stock", "notify"]);
});

test("Mobile Money crée une facture PayDunya puis utilise son URL sécurisée", async () => {
  let channels: unknown;
  let currency: unknown;
  let totalAmount: unknown;
  let actions: unknown;
  const checkout = await createPayDunyaCheckout(checkoutOrder, "mobile_money", payDunyaFetcher((body) => {
    channels = (body.invoice as { channels?: unknown }).channels;
    totalAmount = (body.invoice as { total_amount?: unknown }).total_amount;
    currency = (body.custom_data as { currency?: unknown }).currency;
    actions = body.actions;
  }));

  assert.deepEqual(channels, ["mtn-benin", "moov-benin"]);
  assert.equal(currency, "XOF");
  assert.equal(totalAmount, 5000);
  assert.deepEqual(actions, {
    cancel_url: "https://kingofcaps.bj/api/payments/paydunya/cancel",
    return_url: "https://kingofcaps.bj/api/payments/paydunya/return",
    callback_url: "https://kingofcaps.bj/api/paydunya/ipn",
  });
  assert.equal(checkout.url, "https://app.paydunya.com/payment/session/test-token?locale=fr");
});

test("l’URL de paiement retournée par PayDunya est conservée sans reconstruction", async () => {
  const returnedUrl = "https://paydunya.com/payment/session/live-token?locale=fr";
  const checkout = await createPayDunyaCheckout(checkoutOrder, "mobile_money", (async () => Response.json({
    response_code: "00",
    response_text: returnedUrl,
    description: "Checkout Invoice Created",
    token: "live-token",
  })) as typeof fetch);

  assert.equal(checkout.url, returnedUrl);
});

test("la carte bancaire utilise la même page sécurisée PayDunya", async () => {
  let channels: unknown;
  const checkout = await createPayDunyaCheckout(checkoutOrder, "card", payDunyaFetcher((body) => {
    channels = (body.invoice as { channels?: unknown }).channels;
  }));

  assert.deepEqual(channels, ["card"]);
  assert.match(checkout.url, /^https:\/\/app\.paydunya\.com\//);
});

test("la confirmation PayDunya vérifie le token, le montant et la devise XOF", async () => {
  const hash = createHash("sha512").update("master-key").digest("hex");
  const payment = await verifyPayDunyaPayment("test-token", (async (input: string | URL | Request) => {
    assert.equal(String(input), "https://app.paydunya.com/api/v1/checkout-invoice/confirm/test-token");
    return Response.json({
      response_code: "00",
      hash,
      invoice: { token: "test-token", total_amount: 5000 },
      custom_data: { order_number: "KOC-0001", currency: "XOF" },
      status: "completed",
    });
  }) as typeof fetch);

  assert.deepEqual(payment, {
    token: "test-token",
    status: "completed",
    totalAmount: 5000,
    orderNumber: "KOC-0001",
    currency: "XOF",
    failReason: null,
  });
});

test("aucun e-mail n'est envoyé avant la confirmation PayDunya", async () => {
  let notifications = 0;
  let reservations = 0;
  const result = await startOrderPayment("mobile_money", {
    createCashOnDeliveryOrder: async () => ({ id: "cash" }),
    reserveCashOnDeliveryStock: async () => {},
    notifyCashOnDelivery: async () => { notifications += 1; },
    createOnlineInvoice: async () => ({ token: "token-1", url: "https://app.paydunya.com/checkout/invoice/token-1" }),
    createAwaitingPaymentOrder: async (token) => ({ id: "online", token }),
    reserveOnlineStock: async () => { reservations += 1; },
  });

  assert.equal(result.kind, "online");
  assert.equal(notifications, 0);
  assert.equal(reservations, 1);
});

test("une transaction confirmée déclenche une seule notification", async () => {
  let approvals = 0;
  let notifications = 0;
  const order = { id: "paid-order" };
  const services = {
    verifyPayment: async () => ({ status: "completed" as const }),
    approveOrder: async () => ({ processed: approvals++ === 0, order }),
    failOrder: async () => ({ processed: false, order }),
    claimNotifications: async () => true,
    sendNotifications: async () => { notifications += 1; },
  };

  await processPayDunyaPayment("token-2", services);
  await processPayDunyaPayment("token-2", services);

  assert.equal(approvals, 2);
  assert.equal(notifications, 1);
});

test("une transaction échouée ne réduit pas définitivement le stock", async () => {
  let stock = 4;
  let failures = 0;
  const order = { id: "failed-order" };
  stock -= 1;

  const result = await processPayDunyaPayment("token-3", {
    verifyPayment: async () => ({ status: "failed" as const }),
    approveOrder: async () => { stock -= 1; return { processed: true, order }; },
    failOrder: async () => { failures += 1; stock += 1; return { processed: true, order }; },
    claimNotifications: async () => true,
    sendNotifications: async () => {},
  });

  assert.equal(result.status, "failed");
  assert.equal(failures, 1);
  assert.equal(stock, 4);
});

test("une facture PayDunya expirée est traitée comme un échec", async () => {
  const response = await verifyPayDunyaPayment("token-expired", async () => new Response(JSON.stringify({
    response_code: "00",
    hash: createHash("sha512").update("master-key").digest("hex"),
    invoice: { token: "token-expired", total_amount: 15000 },
    custom_data: { order_number: "KOC-EXP", currency: "XOF" },
    status: "expired",
  }), { status: 200 }));

  assert.equal(response.status, "failed");
});
