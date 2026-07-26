import { NextResponse } from "next/server";
import {
  createPayDunyaCheckout,
  isPayDunyaConfigured,
  ONLINE_PAYMENT_UNAVAILABLE_MESSAGE,
  payDunyaCheckoutUrl,
} from "@/app/lib/paydunya";
import { notifyNewOrder, sendCustomerOrderConfirmation } from "@/app/lib/order-notifications";
import { isOnlinePaymentMethod, startOrderPayment } from "@/app/lib/payment-workflows";
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
  try {
    const body = (await request.json()) as OrderRequest;
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
      return NextResponse.json({ success: false, error: "Veuillez compléter tous les champs obligatoires." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: "Veuillez saisir une adresse e-mail valide." }, { status: 400 });
    }

    const isOnlinePayment = isOnlinePaymentMethod(body.paymentMethod);
    if (isOnlinePayment && !isPayDunyaConfigured()) {
      return NextResponse.json(
        { success: false, error: ONLINE_PAYMENT_UNAVAILABLE_MESSAGE },
        { status: 503 },
      );
    }

    try {
      const existingOrder = await getOrderByCheckoutId(checkoutId);
      if (existingOrder) {
        if (existingOrder.payment_method === "cash_on_delivery" && existingOrder.stock_reserved_at) {
          return NextResponse.json({ success: true, orderNumber: existingOrder.order_number });
        }
        if (existingOrder.paydunya_token && existingOrder.order_status === "awaiting_payment" && existingOrder.stock_reserved_at) {
          return NextResponse.json({ success: true, orderNumber: existingOrder.order_number, checkoutUrl: payDunyaCheckoutUrl(existingOrder.paydunya_token) });
        }
        return NextResponse.json({ success: false, error: "Cette tentative de commande a déjà été traitée." }, { status: 409 });
      }

      const products = await Promise.all(items.map(async (item) => ({ ...item, product: await getProduct(item.productId) })));
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
      const deliveryFee = 0;
      const totalAmount = subtotalAmount + deliveryFee;
      const payDunyaTotalAmount = payDunyaItems.reduce((total, item) => total + item.line_total, 0);
      const firstItem = orderItems[0];

      const orderNumber = await createOrderNumber();
      const orderDetails = {
        order_number: orderNumber,
        product_id: firstItem.product_id,
        product_name: orderItems.length === 1 ? firstItem.product_name : `${orderItems.length} produits`,
        product_image: firstItem.product_image,
        quantity: orderItems.reduce((total, item) => total + item.quantity, 0),
        unit_price: firstItem.unit_price,
        subtotal_amount: subtotalAmount,
        delivery_fee: deliveryFee,
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
        const result = await createOrderWithItems({
          ...orderDetails,
          order_status: orderStatus,
          paydunya_token: token,
        }, orderItems);
        return await getOrder(result.order.id) ?? result.order;
      }

      async function reserveOrCancel(order: Awaited<ReturnType<typeof createMultiProductOrder>>) {
        try {
          await reserveOrderStock(order.id);
        } catch (error) {
          await updateOrder(order.id, { payment_status: "failed", order_status: "cancelled" });
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
            console.error(`Échec de la notification administrateur pour la commande ${order.order_number}.`, emailResults[0].reason);
          }
          if (emailResults[1].status === "rejected") {
            console.error(`Échec de la confirmation client pour la commande ${order.order_number}.`, emailResults[1].reason);
          }
        },
        createOnlineInvoice: (paymentMethod) => createPayDunyaCheckout({ ...orderDetails, total_amount: payDunyaTotalAmount, items: payDunyaItems }, paymentMethod),
        createAwaitingPaymentOrder: (token) => createMultiProductOrder("awaiting_payment", token),
        reserveOnlineStock: reserveOrCancel,
      });

      return result.kind === "online"
        ? NextResponse.json({
            success: true,
            orderNumber: result.order.order_number,
            checkoutUrl: result.order.paydunya_token
              ? payDunyaCheckoutUrl(result.order.paydunya_token)
              : result.checkoutUrl,
          })
        : NextResponse.json({ success: true, orderNumber: result.order.order_number });
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Erreur de création de commande :", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Impossible de créer la commande." },
      { status: 500 },
    );
  }
}
