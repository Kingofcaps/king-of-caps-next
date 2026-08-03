import assert from "node:assert/strict";
import test from "node:test";
import {
  productCanonicalUrl,
  productWhatsAppMessage,
  productWhatsAppOrderUrl,
} from "../app/lib/product-whatsapp.ts";

test("le message WhatsApp contient le produit, son prix et sa fiche canonique", () => {
  const product = { id: "white-sox-123", name: "White Sox brodée" };
  const message = productWhatsAppMessage(product, "5 000 F");

  assert.match(message, /Produit : White Sox brodée/);
  assert.match(message, /Prix : 5 000 F/);
  assert.match(message, /Lien du produit : https:\/\/kingofcaps\.bj\/product\/white-sox-123/);

  const whatsappUrl = new URL(productWhatsAppOrderUrl(product, "5 000 F"));
  assert.equal(whatsappUrl.origin, "https://wa.me");
  assert.equal(whatsappUrl.searchParams.get("text"), message);
});

test("chaque produit reçoit son propre lien direct correctement encodé", () => {
  assert.equal(
    productCanonicalUrl("produit A/édition"),
    "https://kingofcaps.bj/product/produit%20A%2F%C3%A9dition",
  );
  assert.notEqual(productCanonicalUrl("produit-a"), productCanonicalUrl("produit-b"));
});
