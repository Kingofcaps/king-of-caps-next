import assert from "node:assert/strict";
import test from "node:test";
import { calculateCheckoutTotals, payDunyaTotalWithServiceFee, serviceFeeAmount } from "../app/lib/checkout-pricing.ts";

test("applique 100 F de frais de service sur une commande XOF", () => {
  const totals = calculateCheckoutTotals(5000, "XOF");
  assert.equal(totals.subtotal, 5000);
  assert.equal(totals.serviceFee, 100);
  assert.equal(totals.total, 5100);
});

test("les frais de service sont appliqués une seule fois par commande", () => {
  const subtotal = 15000;
  const totals = calculateCheckoutTotals(subtotal, "XOF");
  assert.equal(totals.serviceFee, 100);
  assert.equal(totals.total, 15100);
});

test("le montant PayDunya inclut aussi les 100 F", () => {
  assert.equal(payDunyaTotalWithServiceFee(5000), 5100);
  assert.equal(payDunyaTotalWithServiceFee(15000), 15100);
});

test("le frais de service XOF est fixe", () => {
  assert.equal(serviceFeeAmount("XOF"), 100);
});
