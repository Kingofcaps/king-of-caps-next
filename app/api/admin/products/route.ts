import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminToken } from "@/app/lib/admin-auth";
import { getProducts, insertProduct, type Product } from "@/app/lib/products";
import { recordStockMovementSafely } from "@/app/lib/stock-movements";
import { deleteProductImages, uploadProductImage } from "@/app/lib/product-images";

export const runtime = "nodejs";

async function isAuthorized() {
  return isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

function unauthorized() {
  return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
}

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getQuantity(formData: FormData) {
  const value = Number(getText(formData, "stockQuantity"));
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export async function GET() {
  if (!(await isAuthorized())) return unauthorized();
  return NextResponse.json(await getProducts());
}

export async function POST(request: Request) {
  if (!(await isAuthorized())) return unauthorized();

  const uploadedUrls: string[] = [];
  try {
    const formData = await request.formData();
    const name = getText(formData, "name");
    const price = getText(formData, "price");
    const description = getText(formData, "description");
    const primaryFile = formData.get("image");
    const additionalFiles = formData
      .getAll("images")
      .filter((file): file is File => file instanceof File && file.size > 0);

    if (!name || !price) {
      return NextResponse.json({ error: "Le nom et le prix sont obligatoires." }, { status: 400 });
    }
    if (!(primaryFile instanceof File) || primaryFile.size === 0) {
      return NextResponse.json({ error: "Veuillez sélectionner une image principale." }, { status: 400 });
    }
    if (additionalFiles.length > 5) {
      return NextResponse.json({ error: "Vous pouvez ajouter jusqu’à 5 images supplémentaires." }, { status: 400 });
    }

    const products = await getProducts();
    const productId = randomUUID();
    const upload = async (file: File) => {
      const uploaded = await uploadProductImage(file, productId);
      uploadedUrls.push(uploaded.publicUrl);
      return uploaded.publicUrl;
    };
    const uploadedPrimary = await upload(primaryFile);
    const uploadedImages: string[] = [];
    for (const file of additionalFiles) uploadedImages.push(await upload(file));
    const image = uploadedPrimary;
    const stockQuantity = getQuantity(formData);
    const available = stockQuantity > 0;
    const firstSortOrder = products.reduce(
      (lowest, product) => Math.min(lowest, product.sortOrder),
      0,
    );
    const product: Product = {
      id: productId,
      name,
      price,
      description,
      image,
      images: Array.from(new Set([image, ...uploadedImages])).slice(0, 6),
      brand: getText(formData, "brand"),
      category: getText(formData, "category"),
      color: getText(formData, "color"),
      stockQuantity,
      featured: formData.get("featured") === "true",
      newArrival: formData.get("newArrival") === "true",
      available,
      inStock: available,
      sortOrder: firstSortOrder - 1,
      createdAt: new Date().toISOString(),
    };

    const createdProduct = await insertProduct(product);
    if (!createdProduct) throw new Error("Supabase n’a pas retourné le produit créé.");
    await recordStockMovementSafely({
      productId: createdProduct.id,
      productName: createdProduct.name,
      movementType: "creation",
      quantityChange: stockQuantity,
      previousQuantity: 0,
      newQuantity: stockQuantity,
      note: "Création du produit",
    });
    return NextResponse.json(createdProduct, { status: 201 });
  } catch (error) {
    if (uploadedUrls.length > 0) {
      try {
        await deleteProductImages(uploadedUrls);
      } catch (cleanupError) {
        console.error("Product image cleanup failed:", cleanupError);
      }
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible d’ajouter ce produit." },
      { status: 400 },
    );
  }
}
