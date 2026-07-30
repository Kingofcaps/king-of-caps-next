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
      className={`absolute right-[6px] top-[6px] z-20 grid h-8 min-h-0 w-8 min-w-0 place-items-center rounded-full border bg-white/95 p-0 shadow-sm backdrop-blur-sm transition duration-200 active:scale-90 disabled:opacity-70 md:right-2 md:top-2 md:h-[42px] md:w-[42px] ${favorite ? "border-red-200 text-red-500" : "border-white/80 text-zinc-700 hover:text-red-500"}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] md:h-[23px] md:w-[23px]" fill={favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
      </svg>
    </button>
  );
}
