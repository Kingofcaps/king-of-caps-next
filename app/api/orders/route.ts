import { NextResponse } from "next/server";
import {
  createPayDunyaCheckout,
  isPayDunyaConfigured,
  isPayDunyaOnlinePaymentsEnabled,
  ONLINE_PAYMENT_UNAVAILABLE_MESSAGE,
} from "@/app/lib/paydunya";
import { notifyNewOrder, sendCustomerOrderConfirmation } from "@/app/lib/order-notifications";
import { isOnlinePaymentMethod, startOrderPayment } from "@/app/lib/payment-workflows";
import { SERVICE_FEE_XOF, calculateCheckoutTotals, payDunyaTotalWithServiceFee } from "@/app/lib/checkout-pricing";
import {
  createOrderWithItems,
  createOrderNumber,
  getOrder,
  getOrderByCheckoutId,
  reserveOrderStock,
  updateOrder,
  type PaymentMethod,
} from "@/app/lib/orders";
import { getProductPrice, isCurrency, type Currency } from "@/app/lib/currency";
import { getRequestCurrency } from "@/app/lib/currency-server";
import { InsufficientStockError, getProduct } from "@/app/lib/products";
import { isValidEmail } from "@/app/lib/validation";
import {
  CHECKOUT_PUBLIC_ERROR_MESSAGE,
  logCheckoutDiagnostic,
  newCheckoutCorrelationId,
  runCheckoutDiagnosticStage,
  safeCheckoutErrorDetails,
} from "@/app/lib/checkout-diagnostics";

export const runtime = "nodejs";

type OrderRequest = {
  productId?: unknown;
  items?: unknown;
  checkoutId?: unknown;
  quantity?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  email?: unknown;
  address?: unknown;
  city?: unknown;
  note?: unknown;
  paymentMethod?: unknown;
  currency?: unknown;
};

type RequestedItem = { productId?: unknown; quantity?: unknown };

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "cash_on_delivery" || value === "mobile_money" || value === "card";
}

function requestedItems(body: OrderRequest) {
  const candidates: RequestedItem[] = Array.isArray(body.items)
    ? body.items.filter((item): item is RequestedItem => Boolean(item) && typeof item === "object")
    : [{ productId: body.productId, quantity: body.quantity }];
  const quantities = new Map<string, number>();
  for (const candidate of candidates) {
    const productId = text(candidate.productId);
    const quantity = Number(candidate.quantity);
    if (!productId || !Number.isInteger(quantity) || quantity < 1) return null;
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }
  if (quantities.size < 1 || quantities.size > 50) return null;
  return Array.from(quantities, ([productId, quantity]) => ({ productId, quantity }));
}

export async function POST(request: Request) {
  const correlationId = newCheckoutCorrelationId();
  let paymentMethod: PaymentMethod | "unknown" = "unknown";
  let body: OrderRequest;

  try {
    body = (await request.json()) as OrderRequest;
    if (!body || typeof body !== "object") throw new Error("invalid_json");
  } catch {
    logCheckoutDiagnostic({ correlationId, event: "order_received", paymentMethod });
    logCheckoutDiagnostic({
      correlationId,
      event: "order_validation_failed",
      paymentMethod,
      httpStatus: 400,
      errorCode: "INVALID_JSON",
      errorMessage: "The request body is invalid.",
    });
    return NextResponse.json({ success: false, error: "Veuillez compléter tous les champs obligatoires." }, { status: 400 });
  }

  paymentMethod = validPaymentMethod(body.paymentMethod) ? body.paymentMethod : "unknown";
  const diagnosticContext = { correlationId, paymentMethod };
  logCheckoutDiagnostic({ correlationId, event: "order_received", paymentMethod });

  const validationFailure = (errorCode: string, errorMessage: string, clientMessage: string, status = 400) => {
    logCheckoutDiagnostic({
      correlationId,
      event: "order_validation_failed",
      paymentMethod,
      httpStatus: status,
      errorCode,
      errorMessage,
    });
    return NextResponse.json({ success: false, error: clientMessage }, { status });
  };

  try {
    const items = requestedItems(body);
    const checkoutId = text(body.checkoutId);
    const firstName = text(body.firstName);
    const lastName = text(body.lastName);
    const phone = text(body.phone);
    const email = text(body.email).toLowerCase();
    const address = text(body.address);
    const city = text(body.city);
    const currency: Currency = isCurrency(body.currency) ? body.currency.toUpperCase() as Currency : await getRequestCurrency();

    if (!items || !checkoutId || checkoutId.length > 100 || !firstName || !lastName || !phone || !email || !address || !city || !validPaymentMethod(body.paymentMethod)) {
      return validationFailure("INVALID_ORDER_FIELDS", "Required order fields are missing or invalid.", "Veuillez compléter tous les champs obligatoires.");
    }
    if (!isValidEmail(email)) {
      return validationFailure("INVALID_EMAIL", "The email address is invalid.", "Veuillez saisir une adresse e-mail valide.");
    }

    logCheckoutDiagnostic({
      correlationId,
      event: "order_validation",
      paymentMethod,
      httpStatus: 200,
    });

    const isOnlinePayment = isOnlinePaymentMethod(body.paymentMethod);
    if (isOnlinePayment && !isPayDunyaOnlinePaymentsEnabled()) {
      logCheckoutDiagnostic({
        correlationId,
        event: "paydunya_configuration_failed",
        paymentMethod,
        httpStatus: 503,
        errorCode: "PAYDUNYA_PAYMENTS_SUSPENDED",
        errorMessage: "PayDunya online payments are temporarily suspended.",
      });
      return NextResponse.json(
        { success: false, error: ONLINE_PAYMENT_UNAVAILABLE_MESSAGE },
        { status: 503 },
      );
    }
    if (isOnlinePayment && !isPayDunyaConfigured()) {
      logCheckoutDiagnostic({
        correlationId,
        event: "paydunya_configuration_failed",
        paymentMethod,
        httpStatus: 503,
        errorCode: "PAYDUNYA_CONFIGURATION_MISSING",
        errorMessage: "Required server-side PayDunya configuration is unavailable.",
      });
      return NextResponse.json(
        { success: false, error: ONLINE_PAYMENT_UNAVAILABLE_MESSAGE },
        { status: 503 },
      );
    }

    try {
      const existingOrder = await runCheckoutDiagnosticStage(diagnosticContext, {
        started: "supabase_checkout_lookup_started",
        succeeded: "supabase_checkout_lookup_success",
        failed: "supabase_checkout_lookup_failed",
      }, () => getOrderByCheckoutId(checkoutId));
      if (existingOrder) {
        if (existingOrder.payment_method === "cash_on_delivery" && existingOrder.stock_reserved_at) {
          return NextResponse.json({ success: true, orderNumber: existingOrder.order_number });
        }
        if (existingOrder.paydunya_token && existingOrder.order_status === "awaiting_payment" && existingOrder.stock_reserved_at) {
          return NextResponse.json({ success: false, error: "Une tentative de paiement PayDunya est déjà en cours pour cette commande." }, { status: 409 });
        }
        return NextResponse.json({ success: false, error: "Cette tentative de commande a déjà été traitée." }, { status: 409 });
      }

      const products = await runCheckoutDiagnosticStage(diagnosticContext, {
        started: "supabase_product_lookup_started",
        succeeded: "supabase_product_lookup_success",
        failed: "supabase_product_lookup_failed",
      }, () => Promise.all(items.map(async (item) => ({ ...item, product: await getProduct(item.productId) }))));
      const orderItems = products.map(({ product, productId, quantity }) => {
        if (!product || product.id !== productId || !product.inStock || product.stockQuantity < quantity) {
          throw new InsufficientStockError();
        }
        const unitPrice = getProductPrice(product, currency);
        if (!unitPrice) throw new Error("Le prix d’un produit est invalide.");
        return {
          product_id: product.id,
          product_name: product.name,
          product_image: product.image,
          unit_price: unitPrice,
          quantity,
          line_total: unitPrice * quantity,
          currency,
        };
      });
      const payDunyaItems = products.map(({ product, productId, quantity }) => {
        if (!product || product.id !== productId) throw new Error("Produit introuvable.");
        return {
          product_name: product.name,
          quantity,
          unit_price: product.priceXof,
          line_total: product.priceXof * quantity,
        };
      });
      const subtotalAmount = orderItems.reduce((total, item) => total + item.line_total, 0);
      const { serviceFee, total: totalAmount } = calculateCheckoutTotals(subtotalAmount, currency);
      const payDunyaSubtotalAmount = payDunyaItems.reduce((total, item) => total + item.line_total, 0);
      const payDunyaTotalAmount = payDunyaTotalWithServiceFee(payDunyaSubtotalAmount);
      const payDunyaInvoiceItems = [
        ...payDunyaItems,
        {
          product_name: "Frais de service",
          quantity: 1,
          unit_price: SERVICE_FEE_XOF,
          line_total: SERVICE_FEE_XOF,
        },
      ];
      const firstItem = orderItems[0];

      const orderNumber = await runCheckoutDiagnosticStage(diagnosticContext, {
        started: "supabase_order_number_started",
        succeeded: "supabase_order_number_success",
        failed: "supabase_order_number_failed",
      }, createOrderNumber);
      const orderDetails = {
        order_number: orderNumber,
        product_id: firstItem.product_id,
        product_name: orderItems.length === 1 ? firstItem.product_name : `${orderItems.length} produits`,
        product_image: firstItem.product_image,
        quantity: orderItems.reduce((total, item) => total + item.quantity, 0),
        unit_price: firstItem.unit_price,
        subtotal_amount: subtotalAmount,
        delivery_fee: serviceFee,
        total_amount: totalAmount,
        currency,
        payment_currency: isOnlinePayment ? "XOF" : currency,
        payment_total_amount: isOnlinePayment ? payDunyaTotalAmount : totalAmount,
        customer_first_name: firstName,
        customer_last_name: lastName,
        customer_phone: phone,
        customer_email: email,
        customer_address: address,
        customer_city: city,
        customer_note: text(body.note) || null,
        payment_method: body.paymentMethod,
        payment_status: "pending",
        checkout_id: checkoutId,
        stock_reserved_at: null,
        notifications_sent_at: null,
      } as const;

      async function createMultiProductOrder(orderStatus: "pending" | "awaiting_payment", token: string | null) {
        const result = await runCheckoutDiagnosticStage(diagnosticContext, {
          started: "supabase_order_insert_started",
          succeeded: "supabase_order_insert_success",
          failed: "supabase_order_insert_failed",
        }, () => createOrderWithItems({
          ...orderDetails,
          order_status: orderStatus,
          paydunya_token: token,
        }, orderItems), (result) => ({ httpStatus: result.httpStatus }));
        return await runCheckoutDiagnosticStage(diagnosticContext, {
          started: "supabase_order_readback_started",
          succeeded: "supabase_order_readback_success",
          failed: "supabase_order_readback_failed",
        }, async () => await getOrder(result.order.id) ?? result.order);
      }

      async function reserveOrCancel(order: Awaited<ReturnType<typeof createMultiProductOrder>>) {
        try {
          await runCheckoutDiagnosticStage(diagnosticContext, {
            started: "stock_reservation_started",
            succeeded: "stock_reservation_success",
            failed: "stock_reservation_failed",
          }, async () => await reserveOrderStock(order.id), (result) => ({ httpStatus: result.httpStatus }));
        } catch (error) {
          try {
            await runCheckoutDiagnosticStage(diagnosticContext, {
              started: "stock_reservation_rollback_started",
              succeeded: "stock_reservation_rollback_success",
              failed: "stock_reservation_rollback_failed",
            }, async () => { await updateOrder(order.id, { payment_status: "failed", order_status: "cancelled" }); });
          } catch {
            // Preserve the original reservation error; the rollback stage is logged separately.
          }
          throw error;
        }
      }

      const result = await startOrderPayment(body.paymentMethod, {
        createCashOnDeliveryOrder: () => createMultiProductOrder("pending", null),
        reserveCashOnDeliveryStock: reserveOrCancel,
        notifyCashOnDelivery: async (order) => {
          const emailResults = await Promise.allSettled([
            notifyNewOrder(order),
            sendCustomerOrderConfirmation(order),
          ]);
          if (emailResults[0].status === "rejected") {
            logCheckoutDiagnostic({
              ...diagnosticContext,
              event: "order_notification_failed",
              recipient: "admin",
              ...safeCheckoutErrorDetails(emailResults[0].reason),
            });
          }
          if (emailResults[1].status === "rejected") {
            logCheckoutDiagnostic({
              ...diagnosticContext,
              event: "order_notification_failed",
              recipient: "customer",
              ...safeCheckoutErrorDetails(emailResults[1].reason),
            });
          }
        },
        createOnlineInvoice: (selectedPaymentMethod) => runCheckoutDiagnosticStage({
          correlationId,
          paymentMethod: selectedPaymentMethod,
        }, {
          started: "paydunya_invoice_creation_started",
          succeeded: "paydunya_invoice_creation_success",
          failed: "paydunya_invoice_creation_failed",
        }, () => createPayDunyaCheckout({ ...orderDetails, total_amount: payDunyaTotalAmount, items: payDunyaInvoiceItems }, selectedPaymentMethod), (invoice) => ({
          httpStatus: invoice.httpStatus,
          errorCode: invoice.responseCode,
        })),
        createAwaitingPaymentOrder: (token) => createMultiProductOrder("awaiting_payment", token),
        reserveOnlineStock: reserveOrCancel,
      });

      logCheckoutDiagnostic({
        correlationId,
        event: "order_completed",
        paymentMethod,
        httpStatus: 200,
      });

      return result.kind === "online"
        ? NextResponse.json({
            success: true,
            orderNumber: result.order.order_number,
            checkoutUrl: result.checkoutUrl,
          })
        : NextResponse.json({ success: true, orderNumber: result.order.order_number });
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        logCheckoutDiagnostic({
          correlationId,
          event: "order_validation_failed",
          paymentMethod,
          httpStatus: 400,
          errorCode: "INSUFFICIENT_STOCK",
          errorMessage: "Stock is insufficient for this order.",
        });
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    const failure = safeCheckoutErrorDetails(error);
    logCheckoutDiagnostic({
      correlationId,
      event: "order_processing_failed",
      paymentMethod,
      ...failure,
    });
    return NextResponse.json(
      { success: false, error: CHECKOUT_PUBLIC_ERROR_MESSAGE },
      { status: 500 },
    );
  }
}
