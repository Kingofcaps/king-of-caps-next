import { formatFcfaPrice } from "@/app/lib/prices";
import { normalizeProductImageUrl, PRODUCT_IMAGE_FALLBACK } from "@/app/lib/product-image-url";

export type Product = {
  id: string;
  name: string;
  price: string;
  priceXof: number;
  priceEur: number;
  priceUsd: number;
  description: string;
  image: string;
  images: string[];
  brand: string;
  category: string;
  color: string;
  stockQuantity: number;
  featured: boolean;
  newArrival: boolean;
  available: boolean;
  inStock: boolean;
  sortOrder: number;
  createdAt: string;
};

type ProductRecord = {
  id: string;
  name: string;
  price: string;
  price_xof?: number | null;
  price_eur?: number | null;
  price_usd?: number | null;
  description: string;
  image: unknown;
  image_url?: unknown;
  imageUrl?: unknown;
  main_image?: unknown;
  product_image?: unknown;
  productImage?: unknown;
  images: unknown;
  brand: string;
  category: string;
  color: string;
  stock_quantity: number;
  featured: boolean;
  new_arrival: boolean;
  available: boolean;
  sort_order: number;
  created_at: string;
};

export class InsufficientStockError extends Error {
  constructor() {
    super("Stock insuffisant pour ce produit.");
  }
}

type SupabaseErrorPayload = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export class SupabaseProductsError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly details: string | null;
  readonly hint: string | null;

  constructor(status: number, payload: SupabaseErrorPayload) {
    super(payload.message?.trim() || `Supabase a refusé la requête produits (${status}).`);
    this.name = "SupabaseProductsError";
    this.status = status;
    this.code = payload.code ?? null;
    this.details = payload.details ?? null;
    this.hint = payload.hint ?? null;
  }
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase n’est pas configuré. Ajoutez SUPABASE_SERVICE_ROLE_KEY côté serveur.");
  }

  return { url, serviceRoleKey };
}

async function supabaseProductsRequest(path: string, init: RequestInit = {}) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    let payload: SupabaseErrorPayload = {};
    try {
      payload = responseText
        ? JSON.parse(responseText) as SupabaseErrorPayload
        : {};
    } catch {
      payload = { message: responseText || null };
    }
    throw new SupabaseProductsError(response.status, payload);
  }

  return response;
}

function normalizeImages(value: unknown, primaryImage: unknown) {
  const additionalImages = Array.isArray(value)
    ? value.filter((image): image is string => typeof image === "string")
      .map(normalizeProductImageUrl)
      .filter((image) => image !== PRODUCT_IMAGE_FALLBACK)
    : [];
  return Array.from(new Set([normalizeProductImageUrl(primaryImage), ...additionalImages])).slice(0, 6);
}

function toProduct(record: ProductRecord): Product {
  const stockQuantity = Math.max(0, Math.floor(Number(record.stock_quantity) || 0));
  const available = record.available !== false && stockQuantity > 0;
  const rawImageFields = {
    image: record.image,
    image_url: record.image_url,
    imageUrl: record.imageUrl,
    product_image: record.product_image,
    productImage: record.productImage,
  };
  const rawImage = [
    ...Object.values(rawImageFields),
    record.main_image,
    record.images,
  ];
  const normalizedImage = normalizeProductImageUrl(rawImage);

  if (process.env.NODE_ENV === "development") {
    console.log("[IMAGE PRODUIT]", {
      nom: record.name,
      valeurBrute: rawImageFields,
      urlFinale: normalizedImage === PRODUCT_IMAGE_FALLBACK ? null : normalizedImage,
    });
  }

  const legacyXof = Number(String(record.price ?? "").replace(/[^0-9]/g, "")) || 0;
  const priceXof = Math.max(0, Math.round(Number(record.price_xof) || legacyXof));
  const priceEur = Math.max(0, Math.round(Number(record.price_eur) || Math.round(priceXof / 655.957) * 100));
  const priceUsd = Math.max(0, Math.round(Number(record.price_usd) || Math.round(priceXof / 555.5555555556) * 100));

  return {
    id: record.id,
    name: record.name,
    price: formatFcfaPrice(priceXof),
    priceXof,
    priceEur,
    priceUsd,
    description: record.description,
    image: normalizedImage,
    images: normalizeImages(record.images, normalizedImage),
    brand: record.brand,
    category: record.category,
    color: record.color,
    stockQuantity,
    featured: record.featured === true,
    newArrival: record.new_arrival === true,
    available,
    inStock: available,
    sortOrder: Number.isFinite(Number(record.sort_order)) ? Number(record.sort_order) : Number.MAX_SAFE_INTEGER,
    createdAt: record.created_at || new Date(0).toISOString(),
  };
}

function toRecord(product: Product): ProductRecord {
  const stockQuantity = Math.max(0, Math.floor(product.stockQuantity));
  return {
    id: product.id,
    name: product.name,
    price: formatFcfaPrice(product.priceXof),
    price_xof: Math.max(0, Math.round(product.priceXof)),
    price_eur: Math.max(0, Math.round(product.priceEur)),
    price_usd: Math.max(0, Math.round(product.priceUsd)),
    description: product.description,
    image: product.image,
    images: normalizeImages(product.images, product.image),
    brand: product.brand,
    category: product.category,
    color: product.color,
    stock_quantity: stockQuantity,
    featured: product.featured,
    new_arrival: product.newArrival,
    available: stockQuantity > 0,
    sort_order: product.sortOrder,
    created_at: product.createdAt,
  };
}

export async function getProducts() {
  let response: Response;
  try {
    response = await supabaseProductsRequest("products?select=*&order=sort_order.asc.nullslast,created_at.desc");
  } catch {
    response = await supabaseProductsRequest("products?select=*&order=created_at.desc");
  }
  return ((await response.json()) as ProductRecord[]).map(toProduct);
}

export async function getProduct(id: string) {
  const response = await supabaseProductsRequest(`products?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
  const [product] = (await response.json()) as ProductRecord[];
  return product ? toProduct(product) : undefined;
}

export async function updateProductStock(id: string, quantity: number) {
  const stockQuantity = Math.max(0, Math.floor(quantity));
  const response = await supabaseProductsRequest(
    `products?id=eq.${encodeURIComponent(id)}&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        stock_quantity: stockQuantity,
        available: stockQuantity > 0,
      }),
    },
  );
  const [product] = (await response.json()) as ProductRecord[];
  return product ? toProduct(product) : undefined;
}

export async function insertProduct(product: Product) {
  const response = await supabaseProductsRequest("products", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(toRecord(product)),
  });
  const [createdProduct] = (await response.json()) as ProductRecord[];
  return createdProduct ? toProduct(createdProduct) : undefined;
}

export async function replaceProduct(product: Product) {
  const response = await supabaseProductsRequest(
    `products?id=eq.${encodeURIComponent(product.id)}&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(toRecord(product)),
    },
  );
  const [updatedProduct] = (await response.json()) as ProductRecord[];
  return updatedProduct ? toProduct(updatedProduct) : undefined;
}

export async function removeProduct(id: string) {
  await supabaseProductsRequest(`products?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

export async function persistProductOrder(productIds: string[]) {
  await supabaseProductsRequest("rpc/reorder_products", {
    method: "POST",
    body: JSON.stringify({ p_product_ids: productIds }),
  });
}

export async function reserveProductStock(productId: string, quantity: number) {
  const response = await supabaseProductsRequest("rpc/reserve_product_stock", {
    method: "POST",
    body: JSON.stringify({ p_product_id: productId, p_quantity: quantity }),
  });
  const [product] = (await response.json()) as ProductRecord[];
  if (!product) throw new InsufficientStockError();
  return toProduct(product);
}

export async function restoreProductStock(productId: string, quantity: number) {
  const response = await supabaseProductsRequest("rpc/restore_product_stock", {
    method: "POST",
    body: JSON.stringify({ p_product_id: productId, p_quantity: quantity }),
  });
  const [product] = (await response.json()) as ProductRecord[];
  if (!product) throw new Error("Produit introuvable pour restaurer le stock.");
  return toProduct(product);
}
