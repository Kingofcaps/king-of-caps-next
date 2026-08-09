import type { Product } from "./products";

export const PRODUCT_CATEGORY_EVENT = "king-of-caps-category";

export const PRODUCT_CATEGORY_SHORTCUTS = [
  { value: "all", label: "Tous", terms: [] },
  { value: "snapback", label: "Snapback", terms: ["snapback"] },
  { value: "fitted", label: "Fitted", terms: ["fitted"] },
  { value: "trucker", label: "Trucker", terms: ["trucker"] },
  { value: "adjustable", label: "Ajustable", terms: ["ajustable", "adjustable", "ajsutable"] },
  { value: "newsboy", label: "Newsboy", terms: ["newsboy", "gavroche"] },
  { value: "beanie", label: "Bonnet", terms: ["bonnet", "beanie"] },
  { value: "watch", label: "Montre", terms: ["montre", "watch", "rolex", "casio", "tissot", "patek philippe", "richard mille", "zenmo"] },
] as const;

export type ProductCategoryShortcut = (typeof PRODUCT_CATEGORY_SHORTCUTS)[number]["value"];

function normalizeCategoryText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function matchesProductCategoryShortcut(
  product: Pick<Product, "name" | "category">,
  shortcut: ProductCategoryShortcut,
) {
  if (shortcut === "all") return true;

  const category = PRODUCT_CATEGORY_SHORTCUTS.find((item) => item.value === shortcut);
  if (!category) return true;

  const searchableText = normalizeCategoryText(`${product.category} ${product.name}`);
  return category.terms.some((term) => searchableText.includes(term));
}
