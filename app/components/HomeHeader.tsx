"use client";

import { useCallback, useEffect, useState } from "react";
import CartLink from "./CartLink";
import CurrencySelector from "./CurrencySelector";
import FavoritesLink from "./FavoritesLink";

const WHATSAPP_URL = "https://wa.me/22950687515";

export default function HomeHeader() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  const updateSearch = useCallback((value: string) => {
    setSearch(value);
    window.dispatchEvent(new CustomEvent("king-of-caps-search", { detail: value }));
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    updateSearch("");
  }, [updateSearch]);

  useEffect(() => {
    if (!isSearchOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeSearch();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, closeSearch]);

  return (
    <header className="relative z-30 border-b border-[#e5e5e5] bg-white">
      <div className="mx-auto flex min-h-[48px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <span className="shrink-0 whitespace-nowrap text-[11px] font-bold tracking-[0.16em] text-black sm:text-sm sm:tracking-[0.24em]">
          KING OF CAPS
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <CurrencySelector />
          <FavoritesLink />
          <CartLink />
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Ouvrir la recherche"
            aria-expanded={isSearchOpen}
            className="grid h-11 w-11 place-items-center rounded-full bg-transparent text-black transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a227]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="6" />
              <path d="m16 16 4 4" />
            </svg>
          </button>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden whitespace-nowrap rounded-full bg-black px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#c9a227] sm:inline-flex sm:text-sm"
          >
            WhatsApp
          </a>
        </div>
      </div>

      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/35 px-4 pt-14" onClick={closeSearch}>
          <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-[#e5e5e5] bg-white px-4 py-3 shadow-2xl focus-within:border-[#c9a227]" onClick={(event) => event.stopPropagation()}>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
            <input autoFocus type="search" value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Rechercher une casquette..." className="min-w-0 flex-1 bg-transparent text-black outline-none placeholder:text-zinc-400" />
            <button type="button" onClick={() => { setIsSearchOpen(false); updateSearch(""); }} aria-label="Fermer la recherche" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xl text-zinc-600 transition hover:bg-zinc-100">×</button>
          </div>
        </div>
      )}
    </header>
  );
}
