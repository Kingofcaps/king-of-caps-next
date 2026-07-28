import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { CartProvider } from "./components/CartProvider";
import { CurrencyProvider } from "./components/CurrencyProvider";
import { FavoritesProvider } from "./components/FavoritesProvider";
import PwaInstallationTracker from "./components/PwaInstallationTracker";
import { getRequestCurrency } from "./lib/currency-server";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./lib/seo";
import "./globals.css";

const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;
const bingVerification = process.env.BING_SITE_VERIFICATION;
const yahooVerification = process.env.YAHOO_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: "KING OF CAPS | Casquettes à Cotonou, Bénin",
    template: "%s | KING OF CAPS",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "casquettes Cotonou",
    "casquettes Bénin",
    "boutique de casquettes Cotonou",
    "King of Caps",
    "casquettes authentiques",
    "casquettes tendance",
    "livraison casquettes Bénin",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "shopping",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_BJ",
    url: "/",
    siteName: SITE_NAME,
    title: "KING OF CAPS | Le royaume de la casquette au Bénin",
    description: SITE_DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "KING OF CAPS — Casquettes à Cotonou, Bénin" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KING OF CAPS | Casquettes à Cotonou, Bénin",
    description: SITE_DESCRIPTION,
    images: [{ url: "/opengraph-image", alt: "KING OF CAPS — Casquettes à Cotonou, Bénin" }],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    ...(googleVerification ? { google: googleVerification } : {}),
    ...(yahooVerification ? { yahoo: yahooVerification } : {}),
    ...(bingVerification ? { other: { "msvalidate.01": bingVerification } } : {}),
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon", sizes: "32x32" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  other: {
    "geo.region": "BJ-LI",
    "geo.placename": "Cotonou",
    "content-language": "fr-BJ",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialCurrency = await getRequestCurrency();

  return (
    <html
      lang="fr"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <CurrencyProvider initialCurrency={initialCurrency}>
          <FavoritesProvider>
            <CartProvider>{children}</CartProvider>
            <PwaInstallationTracker />
          </FavoritesProvider>
        </CurrencyProvider>
        <Analytics />
      </body>
    </html>
  );
}
