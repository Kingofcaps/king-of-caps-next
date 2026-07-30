import { buildProductCreatePayload } from "@/app/lib/product-create-payload";

export const MAX_PRODUCT_IMAGE_WIDTH = 1200;
export const TARGET_PRODUCT_IMAGE_BYTES = 500 * 1024;
const MAX_SOURCE_IMAGE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type SignedUpload = {
  signedUrl: string;
  publicUrl: string;
};

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

async function loadImage(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    return { image, width: image.naturalWidth, height: image.naturalHeight };
  } catch {
    throw new Error("Cette image est illisible ou endommagée.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function compressProductImage(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Seules les images JPEG, PNG et WebP sont autorisées.");
  }
  if (file.size === 0) throw new Error("Le fichier image est vide.");
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error("L’image source est trop lourde (25 Mo maximum).");
  }

  const { image, width, height } = await loadImage(file);
  let outputWidth = Math.min(width, MAX_PRODUCT_IMAGE_WIDTH);
  let outputHeight = Math.max(1, Math.round(height * (outputWidth / width)));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Votre navigateur ne peut pas compresser cette image.");

  let compressed: Blob | null = null;
  for (let scaleAttempt = 0; scaleAttempt < 5; scaleAttempt += 1) {
    canvas.width = Math.max(1, Math.round(outputWidth));
    canvas.height = Math.max(1, Math.round(outputHeight));
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
      compressed = await canvasToBlob(canvas, "image/webp", quality);
      if (compressed?.type !== "image/webp") {
        compressed = await canvasToBlob(canvas, "image/jpeg", quality);
      }
      if (compressed && compressed.size <= TARGET_PRODUCT_IMAGE_BYTES) break;
    }
    if (compressed && compressed.size <= TARGET_PRODUCT_IMAGE_BYTES) break;
    outputWidth *= 0.82;
    outputHeight *= 0.82;
  }

  if (!compressed || compressed.size > TARGET_PRODUCT_IMAGE_BYTES) {
    throw new Error("L’image reste supérieure à 500 Ko après compression. Choisissez une image plus légère.");
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "produit";
  const extension = compressed.type === "image/webp" ? "webp" : "jpg";
  return new File([compressed], `${baseName}.${extension}`, { type: compressed.type });
}

function uploadWithProgress(signedUrl: string, file: File, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const body = new FormData();
    body.append("cacheControl", "31536000");
    body.append("", file);
    request.open("PUT", signedUrl);
    request.setRequestHeader("x-upsert", "false");
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error("Le téléversement de l’image vers Supabase a échoué."));
      }
    });
    request.addEventListener("error", () => reject(new Error("Connexion interrompue pendant le téléversement de l’image.")));
    request.addEventListener("abort", () => reject(new Error("Le téléversement de l’image a été annulé.")));
    request.send(body);
  });
}

export async function uploadProductImageDirect(
  file: File,
  productId: string,
  onProgress: (progress: number) => void,
) {
  onProgress(0);
  const compressed = await compressProductImage(file);
  const signResponse = await fetch("/api/admin/product-images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, contentType: compressed.type }),
  });
  const signed = await signResponse.json().catch(() => null) as (SignedUpload & { error?: string }) | null;
  if (!signResponse.ok || !signed?.signedUrl || !signed.publicUrl) {
    throw new Error(signed?.error || "Impossible de préparer le téléversement de l’image.");
  }
  await uploadWithProgress(signed.signedUrl, compressed, onProgress);
  return signed.publicUrl;
}

export async function cleanupUploadedProductImages(imageUrls: string[]) {
  if (imageUrls.length === 0) return;
  try {
    const response = await fetch("/api/admin/product-images", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrls }),
    });
    if (!response.ok) console.error("Le nettoyage des images orphelines a échoué.");
  } catch (error) {
    console.error("Le nettoyage des images orphelines a échoué.", error);
  }
}

export { buildProductCreatePayload };
