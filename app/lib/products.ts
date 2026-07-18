import { formatFcfaPrice } from "@/app/lib/prices";

export type Product = {
  id: string;
  name: string;
  price: string;
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
  description: string;
  image: string;
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
    throw new Error(`Supabase a refusé la requête produits (${response.status}).`);
  }

  return response;
}

function normalizeImages(value: unknown, primaryImage: string) {
  const additionalImages = Array.isArray(value)
    ? value.filter((image): image is string =>
        typeof image === "string" && (image.startsWith("/") || /^https:\/\//i.test(image)),
      )
    : [];
  return Array.from(new Set([primaryImage, ...additionalImages])).slice(0, 6);
}

function toProduct(record: ProductRecord): Product {
  const stockQuantity = Math.max(0, Math.floor(Number(record.stock_quantity) || 0));
  const available = record.available !== false && stockQuantity > 0;

  return {
    id: record.id,
    name: record.name,
    price: formatFcfaPrice(record.price),
    description: record.description,
    image: record.image,
    images: normalizeImages(record.images, record.image),
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
    price: product.price,
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
