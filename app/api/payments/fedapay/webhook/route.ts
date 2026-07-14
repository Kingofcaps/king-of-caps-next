import { NextResponse } from "next/server";
import { verifyFedaPayTransaction } from "@/app/lib/fedapay";
import { updateOrderByNumber } from "@/app/lib/orders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { transaction?: { id?: string | number } | string | number; id?: string | number };
    const transactionId = typeof payload.transaction === "object" ? payload.transaction?.id : payload.transaction ?? payload.id;
    if (!transactionId) return NextResponse.json({ error: "Transaction absente." }, { status: 400 });

    const transaction = await verifyFedaPayTransaction(transactionId);
    if (!transaction.merchant_reference) return NextResponse.json({ ok: true });

    if (transaction.status === "approved") {
      await updateOrderByNumber(transaction.merchant_reference, { payment_status: "paid", order_status: "confirmed" });
    } else if (transaction.status === "declined" || transaction.status === "canceled") {
      await updateOrderByNumber(transaction.merchant_reference, { payment_status: "failed" });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Webhook non traité." }, { status: 400 });
  }
}
