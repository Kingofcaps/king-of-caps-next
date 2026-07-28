"use client";

import { useFavorites } from "./FavoritesProvider";

export default function FavoriteButton({ productId, productName }: { productId: string; productName: string }) {
  const { hydrated, isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(productId);

  return (
    <button
      type="button"
      aria-label={favorite ? `Retirer ${productName} des favoris` : `Ajouter ${productName} aux favoris`}
      aria-pressed={favorite}
      disabled={!hydrated}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(productId);
      }}
      className={`absolute right-2 top-2 z-20 grid h-9 w-9 place-items-center rounded-full border bg-white/95 shadow-md backdrop-blur-sm transition duration-200 active:scale-75 disabled:opacity-70 ${favorite ? "border-red-200 text-red-500 scale-105" : "border-white/80 text-zinc-700 hover:text-red-500"}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill={favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
      </svg>
    </button>
  );
}
