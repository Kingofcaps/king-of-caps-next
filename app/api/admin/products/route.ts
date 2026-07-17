import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminToken } from "@/app/lib/admin-auth";
import { getProducts, insertProduct, type Product } from "@/app/lib/products";
import { recordStockMovementSafely } from "@/app/lib/stock-movements";

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

async function saveUpload(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Veuillez sélectionner une image valide.");
  }

  const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
  const filename = `${randomUUID()}.${extension.toLowerCase()}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${filename}`;
}

export async function GET() {
  if (!(await isAuthorized())) return unauthorized();
  return NextResponse.json(await getProducts());
}

export async function POST(request: Request) {
  if (!(await isAuthorized())) return unauthorized();

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
    if (additionalFiles.length > 5) {
      return NextResponse.json({ error: "Vous pouvez ajouter jusqu’à 5 images supplémentaires." }, { status: 400 });
    }

    const products = await getProducts();
    const uploadedPrimary = primaryFile instanceof File && primaryFile.size > 0
      ? await saveUpload(primaryFile)
      : undefined;
    const uploadedImages = await Promise.all(additionalFiles.map(saveUpload));
    const image = uploadedPrimary ?? uploadedImages[0] ?? "/images/logo.jpg";
    const stockQuantity = getQuantity(formData);
    const available = stockQuantity > 0;
    const firstSortOrder = products.reduce(
      (lowest, product) => Math.min(lowest, product.sortOrder),
      0,
    );
    const product: Product = {
      id: randomUUID(),
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible d’ajouter ce produit." },
      { status: 400 },
    );
  }
}
