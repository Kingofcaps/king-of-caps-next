import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdminToken } from "@/app/lib/admin-auth";
import { sendNewProductPushNotification } from "@/app/lib/push-notifications";
import { getProduct } from "@/app/lib/products";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { productId?: unknown } | null;
  const productId = typeof body?.productId === "string" ? body.productId.trim() : "";
  if (!productId || productId.length > 200) {
    return NextResponse.json({ error: "Produit invalide." }, { status: 400 });
  }

  try {
    const product = await getProduct(productId);
    if (!product) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    const result = await sendNewProductPushNotification(product);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[push][route] Échec de diffusion administrateur.", {
      productId,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
    return NextResponse.json({ error: "Impossible d’envoyer la notification push." }, { status: 500 });
  }
}
