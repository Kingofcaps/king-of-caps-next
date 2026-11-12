import assert from "node:assert/strict";
import test from "node:test";
import { checkoutButtonLabel, paymentMethodLabel, PAYMENT_OPTIONS } from "../app/lib/checkout.ts";

test("propose uniquement le paiement à la livraison pendant la suspension", () => {
  assert.deepEqual(PAYMENT_OPTIONS.map(({ value }) => value), ["cash_on_delivery"]);
  assert.equal(PAYMENT_OPTIONS[0].title, "Paiement à la livraison");
  assert.equal(PAYMENT_OPTIONS[0].description, "Payez lorsque votre commande vous est remise");
});

test("la sélection du moyen de paiement détermine le bouton final", () => {
  assert.equal(paymentMethodLabel("cash_on_delivery"), "Paiement à la livraison");
  assert.equal(checkoutButtonLabel("cash_on_delivery", 12500, "XOF"), "Confirmer la commande");
});
