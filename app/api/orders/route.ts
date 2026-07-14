import { NextResponse } from "next/server";
import { createFedaPayCheckout } from "@/app/lib/fedapay";
import { notifyNewOrder } from "@/app/lib/order-notifications";
import {
  createOrder,
  createOrderNumber,
  parsePrice,
  type PaymentMethod,
} from "@/app/lib/orders";
import { InsufficientStockError, reserveProductStock, restoreProductStock } from "@/app/lib/products";

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
    const address = text(body.address);
    const city = text(body.city);

    if (!productId || !Number.isInteger(quantity) || quantity < 1 || !firstName || !lastName || !phone || !address || !city || !validPaymentMethod(body.paymentMethod)) {
      return NextResponse.json({ success: false, error: "Veuillez compléter tous les champs obligatoires." }, { status: 400 });
    }

    let stockReserved = false;
    let orderCreated = false;
    let productIdWithReservedStock = "";

    try {
      const product = await reserveProductStock(productId, quantity);
      stockReserved = true;
      productIdWithReservedStock = product.id;
      const unitPrice = parsePrice(product.price);
      if (!unitPrice) throw new Error("Le prix du produit est invalide.");

      const order = await createOrder({
        order_number: await createOrderNumber(),
        product_id: product.id,
        product_name: product.name,
        product_image: product.image,
        quantity,
        unit_price: unitPrice,
        total_amount: unitPrice * quantity,
        customer_first_name: firstName,
        customer_last_name: lastName,
        customer_phone: phone,
        customer_email: text(body.email) || null,
        customer_address: address,
        customer_city: city,
        customer_note: text(body.note) || null,
        payment_method: body.paymentMethod,
        payment_status: "pending",
        order_status: "new",
      });
      orderCreated = true;

      try {
        await notifyNewOrder(order);
      } catch (notificationError) {
        console.error("Erreur d’envoi de la notification de commande :", notificationError);
      }

      if (body.paymentMethod === "cash_on_delivery") {
        return NextResponse.json({ success: true, orderNumber: order.order_number });
      }

      const checkout = await createFedaPayCheckout(order);
      return NextResponse.json({ success: true, orderNumber: order.order_number, checkoutUrl: checkout.url });
    } catch (error) {
      if (stockReserved && !orderCreated) {
        try {
          await restoreProductStock(productIdWithReservedStock, quantity);
        } catch (restoreError) {
          console.error("Erreur de restauration du stock après échec de commande :", restoreError);
        }
      }
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
