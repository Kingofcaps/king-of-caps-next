import assert from "node:assert/strict";
import test from "node:test";
import { isMainAdminOrder, isUnconfirmedPayDunyaOrder } from "../app/lib/admin-order-visibility.ts";

test("masque les paiements PayDunya non confirmés de la liste principale", () => {
  assert.equal(isMainAdminOrder({ payment_method: "mobile_money", payment_status: "pending" }), false);
  assert.equal(isMainAdminOrder({ payment_method: "card", payment_status: "failed" }), false);
  assert.equal(isUnconfirmedPayDunyaOrder({ payment_method: "mobile_money", payment_status: "pending" }), true);
});

test("affiche un paiement PayDunya uniquement après confirmation", () => {
  assert.equal(isMainAdminOrder({ payment_method: "mobile_money", payment_status: "paid" }), true);
  assert.equal(isMainAdminOrder({ payment_method: "card", payment_status: "paid" }), true);
});

test("conserve immédiatement les paiements à la livraison dans la liste principale", () => {
  assert.equal(isMainAdminOrder({ payment_method: "cash_on_delivery", payment_status: "pending" }), true);
  assert.equal(isUnconfirmedPayDunyaOrder({ payment_method: "cash_on_delivery", payment_status: "pending" }), false);
});
