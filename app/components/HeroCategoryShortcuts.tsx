"use client";

import { useState } from "react";
import {
  PRODUCT_CATEGORY_EVENT,
  PRODUCT_CATEGORY_SHORTCUTS,
  type ProductCategoryShortcut,
} from "@/app/lib/product-category-shortcuts";

export default function HeroCategoryShortcuts() {
  const [activeCategory, setActiveCategory] = useState<ProductCategoryShortcut>("all");
  const categoryRows = [PRODUCT_CATEGORY_SHORTCUTS.slice(0, 3), PRODUCT_CATEGORY_SHORTCUTS.slice(3)];

  function selectCategory(category: ProductCategoryShortcut) {
    setActiveCategory(category);
    window.dispatchEvent(new CustomEvent<ProductCategoryShortcut>(PRODUCT_CATEGORY_EVENT, { detail: category }));
    window.requestAnimationFrame(() => {
      document.getElementById("collection")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <nav aria-label="Raccourcis des catégories" className="absolute bottom-3 left-1/2 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 sm:bottom-4">
      <div className="flex flex-col items-center gap-1">
        {categoryRows.map((row, rowIndex) => (
          <div key={rowIndex} className={`flex items-center justify-center gap-1 ${rowIndex === 0 ? "-translate-x-1" : "translate-x-1"}`}>
            {row.map((category) => {
              const active = category.value === activeCategory;
              return (
                <button
                  key={category.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectCategory(category.value)}
                  className={`shrink-0 rounded-full border px-2 py-1 text-[8px] font-black uppercase leading-none tracking-[0.06em] backdrop-blur-sm transition sm:px-2.5 sm:text-[9px] ${active ? "border-[#d4af37] bg-[#d4af37] text-zinc-950 shadow-sm" : "border-white/45 bg-white/15 text-white hover:border-white/80 hover:bg-white/25"}`}
                >
                  {category.value === "newsboy" ? "Newsboy / Gavroche" : category.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
