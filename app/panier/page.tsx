"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import CartLink from "@/app/components/CartLink";
import { useCart } from "@/app/components/CartProvider";
import { cartSubtotal } from "@/app/lib/cart";
import { formatMoney, getProductPrice } from "@/app/lib/currency";
import ProductImage from "@/app/components/ProductImage";
import { useCurrency } from "@/app/components/CurrencyProvider";
import CurrencySelector from "@/app/components/CurrencySelector";

export default function CartPage() {
  const { items, itemCount, hydrated, updateQuantity, removeItem } = useCart();
  const { currency } = useCurrency();
  const subtotal = cartSubtotal(items, currency);

  return (
    <main className="min-h-screen bg-[#fafafa] text-zinc-950">
      <header className="border-b border-[#e5e5e5] bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8"><Link href="/" className="text-sm font-black tracking-[0.2em]">KING OF CAPS</Link><div className="flex items-center gap-2"><CurrencySelector /><CartLink /></div></div></header>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <p className="text-sm font-bold tracking-[0.2em] text-[#a8861e]">VOTRE SÉLECTION</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Panier</h1>

        {!hydrated ? (
          <div className="mt-8 h-40 animate-pulse rounded-3xl bg-zinc-100" aria-label="Chargement du panier" />
        ) : items.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-[#e5e5e5] bg-white p-8 text-center shadow-sm"><h2 className="text-xl font-black">Votre panier est vide</h2><p className="mt-2 text-zinc-500">Découvrez la collection et ajoutez vos casquettes préférées.</p><Link href="/#collection" className="mt-6 inline-flex rounded-xl bg-black px-5 py-3 font-black text-white">Continuer mes achats</Link></section>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
            <section className="space-y-4" aria-label="Articles du panier">
              {items.map((item) => (
                <article key={item.productId} className="grid grid-cols-[88px_1fr] gap-4 rounded-2xl border border-[#e5e5e5] bg-white p-3 shadow-sm sm:grid-cols-[112px_1fr_auto] sm:p-4">
                  <Link href={`/product/${item.productId}`} className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100"><ProductImage src={item.image} alt={item.name} fill sizes="112px" className="object-cover" /></Link>
                  <div className="min-w-0"><Link href={`/product/${item.productId}`} className="line-clamp-2 font-black hover:text-[#a8861e]">{item.name}</Link><p className="mt-1 text-sm font-bold text-[#a8861e]">{formatMoney(getProductPrice(item, currency), currency)}</p><div className="mt-3 inline-flex items-center rounded-xl border border-zinc-200"><button type="button" aria-label={`Diminuer la quantité de ${item.name}`} disabled={item.quantity <= 1} onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="grid h-9 w-9 place-items-center disabled:opacity-30"><Minus className="h-4 w-4" /></button><span className="min-w-9 text-center text-sm font-black">{item.quantity}</span><button type="button" aria-label={`Augmenter la quantité de ${item.name}`} disabled={item.quantity >= item.stockQuantity} onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="grid h-9 w-9 place-items-center disabled:cursor-not-allowed disabled:opacity-30"><Plus className="h-4 w-4" /></button></div>{item.quantity >= item.stockQuantity && <p className="mt-1 text-xs text-zinc-500">Stock maximal atteint</p>}</div>
                  <div className="col-span-2 flex items-center justify-between border-t border-zinc-100 pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:border-0 sm:pt-0"><div className="sm:text-right"><p className="text-xs font-bold text-zinc-500">Sous-total</p><p className="mt-1 font-black text-[#a8861e]">{formatMoney(getProductPrice(item, currency) * item.quantity, currency)}</p></div><button type="button" onClick={() => removeItem(item.productId)} className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /> Supprimer</button></div>
                </article>
              ))}
            </section>

            <aside className="rounded-3xl border border-[#e5e5e5] bg-white p-5 shadow-lg shadow-zinc-200/40 lg:sticky lg:top-5">
              <h2 className="text-xl font-black">Récapitulatif</h2>
              <dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-zinc-500">Articles</dt><dd className="font-bold">{itemCount}</dd></div><div className="flex justify-between gap-4"><dt className="text-zinc-500">Sous-total</dt><dd className="font-bold">{formatMoney(subtotal, currency)}</dd></div><div className="flex justify-between gap-4"><dt className="text-zinc-500">Livraison</dt><dd className="text-right font-semibold">Calculée au checkout</dd></div></dl>
              <div className="mt-5 flex justify-between border-t border-zinc-200 pt-5"><span className="font-black">Total provisoire</span><strong className="text-xl text-[#a8861e]">{formatMoney(subtotal, currency)}</strong></div>
              <Link href="/checkout" className="mt-6 flex w-full items-center justify-center rounded-xl bg-black px-5 py-4 font-black text-white transition hover:bg-[#c9a227]">Passer la commande</Link>
              <Link href="/#collection" className="mt-3 flex w-full items-center justify-center rounded-xl border border-[#c9a227] bg-white px-5 py-3.5 font-black text-black">Continuer mes achats</Link>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
