"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/app/components/CartProvider";
import type { CartItem } from "@/app/lib/cart";

export default function ProductPurchaseActions({ product }: { product: Omit<CartItem, "quantity"> }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const atMaximum = quantity >= product.stockQuantity;

  function addToCart() {
    addItem({ ...product, quantity });
    setMessage("Produit ajouté au panier");
    window.setTimeout(() => setMessage(""), 2200);
  }

  return (
    <div className="mt-10">
      <div className="flex items-center gap-4">
        <span className="text-sm font-bold text-zinc-700">Quantité</span>
        <div className="inline-flex items-center rounded-xl border border-[#d4d4d4] bg-white">
          <button type="button" aria-label="Diminuer la quantité" onClick={() => setQuantity((current) => Math.max(1, current - 1))} disabled={quantity === 1} className="px-4 py-2 text-xl disabled:cursor-not-allowed disabled:opacity-35">−</button>
          <span className="min-w-10 text-center font-black">{quantity}</span>
          <button type="button" aria-label="Augmenter la quantité" onClick={() => setQuantity((current) => Math.min(product.stockQuantity, current + 1))} disabled={atMaximum} className="px-4 py-2 text-xl disabled:cursor-not-allowed disabled:opacity-35">+</button>
        </div>
        {atMaximum && <span className="text-xs font-semibold text-zinc-500">Stock maximal atteint</span>}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={addToCart} className="w-full rounded-xl bg-black px-6 py-4 text-base font-black text-white transition hover:bg-[#c9a227]">Ajouter au panier</button>
        <button type="button" onClick={() => router.push(`/checkout/${encodeURIComponent(product.productId)}?quantity=${quantity}`)} className="w-full rounded-xl border-2 border-[#c9a227] bg-white px-6 py-4 text-base font-black text-black transition hover:bg-[#c9a227]/10">Commander maintenant</button>
      </div>
      <p aria-live="polite" className={`mt-3 min-h-5 text-sm font-bold text-emerald-700 transition ${message ? "opacity-100" : "opacity-0"}`}>{message || "Produit ajouté au panier"}</p>
    </div>
  );
}
