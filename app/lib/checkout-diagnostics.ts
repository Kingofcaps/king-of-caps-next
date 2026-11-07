import { randomUUID } from "node:crypto";
import { PayDunyaInvoiceError } from "./paydunya.ts";
import { SupabaseServerError } from "./supabase-server.ts";
import type { PaymentMethod } from "./orders.ts";

type PaymentMethodOrUnknown = PaymentMethod | "unknown";

type CheckoutDiagnosticEvent = {
  correlationId: string;
  event: string;
  paymentMethod: PaymentMethodOrUnknown;
  recipient?: "admin" | "customer";
  httpStatus?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

type CheckoutStageEvents = {
  started: string;
  succeeded: string;
  failed: string;
};

export const CHECKOUT_PUBLIC_ERROR_MESSAGE = "Impossible de finaliser la commande ou de créer la facture.";

export function newCheckoutCorrelationId() {
  return randomUUID();
}

export function logCheckoutDiagnostic(event: CheckoutDiagnosticEvent) {
  const entry = {
    correlationId: event.correlationId,
    event: event.event,
    paymentMethod: event.paymentMethod,
    ...(event.recipient ? { recipient: event.recipient } : {}),
    httpStatus: event.httpStatus ?? null,
    errorCode: event.errorCode ?? null,
    errorMessage: event.errorMessage ?? null,
  };

  if (event.event.endsWith("_failed")) {
    console.error("checkout_diagnostic", entry);
  } else {
    console.info("checkout_diagnostic", entry);
  }
}

export function safeCheckoutErrorDetails(error: unknown) {
  if (error instanceof PayDunyaInvoiceError) {
    return {
      httpStatus: error.httpStatus,
      errorCode: error.responseCode && error.responseCode !== "00"
        ? error.responseCode
        : `PAYDUNYA_${error.category.toUpperCase()}`,
      errorMessage: error.message,
    };
  }

  if (error instanceof SupabaseServerError) {
    return {
      httpStatus: error.httpStatus,
      errorCode: error.errorCode ?? `SUPABASE_${error.category.toUpperCase()}`,
      errorMessage: error.message,
    };
  }

  if (error instanceof Error && error.name === "InsufficientStockError") {
    return {
      httpStatus: 409,
      errorCode: "INSUFFICIENT_STOCK",
      errorMessage: "Stock is insufficient for this order.",
    };
  }

  return {
    httpStatus: null,
    errorCode: "INTERNAL_ERROR",
    errorMessage: "An internal checkout step failed.",
  };
}

export async function runCheckoutDiagnosticStage<T>(
  context: { correlationId: string; paymentMethod: PaymentMethodOrUnknown },
  events: CheckoutStageEvents,
  operation: () => Promise<T>,
  successMetadata?: (result: T) => { httpStatus?: number | null; errorCode?: string | null },
) {
  logCheckoutDiagnostic({ ...context, event: events.started });
  try {
    const result = await operation();
    logCheckoutDiagnostic({
      ...context,
      event: events.succeeded,
      ...successMetadata?.(result),
    });
    return result;
  } catch (error) {
    logCheckoutDiagnostic({
      ...context,
      event: events.failed,
      ...safeCheckoutErrorDetails(error),
    });
    throw error;
  }
}
