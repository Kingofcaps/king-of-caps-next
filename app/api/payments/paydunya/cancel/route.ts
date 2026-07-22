import { NextResponse } from "next/server";
import { getOrderByPayDunyaToken } from "@/app/lib/orders";
import { processPayDunyaOrder } from "@/app/lib/paydunya-order-processing";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  const url = new URL("/checkout/success", request.url);
  url.searchParams.set("status", "cancelled");

  if (!token) return NextResponse.redirect(url);

  try {
    const result = await processPayDunyaOrder(token);
    const order = result.order ?? await getOrderByPayDunyaToken(token);
    if (order && result.status !== "completed") {
      return NextResponse.redirect(new URL(`/commande-confirmee/${encodeURIComponent(order.order_number)}`, request.url));
    }
    if (result.status === "completed" && result.order) {
      return NextResponse.redirect(new URL(`/commande-confirmee/${encodeURIComponent(result.order.order_number)}`, request.url));
    }
  } catch (error) {
    console.error("Erreur d’annulation PayDunya :", error);
  }

  return NextResponse.redirect(url);
}
