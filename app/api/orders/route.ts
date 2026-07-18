import { NextResponse } from "next/server";
import {
  createFedaPayCheckout,
  isFedaPayConfigured,
  ONLINE_PAYMENT_UNAVAILABLE_MESSAGE,
} from "@/app/lib/fedapay";
import { notifyNewOrder, sendCustomerOrderConfirmation } from "@/app/lib/order-notifications";
import {
  createOrder,
  createOrderNumber,
  markOrderStockReserved,
  type PaymentMethod,
} from "@/app/lib/orders";
import { parsePrice } from "@/app/lib/prices";
import { InsufficientStockError, getProduct, reserveProductStock } from "@/app/lib/products";
import { recordStockMovementSafely } from "@/app/lib/stock-movements";
import { isValidEmail } from "@/app/lib/validation";

export const runtime = "nodejs";

type OrderRequest = {
  productId?: unknown;
  quantity?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  email?: unknown;
  address?: unknown;
  city?: unknown;
  note?: unknown;
  paymentMethod?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "cash_on_delivery" || value === "mobile_money" || value === "card";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OrderRequest;
    const productId = text(body.productId);
    const quantity = Number(body.quantity);
    const firstName = text(body.firstName);
    const lastName = text(body.lastName);
    const phone = text(body.phone);
    const email = text(body.email).toLowerCase();
    const address = text(body.address);
    const city = text(body.city);

    if (!productId || !Number.isInteger(quantity) || quantity < 1 || !firstName || !lastName || !phone || !email || !address || !city || !validPaymentMethod(body.paymentMethod)) {
      return NextResponse.json({ success: false, error: "Veuillez compléter tous les champs obligatoires." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: "Veuillez saisir une adresse e-mail valide." }, { status: 400 });
    }

    const isOnlinePayment = body.paymentMethod === "mobile_money" || body.paymentMethod === "card";
    if (isOnlinePayment && !isFedaPayConfigured()) {
      return NextResponse.json(
        { success: false, error: ONLINE_PAYMENT_UNAVAILABLE_MESSAGE },
        { status: 503 },
      );
    }

    try {
      const product = await getProduct(productId);
      if (!product || !product.inStock || product.stockQuantity < quantity) {
        throw new InsufficientStockError();
      }
      const unitPrice = parsePrice(product.price);
      if (!unitPrice) throw new Error("Le prix du produit est invalide.");

      const orderNumber = await createOrderNumber();
      const orderDetails = {
        order_number: orderNumber,
        product_id: product.id,
        product_name: product.name,
        product_image: product.image,
        quantity,
        unit_price: unitPrice,
        total_amount: unitPrice * quantity,
        customer_first_name: firstName,
        customer_last_name: lastName,
        customer_phone: phone,
        customer_email: email,
        customer_address: address,
        customer_city: city,
        customer_note: text(body.note) || null,
        payment_method: body.paymentMethod,
        payment_status: "pending",
        stock_reserved_at: null,
        notifications_sent_at: null,
      } as const;

      if (isOnlinePayment) {
        const checkout = await createFedaPayCheckout({
          order_number: orderNumber,
          total_amount: orderDetails.total_amount,
          customer_first_name: firstName,
          customer_last_name: lastName,
          customer_email: email,
          customer_phone: phone,
        });
        await createOrder({
          ...orderDetails,
          order_status: "awaiting_payment",
          fedapay_transaction_id: checkout.transactionId,
        });
        return NextResponse.json({ success: true, checkoutUrl: checkout.url });
      }

      const order = await createOrder({
        ...orderDetails,
        order_status: "pending",
        fedapay_transaction_id: null,
      });

      try {
        const updatedProduct = await reserveProductStock(product.id, quantity);
        await markOrderStockReserved(order.id);
        await recordStockMovementSafely({
          productId: updatedProduct.id,
          productName: updatedProduct.name,
          movementType: "order_deduction",
          quantityChange: updatedProduct.stockQuantity - product.stockQuantity,
          previousQuantity: product.stockQuantity,
          newQuantity: updatedProduct.stockQuantity,
          note: `Commande ${order.order_number}`,
        });
      } catch (stockError) {
        console.error("Erreur de mise à jour du stock après création de commande :", stockError);
        return NextResponse.json(
          { success: false, error: "La commande a été créée, mais le stock n’a pas pu être mis à jour. Contactez-nous pour confirmation." },
          { status: stockError instanceof InsufficientStockError ? 409 : 500 },
        );
      }

      const emailResults = await Promise.allSettled([
        notifyNewOrder(order),
        sendCustomerOrderConfirmation(order),
      ]);
      if (emailResults[0].status === "rejected") {
        console.error(`Échec de la notification administrateur pour la commande ${order.order_number}.`);
      }
      if (emailResults[1].status === "rejected") {
        console.error(`Échec de la confirmation client pour la commande ${order.order_number}.`);
      }

      return NextResponse.json({ success: true, orderNumber: order.order_number });
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
