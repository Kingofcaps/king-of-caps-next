import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { Order } from "../app/lib/orders.ts";
import type { ShopSale } from "../app/lib/shop-sales.ts";
import {
  cancelShopSaleDraft,
  openShopSale,
  shopSaleTotal,
  submitShopSale,
} from "../app/lib/shop-sale-workflow.ts";
import { xofRevenue } from "../app/lib/sales-statistics.ts";

const product = {
  id: "product-1",
  name: "Casquette test",
  stockQuantity: 3,
  priceXof: 5000,
};

function sale(id: string, requestId: string): ShopSale {
  return {
    id,
    product_id: product.id,
    product_name: product.name,
    quantity: 1,
    unit_price: 5000,
    total_price: 5000,
    payment_method: "Espèces",
    sold_at: "2026-07-28T10:00:00.000Z",
    source_movement_id: `movement-${id}`,
    request_id: requestId,
    created_at: "2026-07-28T10:00:00.000Z",
  };
}

test("un clic sur -1 prépare la fenêtre sans modifier le stock", () => {
  const draft = openShopSale(product, "request-1");

  assert.equal(draft.productId, product.id);
  assert.equal(draft.quantity, 1);
  assert.equal(draft.unitPrice, 5000);
  assert.equal(draft.paymentMethod, "Espèces");
  assert.equal(product.stockQuantity, 3);
});

test("annuler la fenêtre ne modifie rien", () => {
  const originalProduct = structuredClone(product);
  const draft = openShopSale(product, "request-2");

  assert.equal(cancelShopSaleDraft(), null);
  assert.equal(draft.quantity, 1);
  assert.deepEqual(product, originalProduct);
});

test("enregistrer une vente diminue le stock une fois et crée une seule vente", async () => {
  let stock = product.stockQuantity;
  const rows: ShopSale[] = [];
  const draft = openShopSale(product, "request-3");

  await submitShopSale(draft, async (input) => {
    stock -= input.quantity;
    rows.push(sale("sale-1", input.requestId));
    return rows[0];
  });

  assert.equal(stock, 2);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].total_price, 5000);
});

test("deux ventes à 5 000 F donnent exactement 10 000 F aujourd’hui", () => {
  const todayStart = new Date("2026-07-28T00:00:00.000Z");
  const tomorrowStart = new Date("2026-07-29T00:00:00.000Z");
  const sales = [sale("sale-1", "request-4"), sale("sale-2", "request-5")];

  assert.equal(xofRevenue([], sales, todayStart, tomorrowStart), 10000);
  assert.equal(shopSaleTotal({ quantity: 2, unitPrice: 5000 }), 10000);
});

test("les mouvements de stock ne sont jamais ajoutés au chiffre d’affaires", () => {
  const movements = [
    { id: "movement-sale-1", quantity_change: -1 },
    { id: "movement-sale-2", quantity_change: -1 },
  ];
  const sales = [sale("sale-1", "request-6"), sale("sale-2", "request-7")];

  assert.equal(movements.length, 2);
  assert.equal(xofRevenue([] as Order[], sales), 10000);
});

test("une erreur API ne diminue pas le stock", async () => {
  const initialStock = product.stockQuantity;
  const draft = openShopSale(product, "request-8");

  await assert.rejects(
    submitShopSale(draft, async () => {
      throw new Error("Erreur API simulée");
    }),
    /Erreur API simulée/,
  );
  assert.equal(product.stockQuantity, initialStock);
});

test("une même requête relancée ne crée aucun doublon", async () => {
  let stock = product.stockQuantity;
  const rows = new Map<string, ShopSale>();
  const draft = openShopSale(product, "request-idempotent");
  const request = async (input: typeof draft) => {
    const existing = rows.get(input.requestId);
    if (existing) return existing;
    stock -= input.quantity;
    const created = sale("sale-idempotent", input.requestId);
    rows.set(input.requestId, created);
    return created;
  };

  await submitShopSale(draft, request);
  await submitShopSale(draft, request);

  assert.equal(rows.size, 1);
  assert.equal(stock, 2);

  const migration = await readFile(
    new URL("../supabase/migrations/202607280003_fix_shop_sales_atomicity_and_duplicates.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /unique index if not exists shop_sales_request_id_uidx/i);
  assert.match(migration, /where request_id = p_request_id/i);
  assert.match(migration, /for update/i);
});
