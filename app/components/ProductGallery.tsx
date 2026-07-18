"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDualPrice } from "@/app/lib/prices";
import type { Product } from "@/app/lib/products";
import ProductReveal from "./ProductReveal";
import TrendingProducts from "./TrendingProducts";

const WHATSAPP_URL = "https://wa.me/22950687515";

function getOrderUrl(product: Product) {
  const message = `Bonjour KING OF CAPS, je souhaite commander ${product.name} au prix de ${formatDualPrice(product.price)}.`;
  return `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
}

export default function ProductGallery({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    function handleSearch(event: Event) {
      setSearch((event as CustomEvent<string>).detail);
    }

    window.addEventListener("king-of-caps-search", handleSearch);
    return () => window.removeEventListener("king-of-caps-search", handleSearch);
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) || product.image.toLowerCase().includes(query),
    );
  }, [products, search]);

  return (
    <section id="collection" className="mx-auto max-w-7xl px-5 pb-12 pt-2 sm:px-8 sm:pb-16 sm:pt-3">
      <TrendingProducts products={products} />

      <div className="mt-3 text-center">
        <h2 className="text-sm font-black tracking-[0.2em] text-zinc-950 sm:text-base">NOS COLLECTIONS</h2>
        <p className="mt-1 text-sm text-zinc-500" aria-live="polite">
          {filteredProducts.length}{" "}
          {filteredProducts.length > 1 ? "casquettes disponibles" : "casquette disponible"}
        </p>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
          {filteredProducts.map((product, index) => (
            <ProductReveal key={product.id} index={index}>
              <article className="group h-full overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(0,0,0,0.1)]">
              <Link
                href={`/product/${product.id}`}
                className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                aria-label={`Voir ${product.name}`}
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-t-[18px] bg-zinc-100">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 639px) 33vw, (max-width: 1023px) 50vw, 25vw"
                    className="object-cover object-center transition duration-500 group-hover:scale-105"
                  />
                  {product.images.length > 1 && (
                    <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-1 text-[9px] font-bold text-white shadow-sm backdrop-blur-sm sm:text-xs">
                      {product.images.length} photos
                    </span>
                  )}
                </div>
              </Link>
              <div className="p-2.5 sm:p-4">
                <Link
                  href={`/product/${product.id}`}
                  className="block truncate text-[10px] font-bold text-black transition hover:text-[#d4af37] sm:text-lg"
                >
                  {product.name}
                </Link>
                <div className="mt-1 flex items-center justify-between gap-1 sm:gap-3">
                  <p className="text-[10px] font-black leading-tight text-[#d4af37] sm:text-lg">{formatDualPrice(product.price)}</p>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold sm:px-2.5 sm:py-1 sm:text-xs ${product.inStock ? "bg-emerald-900 text-emerald-100" : "bg-red-50 text-red-600"}`}>
                    {product.inStock ? "En stock" : "Rupture de stock"}
                  </span>
                </div>
                <div className="mt-2 sm:mt-3">
                  <Link href={`/product/${product.id}`} className="block bg-transparent text-center text-[10px] font-black tracking-wide text-[#d4af37] transition hover:text-black sm:hidden">→ VOIR</Link>
                  <div className="hidden grid-cols-2 gap-2 sm:grid">
                    {product.inStock ? <Link href={`/checkout/${product.id}`} className="rounded-xl bg-[#d4af37] px-3 py-2.5 text-center text-sm font-black text-zinc-950 transition hover:bg-[#c9a227]">Commander en ligne</Link> : <span aria-disabled="true" className="cursor-not-allowed rounded-xl bg-zinc-200 px-3 py-2.5 text-center text-sm font-black text-zinc-500">Rupture de stock</span>}
                    <a href={getOrderUrl(product)} target="_blank" rel="noreferrer" className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3 py-2.5 text-center text-sm font-black text-zinc-800 transition hover:border-[#c9a227] hover:bg-white">Commander via WhatsApp</a>
                  </div>
                </div>
              </div>
              </article>
            </ProductReveal>
          ))}
        </div>
      ) : (
        <p className="mt-10 text-center text-zinc-400">
          Aucune casquette ne correspond à votre recherche.
        </p>
      )}
    </section>
  );
}
