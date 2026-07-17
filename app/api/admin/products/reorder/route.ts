import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdminToken } from "@/app/lib/admin-auth";
import { getProducts, persistProductOrder } from "@/app/lib/products";

export const runtime = "nodejs";

type ReorderRequest = {
  productIds?: unknown;
};

export async function PATCH(request: Request) {
  if (!isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as ReorderRequest;
    if (!Array.isArray(body.productIds) || body.productIds.length === 0) {
      return NextResponse.json({ error: "Liste de produits invalide." }, { status: 400 });
    }

    const productIds = body.productIds.filter(
      (id): id is string => typeof id === "string" && id.trim().length > 0 && id.length <= 128,
    );
    if (productIds.length !== body.productIds.length || new Set(productIds).size !== productIds.length) {
      return NextResponse.json({ error: "Identifiants de produits invalides ou dupliqués." }, { status: 400 });
    }

    const products = await getProducts();
    const knownIds = new Set(products.map((product) => product.id));
    if (productIds.length !== products.length || productIds.some((id) => !knownIds.has(id))) {
      return NextResponse.json({ error: "La liste doit contenir exactement tous les produits." }, { status: 400 });
    }

    await persistProductOrder(productIds);
    return NextResponse.json(await getProducts());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible d’enregistrer l’ordre." },
      { status: 500 },
    );
  }
}
