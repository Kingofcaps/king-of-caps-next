import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdminToken } from "@/app/lib/admin-auth";
import { getProduct, updateProductStock } from "@/app/lib/products";
import { recordStockMovementSafely, type StockMovementType } from "@/app/lib/stock-movements";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/products/[id]/stock">,
) {
  if (!isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { stockQuantity, movementType }: { stockQuantity?: unknown; movementType?: unknown } = await request.json();
  if (typeof stockQuantity !== "number" || !Number.isFinite(stockQuantity)) {
    return NextResponse.json({ error: "Quantité de stock invalide." }, { status: 400 });
  }
  if (movementType !== "increase" && movementType !== "decrease" && movementType !== "restock") {
    return NextResponse.json({ error: "Type de mouvement invalide." }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const previousProduct = await getProduct(id);
    if (!previousProduct) {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }
    const product = await updateProductStock(id, stockQuantity);
    if (!product) {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }
    if (product.stockQuantity !== previousProduct.stockQuantity) {
      await recordStockMovementSafely({
        productId: product.id,
        productName: product.name,
        movementType: movementType as StockMovementType,
        quantityChange: product.stockQuantity - previousProduct.stockQuantity,
        previousQuantity: previousProduct.stockQuantity,
        newQuantity: product.stockQuantity,
        note: movementType === "restock" ? "Réapprovisionnement rapide" : undefined,
      });
    }
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de mettre à jour le stock." },
      { status: 500 },
    );
  }
}
