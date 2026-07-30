import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdminToken } from "@/app/lib/admin-auth";
import {
  createProductImageSignedUpload,
  deleteUnreferencedProductImages,
} from "@/app/lib/product-images";

export const runtime = "nodejs";

async function isAuthorized() {
  return isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

function unauthorized() {
  return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
}

export async function POST(request: Request) {
  if (!(await isAuthorized())) return unauthorized();
  try {
    const body = await request.json() as { productId?: unknown; contentType?: unknown };
    if (typeof body.productId !== "string" || typeof body.contentType !== "string") {
      return NextResponse.json({ error: "Paramètres d’upload invalides." }, { status: 400 });
    }
    return NextResponse.json(await createProductImageSignedUpload(body.productId, body.contentType));
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Impossible de préparer l’upload.",
    }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAuthorized())) return unauthorized();
  try {
    const body = await request.json() as { imageUrls?: unknown };
    const imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls.filter((url): url is string => typeof url === "string")
      : [];
    const deletedCount = await deleteUnreferencedProductImages(imageUrls);
    return NextResponse.json({ deletedCount });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Impossible de nettoyer les images.",
    }, { status: 400 });
  }
}
