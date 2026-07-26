import assert from "node:assert/strict";
import test from "node:test";
import { selectFeaturedProducts } from "../app/lib/featured-products.ts";
import type { Product } from "../app/lib/products.ts";

function product(name: string, featured: boolean, createdAt: string): Product {
  return {
    id: name.toLowerCase(),
    name,
    price: "5 000 F",
    priceXof: 5000,
    priceEur: 800,
    priceUsd: 900,
    description: "",
    image: "/test.jpg",
    images: ["/test.jpg"],
    brand: "",
    category: "",
    color: "",
    stockQuantity: 1,
    featured,
    newArrival: false,
    available: true,
    inStock: true,
    sortOrder: 0,
    createdAt,
  };
}

test("Tendances du moment contient uniquement A et C, du plus récent au plus ancien", () => {
  const products = [
    product("Produit B", false, "2026-07-21T12:00:00.000Z"),
    product("Produit C", true, "2026-07-19T12:00:00.000Z"),
    product("Produit A", true, "2026-07-20T12:00:00.000Z"),
  ];

  assert.deepEqual(
    selectFeaturedProducts(products).map(({ name }) => name),
    ["Produit A", "Produit C"],
  );
});

test("aucun produit ordinaire n'est utilisé comme fallback", () => {
  const products = [product("Produit B", false, "2026-07-21T12:00:00.000Z")];

  assert.deepEqual(selectFeaturedProducts(products), []);
});
