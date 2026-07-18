import { NextResponse } from "next/server";
import { verifyFedaPayTransaction, verifyFedaPayWebhook } from "@/app/lib/fedapay";
import { notifyNewOrder, sendCustomerOrderConfirmation } from "@/app/lib/order-notifications";
import {
  approveFedaPayOrder,
  failFedaPayOrder,
  markOrderNotificationsSent,
} from "@/app/lib/orders";

export const runtime = "nodejs";

const handledEvents = ["transaction.approved", "transaction.declined", "transaction.canceled"] as const;
type HandledEvent = (typeof handledEvents)[number];

function isHandledEvent(value: string): value is HandledEvent {
  return handledEvents.includes(value as HandledEvent);
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-fedapay-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature FedaPay absente." }, { status: 400 });
  }

  const rawBody = await request.text();
  let event;
  try {
    event = verifyFedaPayWebhook(rawBody, signature);
  } catch {
    return NextResponse.json({ error: "Signature FedaPay invalide." }, { status: 400 });
  }

  const eventName = event.name ?? event.type ?? "";
  if (!isHandledEvent(eventName)) return NextResponse.json({ received: true });

  const eventId = String(event.id ?? "").trim();
  const transactionId = String(event.entity?.id ?? event.object_id ?? "").trim();
  if (!eventId || !transactionId) {
    return NextResponse.json({ error: "Événement FedaPay incomplet." }, { status: 400 });
  }

  try {
    const transaction = await verifyFedaPayTransaction(transactionId);
    if (transaction.id !== transactionId || transaction.status !== eventName.replace("transaction.", "")) {
      return NextResponse.json({ error: "Le statut FedaPay vérifié ne correspond pas à l’événement." }, { status: 409 });
    }

    if (eventName === "transaction.approved") {
      const transition = await approveFedaPayOrder(transactionId, eventId);
      const order = transition.order;

      if (!order.notifications_sent_at) {
        await Promise.all([
          notifyNewOrder(order),
          sendCustomerOrderConfirmation(order),
        ]);
        await markOrderNotificationsSent(order.id);
      }
    } else {
      await failFedaPayOrder(transactionId, eventId, eventName);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erreur de traitement du webhook FedaPay :", error);
    return NextResponse.json({ error: "Webhook FedaPay non traité." }, { status: 500 });
  }
}
