import assert from "node:assert/strict";
import test from "node:test";
import { checkoutButtonLabel, paymentMethodLabel, PAYMENT_OPTIONS } from "../app/lib/checkout.ts";

test("propose les trois moyens de paiement de la bottom sheet", () => {
  assert.deepEqual(PAYMENT_OPTIONS.map(({ value }) => value), ["mobile_money", "card", "cash_on_delivery"]);
  assert.equal(PAYMENT_OPTIONS[0].description, "Paiement sécurisé via PayDunya");
  assert.equal(PAYMENT_OPTIONS[1].description, "Visa et Mastercard via PayDunya");
  assert.equal(PAYMENT_OPTIONS[2].description, "Payez lorsque votre commande vous est remise");
});

test("la sélection du moyen de paiement détermine le bouton final", () => {
  assert.equal(paymentMethodLabel("mobile_money"), "Mobile Money");
  assert.equal(checkoutButtonLabel("mobile_money", 12500, "XOF"), "Payer 12 500 F");
  assert.equal(checkoutButtonLabel("card", 800, "EUR"), "Payer 8 €");
  assert.equal(checkoutButtonLabel("cash_on_delivery", 12500, "XOF"), "Confirmer la commande");
});
