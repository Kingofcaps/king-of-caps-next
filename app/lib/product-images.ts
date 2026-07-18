import "server-only";

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const PRODUCT_IMAGES_BUCKET = "product-images";
export const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024;

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase Storage n’est pas configuré côté serveur.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function validateProductImage(file: File) {
  const extension = CONTENT_TYPE_EXTENSIONS[file.type];
  if (!extension) {
    throw new Error("Seules les images JPEG, PNG et WebP sont autorisées.");
  }
  if (file.size === 0) {
    throw new Error("Le fichier image est vide.");
  }
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error("Chaque image doit peser au maximum 10 Mo.");
  }

  return extension;
}

function safeProductScope(productId: string) {
  const scope = productId.replace(/[^a-zA-Z0-9_-]/g, "");
  return scope || randomUUID();
}

export async function uploadProductImage(file: File, productId: string) {
  const extension = validateProductImage(file);
  const path = `products/${safeProductScope(productId)}/${randomUUID()}.${extension}`;
  const supabase = getStorageClient();
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    if (/bucket not found/i.test(error.message)) {
      throw new Error(`Le bucket Supabase Storage « ${PRODUCT_IMAGES_BUCKET} » n’existe pas.`);
    }
    throw new Error(`Échec de l’upload de l’image : ${error.message}`);
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
    throw new Error("Supabase Storage n’a pas retourné d’URL publique.");
  }

  return { path, publicUrl: data.publicUrl };
}

export function getProductImageStoragePath(imageUrl: string) {
  try {
    const url = new URL(imageUrl);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || url.origin !== new URL(supabaseUrl).origin) return null;
    const marker = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    const encodedPath = url.pathname.slice(markerIndex + marker.length);
    if (!encodedPath) return null;
    return encodedPath
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join("/");
  } catch {
    return null;
  }
}

export async function deleteProductImages(imageUrls: Iterable<string>) {
  const paths = Array.from(
    new Set(
      Array.from(imageUrls)
        .map(getProductImageStoragePath)
        .filter((path): path is string => path !== null),
    ),
  );
  if (paths.length === 0) return;

  const { error } = await getStorageClient().storage.from(PRODUCT_IMAGES_BUCKET).remove(paths);
  if (error) throw new Error(`Impossible de supprimer les images du Storage : ${error.message}`);
}
