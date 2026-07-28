"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const FAVORITES_STORAGE_KEY = "king-of-caps-favorites";

type FavoritesContextValue = {
  favoriteIds: ReadonlySet<string>;
  favoriteCount: number;
  hydrated: boolean;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function parseStoredFavorites(value: string | null) {
  if (!value) return new Set<string>();
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((id): id is string => typeof id === "string" && id.trim().length > 0));
  } catch {
    return new Set<string>();
  }
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hydrationTimeout = window.setTimeout(() => {
      setFavoriteIds(parseStoredFavorites(window.localStorage.getItem(FAVORITES_STORAGE_KEY)));
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(hydrationTimeout);
  }, []);

  function toggleFavorite(productId: string) {
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      try {
        window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...next]));
      } catch (error) {
        console.error("[favorites] Impossible d’enregistrer les favoris.", error);
      }
      return next;
    });
  }

  const value = useMemo<FavoritesContextValue>(() => ({
    favoriteIds,
    favoriteCount: hydrated ? favoriteIds.size : 0,
    hydrated,
    isFavorite: (productId) => hydrated && favoriteIds.has(productId),
    toggleFavorite,
  }), [favoriteIds, hydrated]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites doit être utilisé dans FavoritesProvider.");
  return context;
}
