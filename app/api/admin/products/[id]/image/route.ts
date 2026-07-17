import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminToken } from "@/app/lib/admin-auth";
import { getProduct, replaceProduct } from "@/app/lib/products";

export const runtime = "nodejs";

async function isAuthorized() {
  return isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/admin/products/[id]/image">,
) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const formData = await request.formData();
    const file = formData.get("image");
    const additionalFiles = formData
      .getAll("images")
      .filter((item): item is File => item instanceof File && item.size > 0);

    if (
      (!(file instanceof File) || file.size === 0) &&
      additionalFiles.length === 0
    ) {
      return NextResponse.json({ error: "Veuillez sélectionner au moins une image." }, { status: 400 });
    }
    if (additionalFiles.length > 5) {
      return NextResponse.json({ error: "Vous pouvez ajouter jusqu’à 5 images supplémentaires." }, { status: 400 });
    }
    if (file instanceof File && file.size > 0 && !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Veuillez sélectionner une image valide." }, { status: 400 });
    }
    if (additionalFiles.some((item) => !item.type.startsWith("image/"))) {
      return NextResponse.json({ error: "Veuillez sélectionner des images valides." }, { status: 400 });
    }

    const product = await getProduct(id);
    if (!product) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const saveFile = async (imageFile: File) => {
      const extension = imageFile.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
      const filename = `${randomUUID()}.${extension.toLowerCase()}`;
      await writeFile(path.join(uploadsDir, filename), Buffer.from(await imageFile.arrayBuffer()));
      return `/uploads/${filename}`;
    };
    const primaryImage = file instanceof File && file.size > 0 ? await saveFile(file) : undefined;
    const uploadedImages = await Promise.all(additionalFiles.map(saveFile));
    const image = primaryImage ?? product.image;

    const nextProduct = {
      ...product,
      image,
      images: Array.from(new Set([image, ...product.images, ...uploadedImages])).slice(0, 6),
    };
    const updatedProduct = await replaceProduct(nextProduct);
    if (!updatedProduct) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    return NextResponse.json(updatedProduct);
  } catch {
    return NextResponse.json({ error: "Impossible de mettre à jour l’image." }, { status: 400 });
  }
}
