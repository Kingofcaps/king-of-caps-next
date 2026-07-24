import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  normalizeProductImageUrl,
  PRODUCT_IMAGE_FALLBACK,
  shouldBypassProductImageOptimization,
} from "../app/lib/product-image-url.ts";

const supabaseImage = "https://bvgngwwiuykdbgzqcieb.supabase.co/storage/v1/object/public/product-images/products/cap.jpg";
const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

afterEach(() => {
  if (originalSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
});

test("conserve une URL Supabase principale normale", () => {
  assert.equal(normalizeProductImageUrl(`  ${supabaseImage}  `), supabaseImage);
});

test("extrait une seule image d’un ancien tableau JSON", () => {
  assert.equal(normalizeProductImageUrl(JSON.stringify([supabaseImage, "https://example.com/second.jpg"])), supabaseImage);
  assert.equal(normalizeProductImageUrl(["valeur-invalide", supabaseImage]), supabaseImage);
});

test("extrait la première URL lorsque plusieurs URL sont concaténées", () => {
  assert.equal(normalizeProductImageUrl(`${supabaseImage},https://example.com/second.jpg`), supabaseImage);
  assert.equal(normalizeProductImageUrl("/images/first.jpg,/images/second.jpg"), "/images/first.jpg");
});

test("retire le proxy Next et ses paramètres de redimensionnement", () => {
  const proxied = `/_next/image?url=${encodeURIComponent(supabaseImage)}&w=640&q=75`;
  assert.equal(normalizeProductImageUrl(proxied), supabaseImage);
  assert.equal(normalizeProductImageUrl(`${supabaseImage}?w=640&q=75`), supabaseImage);
});

test("ne décode qu’une couche d’un chemin ancien doublement encodé", () => {
  assert.equal(
    normalizeProductImageUrl("https://bvgngwwiuykdbgzqcieb.supabase.co/storage/v1/object/public/product-images/products%252Fcap.jpg"),
    "https://bvgngwwiuykdbgzqcieb.supabase.co/storage/v1/object/public/product-images/products%2Fcap.jpg",
  );
});

test("utilise le fallback pour une ancienne valeur invalide", () => {
  assert.equal(normalizeProductImageUrl("javascript:alert(1)"), PRODUCT_IMAGE_FALLBACK);
  assert.equal(normalizeProductImageUrl("not-an-image"), PRODUCT_IMAGE_FALLBACK);
  assert.equal(normalizeProductImageUrl(null), PRODUCT_IMAGE_FALLBACK);
});

test("sert directement les images distantes et conserve l’optimisation locale", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://bvgngwwiuykdbgzqcieb.supabase.co";
  assert.equal(shouldBypassProductImageOptimization(supabaseImage), true);
  assert.equal(shouldBypassProductImageOptimization("https://example.com/cap.jpg"), true);
  assert.equal(shouldBypassProductImageOptimization("/images/logo.jpg"), false);
});

test("convertit une ancienne URL signée du bucket public en URL publique brute", () => {
  const signed = "https://bvgngwwiuykdbgzqcieb.supabase.co/storage/v1/object/sign/product-images/products/cap.jpg?token=expired";
  assert.equal(
    normalizeProductImageUrl(signed),
    "https://bvgngwwiuykdbgzqcieb.supabase.co/storage/v1/object/public/product-images/products/cap.jpg",
  );
});
