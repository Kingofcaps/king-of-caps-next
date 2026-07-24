export const PRODUCT_IMAGE_FALLBACK = "/images/product-image-unavailable.svg";

const NEXT_IMAGE_PATH = "/_next/image";
const PUBLIC_BUCKET_PATH = "/storage/v1/object/public/product-images/";
const RENDER_BUCKET_PATH = "/storage/v1/render/image/public/product-images/";
const PRODUCT_IMAGES_BUCKET_PREFIX = "product-images/";
const LEGACY_LOGO_PATH = "/images/logo.jpg";

function logInvalidProductImage(value: unknown) {
  if (process.env.NODE_ENV !== "development") return;
  console.warn("[images] aucune URL produit exploitable :", value);
}

function collectCandidates(value: unknown, depth = 0): string[] {
  if (depth > 3 || value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap((entry) => collectCandidates(entry, depth + 1));

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return [
      "url",
      "src",
      "image",
      "image_url",
      "imageUrl",
      "main_image",
      "product_image",
      "productImage",
      "images",
    ]
      .flatMap((key) => collectCandidates(record[key], depth + 1));
  }

  if (typeof value !== "string") return [];
  const candidate = value.trim();
  if (!candidate) return [];

  if (/^[\[{"]/.test(candidate)) {
    try {
      return collectCandidates(JSON.parse(candidate) as unknown, depth + 1);
    } catch {
      return [];
    }
  }

  return [candidate];
}

function extractSingleCandidate(value: string) {
  let candidate = value.trim();
  const secondHttpUrl = candidate.slice(8).search(/https?:\/\//i);
  if (secondHttpUrl >= 0) candidate = candidate.slice(0, secondHttpUrl + 8);

  const separatedUrl = candidate.search(/\s+(?=https?:\/\/|\/)/i);
  if (separatedUrl >= 0) candidate = candidate.slice(0, separatedUrl);

  const separatedLocalUrl = candidate.search(/[,;|]\s*(?=\/)/);
  if (separatedLocalUrl >= 0) candidate = candidate.slice(0, separatedLocalUrl);

  return candidate.trim().replace(/[,;|]+$/, "");
}

function unwrapNextImageUrl(value: string) {
  try {
    const url = new URL(value, "http://king-of-caps.local");
    if (url.pathname !== NEXT_IMAGE_PATH) return value;
    return url.searchParams.get("url")?.trim() ?? "";
  } catch {
    return "";
  }
}

function configuredSupabaseOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!configuredUrl) return null;

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return null;
  }
}

function encodeStoragePath(value: string) {
  const segments = value.split("/").filter(Boolean);
  if (segments.length === 0 || segments.some((segment) => segment === "." || segment === "..")) {
    return null;
  }

  try {
    return segments
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join("/");
  } catch {
    return null;
  }
}

function publicSupabaseUrlFromRelativePath(value: string) {
  const origin = configuredSupabaseOrigin();
  if (!origin) return null;

  let storagePath = value.trim().replace(/^\/+/, "");
  if (storagePath.startsWith(PUBLIC_BUCKET_PATH.slice(1))) {
    storagePath = storagePath.slice(PUBLIC_BUCKET_PATH.length - 1);
  } else if (storagePath.startsWith(PRODUCT_IMAGES_BUCKET_PREFIX)) {
    storagePath = storagePath.slice(PRODUCT_IMAGES_BUCKET_PREFIX.length);
  } else if (storagePath.startsWith("storage/v1/object/public/")) {
    return null;
  }

  const encodedPath = encodeStoragePath(storagePath);
  return encodedPath ? `${origin}${PUBLIC_BUCKET_PATH}${encodedPath}` : null;
}

function normalizeCandidate(value: string) {
  let candidate = extractSingleCandidate(value);
  candidate = extractSingleCandidate(unwrapNextImageUrl(candidate));
  if (!candidate || candidate.startsWith(NEXT_IMAGE_PATH) || /[\u0000-\u001f\u007f]/.test(candidate)) return null;

  if (candidate.startsWith("/") && !candidate.startsWith("//")) {
    if (candidate.startsWith(PUBLIC_BUCKET_PATH)) {
      return publicSupabaseUrlFromRelativePath(candidate);
    }

    try {
      const url = new URL(candidate, "http://king-of-caps.local");
      if (url.pathname === LEGACY_LOGO_PATH) return null;
      return `${url.pathname}${url.search}`;
    } catch {
      return null;
    }
  }

  if (!/^https?:\/\//i.test(candidate)) {
    return publicSupabaseUrlFromRelativePath(candidate);
  }

  try {
    const url = new URL(candidate);
    if (!(["http:", "https:"] as string[]).includes(url.protocol) || url.username || url.password) return null;
    if (url.pathname === LEGACY_LOGO_PATH) return null;
    return candidate;
  } catch {
    return null;
  }
}

export function normalizeProductImageUrl(value: unknown): string {
  for (const candidate of collectCandidates(value)) {
    const normalized = normalizeCandidate(candidate);
    if (normalized) return normalized;
  }
  logInvalidProductImage(value);
  return PRODUCT_IMAGE_FALLBACK;
}

export function logProductImageLoadError(value: string, productName?: string) {
  if (process.env.NODE_ENV !== "development") return;
  console.warn("[images] image produit inaccessible", {
    produit: productName || "Produit inconnu",
    url: value,
  });
}

export function productImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  try {
    const url = new URL(src);
    if (!url.pathname.startsWith(PUBLIC_BUCKET_PATH)) return src;

    url.pathname = url.pathname.replace(PUBLIC_BUCKET_PATH, RENDER_BUCKET_PATH);
    url.searchParams.set("width", String(width));
    url.searchParams.set("quality", String(quality ?? 90));
    url.searchParams.set("resize", "cover");
    return url.toString();
  } catch {
    return src;
  }
}
