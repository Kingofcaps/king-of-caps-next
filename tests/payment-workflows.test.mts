import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, test } from "node:test";
import { createPayDunyaCheckout, isPayDunyaConfigured, verifyPayDunyaPayment } from "../app/lib/paydunya.ts";
import { processPayDunyaPayment, startOrderPayment } from "../app/lib/payment-workflows.ts";

const originalEnvironment = { ...process.env };

beforeEach(() => {
  process.env.PAYDUNYA_MASTER_KEY = "master-key";
  process.env.PAYDUNYA_PRIVATE_KEY = "private-key";
  delete process.env.PAYDUNYA_PUBLIC_KEY;
  process.env.PAYDUNYA_TOKEN = "application-token";
});

afterEach(() => {
  process.env = { ...originalEnvironment };
});

const checkoutOrder = {
  order_number: "KOC-0001",
  total_amount: 5100,
  customer_first_name: "Awa",
  customer_last_name: "Mensah",
  customer_email: "awa@example.com",
  customer_phone: "97000000",
  customer_address: "12 Rue des Casquettes",
  customer_city: "Cotonou",
  customer_note: "Livrer après 18h",
  items: [
    { product_name: "Produit A", quantity: 1, unit_price: 5000, line_total: 5000 },
    { product_name: "Frais de service", quantity: 1, unit_price: 100, line_total: 100 },
  ],
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

test("la clé publique n’est pas requise pour configurer l’API HTTP/JSON", () => {
  assert.equal(isPayDunyaConfigured(), true);
});

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

test("Mobile Money propose les canaux béninois documentés et conserve le total XOF", async () => {
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

  assert.deepEqual(channels, ["mtn-benin", "moov-benin", "celtiis-cash"]);
  assert.equal(currency, "XOF");
  assert.equal(totalAmount, 5100);
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

test("la carte bancaire utilise uniquement le canal card et conserve le total", async () => {
  let channels: unknown;
  let totalAmount: unknown;
  const checkout = await createPayDunyaCheckout(checkoutOrder, "card", payDunyaFetcher((body) => {
    const invoice = body.invoice as { channels?: unknown; total_amount?: unknown };
    channels = invoice.channels;
    totalAmount = invoice.total_amount;
  }));

  assert.deepEqual(channels, ["card"]);
  assert.equal(totalAmount, 5100);
  assert.match(checkout.url, /^https:\/\/app\.paydunya\.com\//);
});

test("une erreur HTTP PayDunya est journalisée sans secret ni données client", async () => {
  const logged: unknown[][] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => { logged.push(args); };

  try {
    await assert.rejects(
      createPayDunyaCheckout(checkoutOrder, "mobile_money", async () => Response.json({
        response_code: "54",
        description: "Échec pour Awa Mensah, awa@example.com, 97000000, 12 Rue des Casquettes, Cotonou, Livrer après 18h, KOC-0001, carte 4111 1111 1111 1111, master-key application-token",
      }, { status: 422 })),
      /PayDunya a refusé la création de la facture/,
    );
  } finally {
    console.error = originalConsoleError;
  }

  const logText = JSON.stringify(logged);
  assert.match(logText, /invoice_creation/);
  assert.match(logText, /mobile_money/);
  assert.match(logText, /422/);
  assert.match(logText, /54/);
  for (const sensitiveValue of ["Awa Mensah", "awa@example.com", "97000000", "12 Rue des Casquettes", "Cotonou", "Livrer après 18h", "KOC-0001", "4111 1111 1111 1111", "master-key", "application-token"]) {
    assert.equal(logText.includes(sensitiveValue), false);
  }
});

test("une réponse non JSON de PayDunya est distinguée par son statut HTTP", async () => {
  const logged: unknown[][] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => { logged.push(args); };

  try {
    await assert.rejects(
      createPayDunyaCheckout(checkoutOrder, "card", async () => new Response("réponse invalide", { status: 502 })),
      /réponse illisible/,
    );
  } finally {
    console.error = originalConsoleError;
  }

  const logText = JSON.stringify(logged);
  assert.match(logText, /invoice_creation/);
  assert.match(logText, /card/);
  assert.match(logText, /502/);
  assert.match(logText, /responseCode\\?":null/);
  assert.equal(logText.includes("réponse invalide"), false);
});

test("une erreur réseau de création est expurgée et marquée sans statut HTTP", async () => {
  const logged: unknown[][] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => { logged.push(args); };

  try {
    await assert.rejects(
      createPayDunyaCheckout(checkoutOrder, "card", async () => {
        throw new Error("Échec pour awa@example.com, téléphone 97000000, clé master-key");
      }),
      /Impossible de joindre PayDunya/,
    );
  } finally {
    console.error = originalConsoleError;
  }

  const logText = JSON.stringify(logged);
  assert.match(logText, /invoice_creation/);
  assert.match(logText, /card/);
  assert.match(logText, /null/);
  for (const sensitiveValue of ["awa@example.com", "97000000", "master-key"]) {
    assert.equal(logText.includes(sensitiveValue), false);
  }
});

test("un échec après redirection journalise seulement le statut HTTP et le code fournisseur", async () => {
  const logged: unknown[][] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => { logged.push(args); };

  try {
    await assert.rejects(
      verifyPayDunyaPayment("invoice-secret-token", async () => Response.json({
        response_code: "58",
        response_text: "Échec KOC-0001 pour awa@example.com, 97000000, token invoice-secret-token",
      }, { status: 402 })),
      /n’a pas pu être vérifiée/,
    );
  } finally {
    console.error = originalConsoleError;
  }

  const logText = JSON.stringify(logged);
  assert.match(logText, /payment_confirmation/);
  assert.match(logText, /402/);
  assert.match(logText, /58/);
  for (const sensitiveValue of ["invoice-secret-token", "KOC-0001", "awa@example.com", "97000000"]) {
    assert.equal(logText.includes(sensitiveValue), false);
  }
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
