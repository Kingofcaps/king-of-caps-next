import assert from "node:assert/strict";
import test from "node:test";
import { PayDunyaInvoiceError } from "../app/lib/paydunya.ts";
import {
  CHECKOUT_PUBLIC_ERROR_MESSAGE,
  logCheckoutDiagnostic,
  newCheckoutCorrelationId,
  runCheckoutDiagnosticStage,
  safeCheckoutErrorDetails,
} from "../app/lib/checkout-diagnostics.ts";
import {
  requireSupabaseServerKey,
  SupabaseServerError,
  supabaseServerErrorFromResponse,
} from "../app/lib/supabase-server.ts";

function captureCheckoutLogs<T>(operation: () => Promise<T> | T) {
  const logs: unknown[][] = [];
  const originalInfo = console.info;
  const originalError = console.error;
  console.info = (...args: unknown[]) => { logs.push(args); };
  console.error = (...args: unknown[]) => { logs.push(args); };

  return Promise.resolve()
    .then(operation)
    .then((result) => ({ result, logs }))
    .finally(() => {
      console.info = originalInfo;
      console.error = originalError;
    });
}

function eventEntries(logs: unknown[][]) {
  return logs
    .filter((args) => args[0] === "checkout_diagnostic")
    .map((args) => args[1] as Record<string, unknown>);
}

test("journalise les onze étapes requises avec correlation ID et méthode", async () => {
  const correlationId = newCheckoutCorrelationId();
  const context = { correlationId, paymentMethod: "mobile_money" as const };
  const { logs } = await captureCheckoutLogs(async () => {
    logCheckoutDiagnostic({ ...context, event: "order_received" });
    logCheckoutDiagnostic({ ...context, event: "order_validation", httpStatus: 200 });

    await runCheckoutDiagnosticStage(context, {
      started: "paydunya_invoice_creation_started",
      succeeded: "paydunya_invoice_creation_success",
      failed: "paydunya_invoice_creation_failed",
    }, async () => ({ httpStatus: 200, responseCode: "00" }), (result) => ({
      httpStatus: result.httpStatus,
      errorCode: result.responseCode,
    }));

    await runCheckoutDiagnosticStage(context, {
      started: "supabase_order_insert_started",
      succeeded: "supabase_order_insert_success",
      failed: "supabase_order_insert_failed",
    }, async () => ({ httpStatus: 201 }), (result) => ({ httpStatus: result.httpStatus }));

    await runCheckoutDiagnosticStage(context, {
      started: "stock_reservation_started",
      succeeded: "stock_reservation_success",
      failed: "stock_reservation_failed",
    }, async () => ({ httpStatus: 200 }), (result) => ({ httpStatus: result.httpStatus }));

    logCheckoutDiagnostic({ ...context, event: "order_completed", httpStatus: 200 });
  });

  const entries = eventEntries(logs);
  const expected = [
    "order_received",
    "order_validation",
    "paydunya_invoice_creation_started",
    "paydunya_invoice_creation_success",
    "supabase_order_insert_started",
    "supabase_order_insert_success",
    "stock_reservation_started",
    "stock_reservation_success",
    "order_completed",
  ];
  assert.deepEqual(entries.map((entry) => entry.event), expected);
  for (const entry of entries) {
    assert.equal(entry.correlationId, correlationId);
    assert.equal(entry.paymentMethod, "mobile_money");
    assert.ok("httpStatus" in entry);
    assert.ok("errorCode" in entry);
    assert.ok("errorMessage" in entry);
  }
  assert.equal(entries.find((entry) => entry.event === "paydunya_invoice_creation_success")?.errorCode, "00");
  assert.equal(entries.find((entry) => entry.event === "supabase_order_insert_success")?.httpStatus, 201);
});

test("classifie les erreurs Supabase sans recopier leur texte brut", () => {
  const cases = [
    [new SupabaseServerError(401, "PGRST303"), 401, "PGRST303", "Supabase authentication failed."],
    [new SupabaseServerError(403, "42501"), 403, "42501", "Supabase denied the requested operation or database privilege."],
    [new SupabaseServerError(404, "PGRST205"), 404, "PGRST205", "Supabase could not resolve the requested table, column, relationship, or function."],
    [new SupabaseServerError(409, "23505"), 409, "23505", "Supabase rejected the database operation."],
  ] as const;

  for (const [error, httpStatus, errorCode, errorMessage] of cases) {
    assert.deepEqual(safeCheckoutErrorDetails(error), { httpStatus, errorCode, errorMessage });
  }
});

test("parse les réponses HTTP PostgREST sans conserver leur message potentiellement personnel", async () => {
  const authError = await supabaseServerErrorFromResponse(Response.json({
    code: "PGRST303",
    message: "JWT invalid for client@example.com with phone 12345678 and request secret-token",
    details: "customer name and address",
  }, { status: 401 }));
  const schemaError = await supabaseServerErrorFromResponse(Response.json({
    code: "PGRST205",
    message: "Could not find table private_customer_data",
  }, { status: 404 }));
  const privilegeError = await supabaseServerErrorFromResponse(Response.json({
    code: "42501",
    message: "permission denied for customer table",
  }, { status: 403 }));
  const rlsError = await supabaseServerErrorFromResponse(Response.json({
    code: "42501",
    message: "new row violates row-level security policy for table orders",
    details: "customer private data must never be logged",
  }, { status: 403 }));
  const stockError = await supabaseServerErrorFromResponse(Response.json({
    code: "P0001",
    message: "Stock insuffisant pour le produit White Sox Adjustable; customer private data",
  }, { status: 400 }));

  assert.equal(authError.category, "authentication");
  assert.equal(authError.httpStatus, 401);
  assert.equal(authError.errorCode, "PGRST303");
  assert.equal(authError.message.includes("client@example.com"), false);
  assert.equal(authError.message.includes("secret-token"), false);
  assert.equal(schemaError.category, "schema_or_function");
  assert.equal(schemaError.httpStatus, 404);
  assert.equal(privilegeError.category, "policy_or_privilege");
  assert.equal(privilegeError.httpStatus, 403);
  assert.equal(rlsError.category, "rls");
  assert.equal(rlsError.message.includes("customer private data"), false);
  assert.equal(stockError.category, "stock");
  assert.equal(stockError.errorCode, "P0001");
  assert.equal(stockError.message.includes("White Sox"), false);
});

test("refuse une clé serveur absente ou un JWT utilisateur sans révéler la clé", () => {
  assert.throws(() => requireSupabaseServerKey(undefined), (error: unknown) => {
    assert.ok(error instanceof SupabaseServerError);
    assert.equal(error.errorCode, "SUPABASE_CONFIGURATION_MISSING");
    return true;
  });

  const userJwt = "header.eyJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.signature-do-not-log";
  assert.throws(() => requireSupabaseServerKey(userJwt), (error: unknown) => {
    assert.ok(error instanceof SupabaseServerError);
    assert.equal(error.errorCode, "SUPABASE_KEY_FORMAT_INVALID");
    assert.equal(error.message.includes(userJwt), false);
    return true;
  });
});

test("journalise les échecs PayDunya, Supabase et stock sans données sensibles", async () => {
  const correlationId = newCheckoutCorrelationId();
  const context = { correlationId, paymentMethod: "card" as const };
  const sensitiveValues = [
    "Awa Mensah",
    "awa@example.com",
    "+2290150687515",
    "12 Rue des Casquettes",
    "4111111111111111",
    "sb_secret_never-log-this",
    "invoice-token-never-log-this",
  ];
  const { logs } = await captureCheckoutLogs(async () => {
    const failures: Array<{ event: string; error: Error }> = [
      { event: "paydunya_invoice_creation_failed", error: new PayDunyaInvoiceError("rejected", 422, "54") },
      { event: "supabase_order_insert_failed", error: new SupabaseServerError(401, "PGRST303") },
      { event: "supabase_order_readback_failed", error: new SupabaseServerError(404, "PGRST205") },
      { event: "stock_reservation_failed", error: new SupabaseServerError(409, "23503") },
      { event: "stock_reservation_failed", error: Object.assign(new Error(sensitiveValues.join(" ")), { name: "InsufficientStockError" }) },
    ];

    for (const failure of failures) {
      await assert.rejects(
        runCheckoutDiagnosticStage(context, {
          started: `${failure.event}_started`,
          succeeded: `${failure.event}_success`,
          failed: failure.event,
        }, async () => { throw failure.error; }),
      );
    }
  });

  const entries = eventEntries(logs).filter((entry) => String(entry.event).endsWith("_failed"));
  assert.equal(entries.length, 5);
  assert.deepEqual(entries.slice(0, 4).map((entry) => entry.event), [
    "paydunya_invoice_creation_failed",
    "supabase_order_insert_failed",
    "supabase_order_readback_failed",
    "stock_reservation_failed",
  ]);
  assert.deepEqual(entries.map((entry) => entry.errorCode), ["54", "PGRST303", "PGRST205", "23503", "INSUFFICIENT_STOCK"]);
  const serialized = JSON.stringify(entries);
  for (const sensitiveValue of sensitiveValues) assert.equal(serialized.includes(sensitiveValue), false);
});

test("les erreurs internes gardent le message générique prévu pour le client", () => {
  const internalError = new Error("Awa Mensah awa@example.com +2290150687515 sb_secret_private");
  const safeDetails = safeCheckoutErrorDetails(internalError);

  assert.equal(CHECKOUT_PUBLIC_ERROR_MESSAGE, "Impossible de finaliser la commande ou de créer la facture.");
  assert.equal(safeDetails.errorMessage, "An internal checkout step failed.");
  for (const value of ["Awa Mensah", "awa@example.com", "+2290150687515", "sb_secret_private"]) {
    assert.equal(safeDetails.errorMessage.includes(value), false);
  }
});
