import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdminToken } from "@/app/lib/admin-auth";
import { updateProductStock } from "@/app/lib/products";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/products/[id]/stock">,
) {
  if (!isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { stockQuantity }: { stockQuantity?: unknown } = await request.json();
  if (typeof stockQuantity !== "number" || !Number.isFinite(stockQuantity)) {
    return NextResponse.json({ error: "Quantité de stock invalide." }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const product = await updateProductStock(id, stockQuantity);
    if (!product) {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de mettre à jour le stock." },
      { status: 500 },
    );
  }
}
