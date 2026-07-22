"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";

export default function CartLink() {
  const { itemCount, hydrated } = useCart();
  const count = hydrated ? itemCount : 0;

  return (
    <Link href="/panier" aria-label={`Panier, ${count} article${count > 1 ? "s" : ""}`} className="relative grid h-11 w-11 place-items-center rounded-full text-black transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a227]">
      <ShoppingBag aria-hidden="true" className="h-5 w-5" />
      {count > 0 && <span className="absolute right-0.5 top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#c9a227] px-1 text-[10px] font-black leading-none text-black">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}
