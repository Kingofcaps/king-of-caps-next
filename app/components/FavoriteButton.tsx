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
      className={`absolute right-2 top-2 z-20 grid h-[38px] w-[38px] place-items-center rounded-full border bg-white/95 shadow-sm backdrop-blur-sm transition duration-200 active:scale-90 disabled:opacity-70 sm:h-[42px] sm:w-[42px] ${favorite ? "border-red-200 text-red-500" : "border-white/80 text-zinc-700 hover:text-red-500"}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[21px] w-[21px] sm:h-[23px] sm:w-[23px]" fill={favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
      </svg>
    </button>
  );
}
