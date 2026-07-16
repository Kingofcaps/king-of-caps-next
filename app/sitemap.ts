import type { MetadataRoute } from "next";
import { getProducts } from "./lib/products";
import { absoluteUrl, SITE_URL } from "./lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let products;

  try {
    products = await getProducts();
  } catch (error) {
    console.error("Impossible de charger les produits pour le sitemap.", error);
    products = [];
  }

  return [
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1,
      images: [absoluteUrl("/images/boutique.jpg")],
    },
    ...products.map((product) => ({
      url: absoluteUrl(`/product/${product.id}`),
      changeFrequency: "weekly" as const,
      priority: product.featured ? 0.9 : 0.8,
      images: product.images.map(absoluteUrl),
    })),
  ];
}
