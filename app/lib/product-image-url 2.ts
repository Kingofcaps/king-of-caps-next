export const PRODUCT_IMAGE_FALLBACK = "/images/logo.jpg";

const NEXT_IMAGE_PATH = "/_next/image";

function logInvalidProductImage(value: string | null | undefined, reason: string) {
  if (process.env.NODE_ENV !== "development") return;
  console.warn(`[images] src produit invalide (${reason}) :`, value);
}

function extractFromJson(value: string) {
  if (!/^[\[{"]/.test(value)) return value;

  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed === "string") return parsed.trim();
    if (Array.isArray(parsed)) {
      return parsed.find((entry): entry is string => typeof entry === "string" && entry.trim() !== "")?.trim() ?? "";
    }
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const candidate = record.url ?? record.src ?? record.image;
      return typeof candidate === "string" ? candidate.trim() : "";
    }
  } catch {
    return "";
  }

  return "";
}

function extractSingleCandidate(value: string) {
  let candidate = extractFromJson(value.trim());
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
  for (const parameter of ["w", "q", "width", "quality"]) {
    url.searchParams.delete(parameter);
  }
  url.hash = "";
}

export function normalizeProductImageUrl(value: string | null | undefined): string {
  let candidate = typeof value === "string" ? extractSingleCandidate(value) : "";
  if (!candidate) {
    logInvalidProductImage(value, "valeur vide ou non exploitable");
    return PRODUCT_IMAGE_FALLBACK;
  }

  candidate = unwrapNextImageUrl(candidate);
  candidate = extractSingleCandidate(candidate);
  if (!candidate || candidate.startsWith(NEXT_IMAGE_PATH) || /[\u0000-\u001f\u007f]/.test(candidate)) {
    logInvalidProductImage(value, "format interdit");
    return PRODUCT_IMAGE_FALLBACK;
  }

  if (candidate.startsWith("/") && !candidate.startsWith("//")) {
    try {
      const url = new URL(candidate, "http://king-of-caps.local");
      cleanSearchParams(url);
      return `${url.pathname}${url.search}`;
    } catch {
      logInvalidProductImage(value, "chemin local invalide");
      return PRODUCT_IMAGE_FALLBACK;
    }
  }

  if (!/^https?:\/\//i.test(candidate)) {
    logInvalidProductImage(value, "protocole non autorisé");
    return PRODUCT_IMAGE_FALLBACK;
  }

  try {
    const url = new URL(candidate);
    if (!(["http:", "https:"] as string[]).includes(url.protocol) || url.username || url.password) {
      throw new Error("URL distante interdite");
    }
    cleanSearchParams(url);
    const pathname = decodeURI(url.pathname);
    return `${url.origin}${pathname}${url.search}`;
  } catch {
    logInvalidProductImage(value, "URL distante invalide");
    return PRODUCT_IMAGE_FALLBACK;
  }
}

export function logProductImageLoadError(value: string) {
  if (process.env.NODE_ENV !== "development") return;
  console.warn("[images] échec de chargement du src produit :", value);
}

export function shouldBypassProductImageOptimization(value: string) {
  if (value.startsWith("/")) return false;

  try {
    const imageUrl = new URL(value);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return true;
    const configuredSupabaseUrl = new URL(supabaseUrl.trim());
    return imageUrl.protocol !== "https:"
      || imageUrl.hostname !== configuredSupabaseUrl.hostname
      || !imageUrl.pathname.startsWith("/storage/v1/object/public/product-images/")
      || imageUrl.search !== "";
  } catch {
    return true;
  }
}
