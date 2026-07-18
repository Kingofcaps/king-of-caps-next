import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { ADMIN_COOKIE, isAdminToken } from "@/app/lib/admin-auth";
import { deleteProductImages, getProductImageStoragePath } from "@/app/lib/product-images";

export const runtime = "nodejs";

const MAX_BULK_DELETE_PRODUCTS = 100;

type ProductImagesRecord = {
  id: string;
  image: string;
  images: unknown;
};

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase n’est pas configuré côté serveur.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function productImageUrls(product: ProductImagesRecord) {
  const additionalImages = Array.isArray(product.images)
    ? product.images.filter((image): image is string => typeof image === "string")
    : [];
  return Array.from(new Set([product.image, ...additionalImages]));
}

function deletionErrorMessage(error: PostgrestError) {
  if (error.code === "23503") {
    const constraint = error.message.match(/constraint "([^"]+)"/)?.[1];
    return constraint
      ? `Ce produit est encore référencé par des données existantes (${constraint}).`
      : "Ce produit est encore référencé par une commande ou un historique existant.";
  }
  return "Impossible de supprimer ce produit.";
}

export async function DELETE(request: Request) {
  if (!isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Le corps JSON est invalide." }, { status: 400 });
  }

  const rawIds = body && typeof body === "object"
    ? (body as { productIds?: unknown }).productIds
    : undefined;
  if (!Array.isArray(rawIds)) {
    return NextResponse.json({ error: "productIds doit être un tableau." }, { status: 400 });
  }

  const productIds = Array.from(new Set(
    rawIds
      .filter((id): id is string => typeof id === "string")
      .map((id) => id.trim())
      .filter(Boolean),
  ));
  if (productIds.length === 0) {
    return NextResponse.json({ error: "Sélectionnez au moins un produit." }, { status: 400 });
  }
  if (productIds.length > MAX_BULK_DELETE_PRODUCTS) {
    return NextResponse.json(
      { error: `Vous pouvez supprimer au maximum ${MAX_BULK_DELETE_PRODUCTS} produits à la fois.` },
      { status: 400 },
    );
  }

  const supabase = getSupabaseClient();
  const { data: selectedProducts, error: productsError } = await supabase
    .from("products")
    .select("id,image,images")
    .in("id", productIds)
    .returns<ProductImagesRecord[]>();
  if (productsError) {
    console.error("Bulk product lookup failed:", productsError);
    return NextResponse.json({ error: "Impossible de préparer la suppression." }, { status: 500 });
  }

  const productsById = new Map((selectedProducts ?? []).map((product) => [product.id, product]));
  const deletedIds: string[] = [];
  const failures: Array<{ id: string; error: string }> = [];

  for (const id of productIds) {
    const product = productsById.get(id);
    if (!product) {
      failures.push({ id, error: "Produit introuvable." });
      continue;
    }

    const { data: deletedRows, error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) {
      console.error(`Bulk product deletion failed for ${id}:`, error);
      failures.push({ id, error: deletionErrorMessage(error) });
      continue;
    }
    if (!deletedRows || deletedRows.length === 0) {
      failures.push({ id, error: "Produit introuvable." });
      continue;
    }
    deletedIds.push(id);
  }

  let imageCleanupWarning: string | null = null;
  if (deletedIds.length > 0) {
    const { data: remainingProducts, error: remainingProductsError } = await supabase
      .from("products")
      .select("id,image,images")
      .returns<ProductImagesRecord[]>();

    if (remainingProductsError) {
      console.error("Remaining product image lookup failed:", remainingProductsError);
      imageCleanupWarning = "Les produits ont été supprimés, mais leurs images n’ont pas pu être vérifiées.";
    } else {
      const referencedPaths = new Set(
        (remainingProducts ?? [])
          .flatMap(productImageUrls)
          .map(getProductImageStoragePath)
          .filter((path): path is string => path !== null),
      );
      const deletedProducts = deletedIds
        .map((id) => productsById.get(id))
        .filter((product): product is ProductImagesRecord => product !== undefined);
      const removableImageUrls = deletedProducts
        .flatMap(productImageUrls)
        .filter((imageUrl) => {
          const path = getProductImageStoragePath(imageUrl);
          return path !== null && !referencedPaths.has(path);
        });

      try {
        await deleteProductImages(removableImageUrls);
      } catch (error) {
        console.error("Bulk product image cleanup failed:", error);
        imageCleanupWarning = "Les produits ont été supprimés, mais certaines images n’ont pas pu être nettoyées.";
      }
    }
  }

  return NextResponse.json({
    deletedIds,
    deletedCount: deletedIds.length,
    failedCount: failures.length,
    failures,
    imageCleanupWarning,
  });
}
