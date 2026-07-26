import { normalizeProductImageUrl } from "./product-image-url.ts";
import { getProductPrice, type Currency, type ProductPrices } from "./currency.ts";

export const CART_STORAGE_KEY = "king-of-caps-cart-v2";
export const LEGACY_CART_STORAGE_KEY = "king-of-caps-cart-v1";
export const PENDING_CART_ORDER_KEY = "king-of-caps-pending-cart-order";

export type CartItem = ProductPrices & {
  productId: string;
  name: string;
  image: string;
  quantity: number;
  stockQuantity: number;
};

function positiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

export function sanitizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  const items = new Map<string, CartItem>();
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const raw = candidate as Partial<CartItem>;
    const productId = typeof raw.productId === "string" ? raw.productId.trim() : "";
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    const image = normalizeProductImageUrl(typeof raw.image === "string" ? raw.image : null);
    const legacyPrice = positiveInteger((raw as Partial<CartItem> & { unitPrice?: number }).unitPrice);
    const priceXof = positiveInteger(raw.priceXof) || legacyPrice;
    const priceEur = positiveInteger(raw.priceEur) || Math.round(priceXof / 655.957) * 100;
    const priceUsd = positiveInteger(raw.priceUsd) || Math.round(priceXof / 555.5555555556) * 100;
    const stockQuantity = positiveInteger(raw.stockQuantity);
    if (!productId || !name || !image || priceXof < 1 || priceEur < 1 || priceUsd < 1 || stockQuantity < 1) continue;

    const quantity = Math.min(Math.max(1, positiveInteger(raw.quantity)), stockQuantity);
    const existing = items.get(productId);
    items.set(productId, {
      productId,
      name,
      image,
      priceXof,
      priceEur,
      priceUsd,
      stockQuantity,
      quantity: Math.min((existing?.quantity ?? 0) + quantity, stockQuantity),
    });
  }

  return Array.from(items.values());
}

export function addCartItem(items: CartItem[], item: CartItem) {
  const cleanItem = sanitizeCart([item])[0];
  if (!cleanItem) return items;
  const existing = items.find((candidate) => candidate.productId === cleanItem.productId);
  if (!existing) return [...items, cleanItem];

  return items.map((candidate) => candidate.productId === cleanItem.productId
    ? {
        ...cleanItem,
        quantity: Math.min(candidate.quantity + cleanItem.quantity, cleanItem.stockQuantity),
      }
    : candidate);
}

export function updateCartItemQuantity(items: CartItem[], productId: string, quantity: number) {
  return items.map((item) => item.productId === productId
    ? { ...item, quantity: Math.min(Math.max(1, positiveInteger(quantity)), item.stockQuantity) }
    : item);
}

export function removeCartItem(items: CartItem[], productId: string) {
  return items.filter((item) => item.productId !== productId);
}

export function cartItemCount(items: CartItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function cartSubtotal(items: CartItem[], currency: Currency) {
  return items.reduce((total, item) => total + getProductPrice(item, currency) * item.quantity, 0);
}
