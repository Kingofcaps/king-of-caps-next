import { NextResponse } from "next/server";
import { getOrderByPayDunyaToken } from "@/app/lib/orders";
import { processPayDunyaOrder } from "@/app/lib/paydunya-order-processing";

export const runtime = "nodejs";

function resultUrl(request: Request, status: string, orderNumber?: string) {
  const url = new URL("/checkout/success", request.url);
  url.searchParams.set("status", status);
  if (orderNumber) url.searchParams.set("orderNumber", orderNumber);
  return url;
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!token) return NextResponse.redirect(resultUrl(request, "error"));

  try {
    const result = await processPayDunyaOrder(token);
    if (result.status === "completed" && result.order) {
      return NextResponse.redirect(new URL(`/commande-confirmee/${encodeURIComponent(result.order.order_number)}`, request.url));
    }

    const order = result.order ?? await getOrderByPayDunyaToken(token);
    if (order) return NextResponse.redirect(new URL(`/commande-confirmee/${encodeURIComponent(order.order_number)}`, request.url));
    return NextResponse.redirect(resultUrl(request, result.status));
  } catch (error) {
    console.error("Erreur de retour PayDunya :", error);
    return NextResponse.redirect(resultUrl(request, "error"));
  }
}
