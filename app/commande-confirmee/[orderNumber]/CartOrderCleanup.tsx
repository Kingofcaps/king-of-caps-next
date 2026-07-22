"use client";

import { useEffect } from "react";
import { useCart } from "@/app/components/CartProvider";
import { PENDING_CART_ORDER_KEY } from "@/app/lib/cart";

export default function CartOrderCleanup({ orderNumber, shouldClear }: { orderNumber: string; shouldClear: boolean }) {
  const { clearCart } = useCart();

  useEffect(() => {
    if (!shouldClear) return;
    const pendingOrder = window.localStorage.getItem(PENDING_CART_ORDER_KEY);
    if (pendingOrder === orderNumber) {
      clearCart();
      window.localStorage.removeItem(PENDING_CART_ORDER_KEY);
    }
  }, [clearCart, orderNumber, shouldClear]);

  return null;
}
