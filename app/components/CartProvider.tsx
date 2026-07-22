"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import {
  CART_STORAGE_KEY,
  addCartItem,
  cartItemCount,
  removeCartItem,
  sanitizeCart,
  updateCartItemQuantity,
  type CartItem,
} from "@/app/lib/cart";

const CART_CHANGE_EVENT = "king-of-caps-cart-change";
const EMPTY_CART_SNAPSHOT = "[]";

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  hydrated: boolean;
  addItem: (item: CartItem) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function subscribeToCart(callback: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === CART_STORAGE_KEY) callback();
  }
  window.addEventListener("storage", handleStorage);
  window.addEventListener(CART_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CART_CHANGE_EVENT, callback);
  };
}

function getCartSnapshot() {
  return window.localStorage.getItem(CART_STORAGE_KEY) ?? EMPTY_CART_SNAPSHOT;
}

function getServerCartSnapshot() {
  return EMPTY_CART_SNAPSHOT;
}

function subscribeToHydration() {
  return () => {};
}

function writeCart(items: CartItem[]) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_CHANGE_EVENT));
}

function readCart() {
  try {
    return sanitizeCart(JSON.parse(getCartSnapshot()));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribeToCart, getCartSnapshot, getServerCartSnapshot);
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const items = useMemo(() => {
    try {
      return sanitizeCart(JSON.parse(snapshot));
    } catch {
      return [];
    }
  }, [snapshot]);

  const addItem = useCallback((item: CartItem) => writeCart(addCartItem(readCart(), item)), []);
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    writeCart(updateCartItemQuantity(readCart(), productId, quantity));
  }, []);
  const removeItem = useCallback((productId: string) => {
    writeCart(removeCartItem(readCart(), productId));
  }, []);
  const clearCart = useCallback(() => writeCart([]), []);

  const value = useMemo(() => ({
    items,
    itemCount: cartItemCount(items),
    hydrated,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  }), [items, hydrated, addItem, updateQuantity, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart doit être utilisé dans CartProvider.");
  return context;
}
