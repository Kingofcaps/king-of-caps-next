"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Product } from "@/app/lib/products";
import FavoriteButton from "./FavoriteButton";
import { useFavorites } from "./FavoritesProvider";
import ProductCardImage from "./ProductCardImage";
import ProductCardPrice from "./ProductCardPrice";

export default function FavoriteProducts({ products }: { products: Product[] }) {
  const { favoriteIds, hydrated } = useFavorites();
  const favorites = useMemo(
    () => products.filter((product) => favoriteIds.has(product.id)),
    [favoriteIds, products],
  );

  if (!hydrated) {
    return <div className="mt-8 h-40 animate-pulse rounded-2xl bg-zinc-100" aria-label="Chargement des favoris" />;
  }

  if (favorites.length === 0) {
    return (
      <div className="mt-8 rounded-3xl border border-dashed border-zinc-300 bg-white px-5 py-14 text-center">
        <p className="text-lg font-black text-zinc-900">Aucun favori pour le moment</p>
        <p className="mt-2 text-sm text-zinc-500">Touchez le cœur d’un produit pour le retrouver ici.</p>
        <Link href="/#collection" className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-[#c9a227]">Découvrir la collection</Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-7 lg:grid-cols-4">
      {favorites.map((product) => (
        <article key={product.id} className="overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-t-[18px] bg-zinc-100">
            <Link href={`/product/${product.id}`} aria-label={`Voir ${product.name}`} className="block h-full">
              <ProductCardImage src={product.image} alt={product.name} className="object-cover object-center" />
            </Link>
            <FavoriteButton productId={product.id} productName={product.name} />
          </div>
          <div className="p-3 sm:p-4">
            <Link href={`/product/${product.id}`} className="block truncate text-sm font-black text-black transition hover:text-[#c9a227] sm:text-lg">{product.name}</Link>
            <ProductCardPrice prices={product} inStock={product.inStock} />
            <Link href={`/product/${product.id}`} className="mt-3 block rounded-xl border border-[#d4af37] px-3 py-2 text-center text-xs font-black text-[#a8861e] transition hover:bg-[#d4af37] hover:text-black">Voir le produit</Link>
          </div>
        </article>
      ))}
    </div>
  );
}
