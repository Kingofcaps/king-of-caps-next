import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdminToken } from "@/app/lib/admin-auth";
import { listShopSales, recordShopSale } from "@/app/lib/shop-sales";
import {
  SHOP_PAYMENT_METHODS,
  validateShopSale,
  type ShopSaleDraft,
} from "@/app/lib/shop-sale-workflow";

export const runtime = "nodejs";

async function isAuthorized() {
  return isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

export async function GET() {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    return NextResponse.json(await listShopSales());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de charger les ventes boutique." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Le corps JSON est invalide." }, { status: 400 });
  }

  const draft: ShopSaleDraft = {
    productId: typeof body.productId === "string" ? body.productId : "",
    productName: "",
    availableStock: Number.MAX_SAFE_INTEGER,
    quantity: typeof body.quantity === "number" ? body.quantity : Number.NaN,
    unitPrice: typeof body.unitPrice === "number" ? body.unitPrice : Number.NaN,
    paymentMethod: typeof body.paymentMethod === "string" && SHOP_PAYMENT_METHODS.some((method) => method === body.paymentMethod)
      ? body.paymentMethod as ShopSaleDraft["paymentMethod"]
      : "" as ShopSaleDraft["paymentMethod"],
    requestId: typeof body.requestId === "string" ? body.requestId : "",
  };
  const validationError = validateShopSale(draft);
  if (!draft.productId || validationError) {
    return NextResponse.json({ error: validationError ?? "Produit manquant." }, { status: 400 });
  }

  try {
    const result = await recordShopSale(draft);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible d’enregistrer la vente boutique." },
      { status: 500 },
    );
  }
}
