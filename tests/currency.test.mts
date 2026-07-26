import assert from "node:assert/strict";
import test from "node:test";
import { currencyForCountry, formatMoney, getProductPrice } from "../app/lib/currency.ts";

test("détecte les zones monétaires prévues", () => {
  assert.equal(currencyForCountry("BJ"), "XOF");
  assert.equal(currencyForCountry("SN"), "XOF");
  assert.equal(currencyForCountry("FR"), "EUR");
  assert.equal(currencyForCountry("BG"), "EUR");
  assert.equal(currencyForCountry("US"), "USD");
  assert.equal(currencyForCountry("CA"), "USD");
  assert.equal(currencyForCountry("ZZ"), "XOF");
});

test("additionne les prix fixes sans reconvertir le total XOF", () => {
  const prices = { priceXof: 5000, priceEur: 800, priceUsd: 900 };
  assert.equal(getProductPrice(prices, "EUR") * 5, 4000);
  assert.equal(formatMoney(4000, "EUR"), "40 €");
  assert.equal(formatMoney(getProductPrice(prices, "USD") * 5, "USD"), "45 $");
});
