"use client";

import { useState } from "react";
import {
  PRODUCT_CATEGORY_EVENT,
  PRODUCT_CATEGORY_SHORTCUTS,
  type ProductCategoryShortcut,
} from "@/app/lib/product-category-shortcuts";

export default function HeroCategoryShortcuts() {
  const [activeCategory, setActiveCategory] = useState<ProductCategoryShortcut>("all");

  function selectCategory(category: ProductCategoryShortcut) {
    setActiveCategory(category);
    window.dispatchEvent(new CustomEvent<ProductCategoryShortcut>(PRODUCT_CATEGORY_EVENT, { detail: category }));
    window.requestAnimationFrame(() => {
      document.getElementById("collection")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <nav aria-label="Raccourcis des catégories" className="mt-4 w-full max-w-[410px] sm:mt-5 sm:max-w-none">
      <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:justify-center sm:gap-2">
        {PRODUCT_CATEGORY_SHORTCUTS.map((category) => {
          const active = category.value === activeCategory;
          return (
            <button
              key={category.value}
              type="button"
              aria-pressed={active}
              onClick={() => selectCategory(category.value)}
              className={`min-w-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] backdrop-blur-sm transition sm:px-3 sm:py-1.5 sm:text-[10px] ${active ? "border-[#d4af37] bg-[#d4af37] text-zinc-950 shadow-sm" : "border-white/45 bg-white/15 text-white hover:border-white/80 hover:bg-white/25"}`}
            >
              {category.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
