import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminToken } from "@/app/lib/admin-auth";
import { getProduct, removeProduct, replaceProduct } from "@/app/lib/products";
import { recordStockMovementSafely } from "@/app/lib/stock-movements";
import { deleteProductImages } from "@/app/lib/product-images";

export const runtime = "nodejs";

async function isAuthorized() {
  return isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

function unauthorized() {
  return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
}

export async function PATCH(request: Request, context: RouteContext<"/api/admin/products/[id]">) {
  if (!(await isAuthorized())) return unauthorized();

  const { id } = await context.params;
  const updates: unknown = await request.json();
  const product = await getProduct(id);
  if (!product) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
  if (!updates || typeof updates !== "object") {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const payload = updates as Record<string, unknown>;
  const stockQuantity =
    typeof payload.stockQuantity === "number" && Number.isFinite(payload.stockQuantity)
      ? Math.max(0, Math.floor(payload.stockQuantity))
      : product.stockQuantity;
  const available = stockQuantity > 0;
  const nextProduct = {
    ...product,
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : product.name,
    price: typeof payload.price === "string" && payload.price.trim() ? payload.price.trim() : product.price,
    priceXof: typeof payload.priceXof === "number" && Number.isFinite(payload.priceXof) ? Math.max(0, Math.round(payload.priceXof)) : product.priceXof,
    priceEur: typeof payload.priceEur === "number" && Number.isFinite(payload.priceEur) ? Math.max(0, Math.round(payload.priceEur)) : product.priceEur,
    priceUsd: typeof payload.priceUsd === "number" && Number.isFinite(payload.priceUsd) ? Math.max(0, Math.round(payload.priceUsd)) : product.priceUsd,
    description: typeof payload.description === "string" ? payload.description.trim() : product.description,
    brand: typeof payload.brand === "string" ? payload.brand.trim() : product.brand,
    category: typeof payload.category === "string" ? payload.category.trim() : product.category,
    color: typeof payload.color === "string" ? payload.color.trim() : product.color,
    stockQuantity,
    featured: typeof payload.featured === "boolean" ? payload.featured : product.featured,
    newArrival: typeof payload.newArrival === "boolean" ? payload.newArrival : product.newArrival,
    available,
    inStock: available,
  };

  const updatedProduct = await replaceProduct(nextProduct);
  if (!updatedProduct) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
  if (stockQuantity !== product.stockQuantity) {
    await recordStockMovementSafely({
      productId: nextProduct.id,
      productName: nextProduct.name,
      movementType: "product_edit",
      quantityChange: stockQuantity - product.stockQuantity,
      previousQuantity: product.stockQuantity,
      newQuantity: stockQuantity,
      note: "Modification de la fiche produit",
    });
  }
  return NextResponse.json(updatedProduct);
}

export async function DELETE(_request: Request, context: RouteContext<"/api/admin/products/[id]">) {
  if (!(await isAuthorized())) return unauthorized();

  const { id } = await context.params;
  const product = await getProduct(id);
  if (!product) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
  await removeProduct(id);
  await deleteProductImages([product.image, ...product.images]);
  return NextResponse.json({ ok: true });
}
