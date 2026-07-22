export const PRODUCT_IMAGE_FALLBACK = "/images/logo.jpg";

const NEXT_IMAGE_PATH = "/_next/image";
const PUBLIC_BUCKET_PATH = "/storage/v1/object/public/product-images/";
const SIGNED_BUCKET_PATH = "/storage/v1/object/sign/product-images/";

function logInvalidProductImage(value: unknown) {
  if (process.env.NODE_ENV !== "development") return;
  console.warn("[images] aucune URL produit exploitable :", value);
}

function collectCandidates(value: unknown, depth = 0): string[] {
  if (depth > 3 || value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap((entry) => collectCandidates(entry, depth + 1));

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return ["url", "src", "image", "image_url", "main_image", "product_image", "images"]
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

function cleanSearchParams(url: URL) {
  for (const parameter of ["w", "q", "width", "quality"]) url.searchParams.delete(parameter);
  url.hash = "";
}

function normalizeCandidate(value: string) {
  let candidate = extractSingleCandidate(value);
  candidate = extractSingleCandidate(unwrapNextImageUrl(candidate));
  if (!candidate || candidate.startsWith(NEXT_IMAGE_PATH) || /[\u0000-\u001f\u007f]/.test(candidate)) return null;

  if (candidate.startsWith("/") && !candidate.startsWith("//")) {
    try {
      const url = new URL(candidate, "http://king-of-caps.local");
      cleanSearchParams(url);
      return `${url.pathname}${url.search}`;
    } catch {
      return null;
    }
  }

  if (!/^https?:\/\//i.test(candidate)) return null;

  try {
    const url = new URL(candidate);
    if (!(["http:", "https:"] as string[]).includes(url.protocol) || url.username || url.password) return null;
    if (url.pathname.startsWith(SIGNED_BUCKET_PATH)) {
      url.pathname = url.pathname.replace(SIGNED_BUCKET_PATH, PUBLIC_BUCKET_PATH);
      url.search = "";
    } else {
      cleanSearchParams(url);
    }
    const pathname = decodeURI(url.pathname);
    return `${url.origin}${pathname}${url.search}`;
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

export function logProductImageLoadError(value: string) {
  if (process.env.NODE_ENV !== "development") return;
  console.warn("[images] échec de chargement du src produit :", value);
}

export function shouldBypassProductImageOptimization(value: string) {
  return !value.startsWith("/");
}
