import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { CartProvider } from "./components/CartProvider";
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
      { url: "/favicon.ico", type: "image/x-icon", sizes: "256x256" },
      { url: "/icon", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  other: {
    "geo.region": "BJ-LI",
    "geo.placename": "Cotonou",
    "content-language": "fr-BJ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <CartProvider>{children}</CartProvider>
        <Analytics />
      </body>
    </html>
  );
}
