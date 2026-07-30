import assert from "node:assert/strict";
import test from "node:test";
import { buildProductCreatePayload } from "../app/lib/product-create-payload.ts";

const details = {
  id: "product-test",
  name: "Casquette test",
  price: "5 000 F",
  priceXof: 5000,
  priceEur: 800,
  priceUsd: 900,
  description: "",
  brand: "King Of Caps",
  category: "Casquette",
  color: "Noir",
  stockQuantity: 1,
  featured: false,
  newArrival: true,
  available: true,
};

test("la requête de création produit contient uniquement les URL des images", () => {
  const publicUrl = "https://example.supabase.co/storage/v1/object/public/product-images/products/product-test/image.webp";
  const payload = buildProductCreatePayload(details, [publicUrl]);
  const serialized = JSON.stringify(payload);

  assert.equal(payload.image, publicUrl);
  assert.deepEqual(payload.images, [publicUrl]);
  assert.equal(serialized.includes("data:image/"), false);
  assert.equal(serialized.includes("base64"), false);
  assert.equal(Object.values(payload).some((value) => value instanceof Uint8Array), false);
});

test("une image base64 ou blob est refusée avant la requête de création", () => {
  assert.throws(
    () => buildProductCreatePayload(details, ["data:image/webp;base64,UklGRg=="]),
    /URL d’images téléversées/,
  );
  assert.throws(
    () => buildProductCreatePayload(details, ["blob:https://admin.kingofcaps.bj/test"]),
    /URL d’images téléversées/,
  );
});
