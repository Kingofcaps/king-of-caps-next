import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminToken } from "@/app/lib/admin-auth";
import { getProducts, saveProducts } from "@/app/lib/products";

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
  const products = await getProducts();
  const index = products.findIndex((product) => product.id === id);

  if (index === -1) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
  if (!updates || typeof updates !== "object") {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const payload = updates as Record<string, unknown>;
  const product = products[index];
  const stockQuantity =
    typeof payload.stockQuantity === "number" && Number.isFinite(payload.stockQuantity)
      ? Math.max(0, Math.floor(payload.stockQuantity))
      : product.stockQuantity;
  const available = stockQuantity > 0;
  const nextProduct = {
    ...product,
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : product.name,
    price: typeof payload.price === "string" && payload.price.trim() ? payload.price.trim() : product.price,
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

  products[index] = nextProduct;
  await saveProducts(products);
  return NextResponse.json(nextProduct);
}

export async function DELETE(_request: Request, context: RouteContext<"/api/admin/products/[id]">) {
  if (!(await isAuthorized())) return unauthorized();

  const { id } = await context.params;
  const products = await getProducts();
  const remainingProducts = products.filter((product) => product.id !== id);

  if (remainingProducts.length === products.length) {
    return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
  }

  await saveProducts(remainingProducts);
  return NextResponse.json({ ok: true });
}
