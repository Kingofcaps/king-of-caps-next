import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminToken } from "@/app/lib/admin-auth";
import { getProduct, replaceProduct } from "@/app/lib/products";
import { deleteProductImages, uploadProductImage } from "@/app/lib/product-images";

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

  const uploadedUrls: string[] = [];
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
    const product = await getProduct(id);
    if (!product) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });

    const saveFile = async (imageFile: File) => {
      const uploaded = await uploadProductImage(imageFile, id);
      uploadedUrls.push(uploaded.publicUrl);
      return uploaded.publicUrl;
    };
    const primaryImage = file instanceof File && file.size > 0 ? await saveFile(file) : undefined;
    const uploadedImages: string[] = [];
    for (const additionalFile of additionalFiles) uploadedImages.push(await saveFile(additionalFile));
    const image = primaryImage ?? product.image;

    const nextProduct = {
      ...product,
      image,
      images: Array.from(new Set([image, ...product.images, ...uploadedImages])).slice(0, 6),
    };
    const updatedProduct = await replaceProduct(nextProduct);
    if (!updatedProduct) throw new Error("Produit introuvable.");
    if (primaryImage) {
      try {
        await deleteProductImages([product.image]);
      } catch (cleanupError) {
        console.error("Previous product image cleanup failed:", cleanupError);
      }
    }
    return NextResponse.json(updatedProduct);
  } catch (error) {
    if (uploadedUrls.length > 0) {
      try {
        await deleteProductImages(uploadedUrls);
      } catch (cleanupError) {
        console.error("Replacement image cleanup failed:", cleanupError);
      }
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de mettre à jour l’image." },
      { status: 400 },
    );
  }
}
