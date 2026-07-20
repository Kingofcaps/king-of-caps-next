import type { Product } from "@/app/lib/products";

export const MAX_FEATURED_PRODUCTS = 8;

function createdAtTimestamp(product: Product) {
  const timestamp = Date.parse(product.createdAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function selectFeaturedProducts(
  products: Product[],
  limit = MAX_FEATURED_PRODUCTS,
) {
  return products
    .filter((product) => product.featured === true)
    .sort((left, right) => createdAtTimestamp(right) - createdAtTimestamp(left))
    .slice(0, Math.max(0, limit));
}
