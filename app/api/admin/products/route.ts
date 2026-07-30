import { revalidatePath } from "next/cache";
import { after, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminToken } from "@/app/lib/admin-auth";
import {
  getProducts,
  insertProduct,
  SupabaseProductsError,
  type Product,
} from "@/app/lib/products";
import { recordStockMovementSafely } from "@/app/lib/stock-movements";
import { getProductImageStoragePath } from "@/app/lib/product-images";
import type { ProductCreatePayload } from "@/app/lib/product-create-payload";
import { sendNewProductPushNotification } from "@/app/lib/push-notifications";

export const runtime = "nodejs";

async function isAuthorized() {
  return isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

function unauthorized() {
  return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
}

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getQuantity(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function getMoney(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function validateImageUrls(payload: Partial<ProductCreatePayload>) {
  const image = getText(payload.image);
  const images = Array.isArray(payload.images)
    ? payload.images.filter((url): url is string => typeof url === "string")
    : [];
  if (!image || images.length === 0 || images[0] !== image) {
    throw new Error("Une image principale téléversée est obligatoire.");
  }
  if (images.length > 6) throw new Error("Vous pouvez ajouter jusqu’à 5 images supplémentaires.");
  if (images.some((url) => !getProductImageStoragePath(url))) {
    throw new Error("Toutes les images doivent provenir du bucket product-images.");
  }
  return Array.from(new Set(images));
}

export async function GET() {
  if (!(await isAuthorized())) return unauthorized();
  return NextResponse.json(await getProducts());
}

export async function POST(request: Request) {
  if (!(await isAuthorized())) return unauthorized();

  try {
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return NextResponse.json({ error: "La création produit accepte uniquement un petit payload JSON d’URL." }, { status: 415 });
    }
    const payload = await request.json() as Partial<ProductCreatePayload>;
    const productId = getText(payload.id);
    const name = getText(payload.name);
    const price = getText(payload.price);
    const priceXof = Math.round(getMoney(payload.priceXof) || Number(price.replace(/[^0-9]/g, "")));
    const priceEur = Math.round(getMoney(payload.priceEur));
    const priceUsd = Math.round(getMoney(payload.priceUsd));
    const images = validateImageUrls(payload);

    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(productId)) {
      return NextResponse.json({ error: "L’identifiant du produit est invalide." }, { status: 400 });
    }
    if (!name || !Number.isFinite(priceXof) || priceXof < 1 || priceEur < 1 || priceUsd < 1) {
      return NextResponse.json({ error: "Le nom et les trois prix sont obligatoires." }, { status: 400 });
    }

    const products = await getProducts();
    const image = images[0];
    const stockQuantity = getQuantity(payload.stockQuantity);
    const available = stockQuantity > 0;
    const firstSortOrder = products.reduce(
      (lowest, product) => Math.min(lowest, product.sortOrder),
      0,
    );
    const product: Product = {
      id: productId,
      name,
      price,
      priceXof,
      priceEur,
      priceUsd,
      description: getText(payload.description),
      image,
      images,
      brand: getText(payload.brand),
      category: getText(payload.category),
      color: getText(payload.color),
      stockQuantity,
      featured: payload.featured === true,
      newArrival: payload.newArrival === true,
      available,
      inStock: available,
      sortOrder: firstSortOrder - 1,
      createdAt: new Date().toISOString(),
    };

    console.info("[products][create] Insertion Supabase démarrée.", {
      productId,
      name,
      stockQuantity,
      available,
      featured: product.featured,
      imageCount: product.images.length,
    });
    const createdProduct = await insertProduct(product);
    if (!createdProduct) throw new Error("Supabase n’a pas retourné le produit créé.");
    console.info("[products][create] Produit créé dans Supabase.", {
      productId: createdProduct.id,
      name: createdProduct.name,
      stockQuantity: createdProduct.stockQuantity,
      available: createdProduct.available,
      createdAt: createdProduct.createdAt,
    });

    await recordStockMovementSafely({
      productId: createdProduct.id,
      productName: createdProduct.name,
      movementType: "creation",
      quantityChange: stockQuantity,
      previousQuantity: 0,
      newQuantity: stockQuantity,
      note: "Création du produit",
    });

    try {
      revalidatePath("/");
      revalidatePath(`/product/${createdProduct.id}`);
      console.info("[products][create] Catalogue public revalidé.", {
        productId: createdProduct.id,
      });
    } catch (revalidationError) {
      console.error("[products][create] Le produit est créé, mais la revalidation a échoué.", {
        productId: createdProduct.id,
        error: revalidationError instanceof Error
          ? revalidationError.message
          : "Erreur inconnue",
      });
    }

    after(async () => {
      console.info("[push][product-create] Diffusion planifiée après la réponse admin.", {
        productId: createdProduct.id,
      });
      try {
        const result = await sendNewProductPushNotification(createdProduct);
        console.info("[push][product-create] Diffusion terminée après création.", {
          productId: createdProduct.id,
          ...result,
        });
      } catch (pushError) {
        console.error("[push][product-create] Le produit reste créé malgré l’échec push.", {
          productId: createdProduct.id,
          error: pushError instanceof Error ? pushError.message : "Erreur inconnue",
        });
      }
    });

    return NextResponse.json(createdProduct, { status: 201 });
  } catch (error) {
    const supabaseError = error instanceof SupabaseProductsError ? error : null;
    const errorResponse = {
      error: error instanceof Error ? error.message : "Impossible d’ajouter ce produit.",
      code: supabaseError?.code ?? null,
      message: error instanceof Error ? error.message : "Impossible d’ajouter ce produit.",
      details: supabaseError?.details ?? null,
      hint: supabaseError?.hint ?? null,
      supabaseStatus: supabaseError?.status ?? null,
    };
    console.error("[products][create] Échec de création du produit.", {
      code: errorResponse.code,
      message: errorResponse.message,
      details: errorResponse.details,
      hint: errorResponse.hint,
      supabaseStatus: errorResponse.supabaseStatus,
      errorName: error instanceof Error ? error.name : typeof error,
      stack: error instanceof Error ? error.stack : null,
    });

    return NextResponse.json(
      errorResponse,
      { status: 400 },
    );
  }
}
