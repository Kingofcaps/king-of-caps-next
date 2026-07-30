import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/seo";

const disallowedPaths = ["/admin", "/api", "/checkout", "/commande-confirmee"];
const legalPaths = ["/cgu", "/politique-confidentialite", "/mentions-legales", "/livraison-retours"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", ...legalPaths],
        disallow: disallowedPaths,
      },
      {
        userAgent: ["Googlebot", "Bingbot", "Slurp", "DuckDuckBot"],
        allow: ["/", "/product/", ...legalPaths],
        disallow: disallowedPaths,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
