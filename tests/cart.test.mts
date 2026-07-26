import assert from "node:assert/strict";
import test from "node:test";
import {
  addCartItem,
  cartItemCount,
  cartSubtotal,
  removeCartItem,
  sanitizeCart,
  updateCartItemQuantity,
  type CartItem,
} from "../app/lib/cart.ts";

function item(productId: string, quantity = 1, stockQuantity = 5, priceXof = 5000): CartItem {
  return { productId, name: `Produit ${productId}`, image: `/${productId}.jpg`, priceXof, priceEur: 800, priceUsd: 900, quantity, stockQuantity };
}

test("ajoute un produit puis plusieurs produits différents", () => {
  const one = addCartItem([], item("A"));
  const multiple = addCartItem(one, item("B", 2));
  assert.deepEqual(one.map(({ productId }) => productId), ["A"]);
  assert.deepEqual(multiple.map(({ productId }) => productId), ["A", "B"]);
  assert.equal(cartItemCount(multiple), 3);
});

test("fusionne les doublons sans dépasser le stock", () => {
  const cart = addCartItem(addCartItem([], item("A", 3, 4)), item("A", 3, 4));
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 4);
});

test("modifie la quantité dans les limites du stock", () => {
  const cart = [item("A", 2, 3)];
  assert.equal(updateCartItemQuantity(cart, "A", 0)[0].quantity, 1);
  assert.equal(updateCartItemQuantity(cart, "A", 20)[0].quantity, 3);
});

test("supprime un article du panier", () => {
  const cart = removeCartItem([item("A"), item("B")], "A");
  assert.deepEqual(cart.map(({ productId }) => productId), ["B"]);
});

test("restaure un panier sérialisé après actualisation", () => {
  const stored = JSON.stringify([item("A", 2), item("B", 1)]);
  assert.deepEqual(sanitizeCart(JSON.parse(stored)), [item("A", 2), item("B", 1)]);
});

test("calcule exactement les totaux des lignes, le total général et le badge", () => {
  const cart = [item("A", 2, 5, 5000), item("B", 3, 5, 7500)];
  assert.equal(cart[0].priceXof * cart[0].quantity, 10000);
  assert.equal(cart[1].priceXof * cart[1].quantity, 22500);
  assert.equal(cartSubtotal(cart, "XOF"), 32500);
  assert.equal(cartSubtotal(cart, "EUR"), 4000);
  assert.equal(cartItemCount(cart), 5);
});
