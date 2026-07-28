"use client";

import Link from "next/link";
import { useFavorites } from "./FavoritesProvider";

export default function FavoritesLink() {
  const { favoriteCount } = useFavorites();

  return (
    <Link href="/favoris" aria-label={`Favoris, ${favoriteCount} produit${favoriteCount > 1 ? "s" : ""}`} className="relative grid h-11 w-11 place-items-center rounded-full text-black transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a227]">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" /></svg>
      {favoriteCount > 0 && <span className="absolute right-0.5 top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-black leading-none text-white">{favoriteCount > 99 ? "99+" : favoriteCount}</span>}
    </Link>
  );
}
