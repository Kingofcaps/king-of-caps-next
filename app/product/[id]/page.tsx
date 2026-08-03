import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { parsePrice } from "../../lib/prices";
import { formatMoney, getProductPrice } from "../../lib/currency";
import { getRequestCurrency } from "../../lib/currency-server";
import { getProduct } from "../../lib/products";
import { absoluteUrl, seoDescription, serializeJsonLd, SITE_NAME, SITE_URL } from "../../lib/seo";
import ProductImageGallery from "./ProductImageGallery";
import ProductPurchaseActions from "./ProductPurchaseActions";
import CartLink from "../../components/CartLink";
import CurrencySelector from "../../components/CurrencySelector";
import { KING_OF_CAPS_WHATSAPP_URL, productWhatsAppOrderUrl } from "../../lib/product-whatsapp";

const getProductForPage = cache(getProduct);

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/product/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductForPage(id);

  if (!product) {
    return {
      title: "Produit introuvable",
      robots: { index: false, follow: false },
    };
  }

  const canonicalPath = `/product/${product.id}`;
  const description = seoDescription(
    product.description,
    `Découvrez ${product.name}, une casquette disponible chez KING OF CAPS à Cotonou avec livraison partout au Bénin.`,
  );
  const images = product.images.map((image) => ({ url: absoluteUrl(image), alt: `${product.name} — KING OF CAPS` }));

  return {
    title: `${product.name} — Casquette à Cotonou`,
    description,
    keywords: [product.name, product.brand, product.category, product.color, "casquette Cotonou", "casquette Bénin"].filter(Boolean),
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "website",
      locale: "fr_BJ",
      url: canonicalPath,
      siteName: SITE_NAME,
      title: `${product.name} | KING OF CAPS`,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | KING OF CAPS`,
      description,
      images,
    },
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/product/[id]">) {
  const { id } = await params;
  const product = await getProductForPage(id);

  if (!product) notFound();

  const additionalImages = Array.from(new Set(product.images))
    .filter((image) => image !== product.image);
  const currency = await getRequestCurrency();
  const selectedPrice = getProductPrice(product, currency);
  const orderUrl = productWhatsAppOrderUrl(product, formatMoney(selectedPrice, currency));
  const productUrl = absoluteUrl(`/product/${product.id}`);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    description: seoDescription(product.description, `${product.name}, disponible chez KING OF CAPS à Cotonou.`),
    image: product.images.map(absoluteUrl),
    sku: product.id,
    category: product.category,
    color: product.color || undefined,
    brand: {
      "@type": "Brand",
      name: product.brand || SITE_NAME,
    },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "XOF",
      price: parsePrice(product.price),
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${SITE_URL}/#organization` },
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: product.name, item: productUrl },
    ],
  };

  return (
    <main className="min-h-screen bg-[#fafafa] text-black">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />
      <header className="border-b border-[#e5e5e5] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="text-sm font-bold tracking-[0.22em] text-black">
            KING OF CAPS
          </Link>
          <div className="flex items-center gap-2"><CurrencySelector /><CartLink /><a href={KING_OF_CAPS_WHATSAPP_URL} target="_blank" rel="noreferrer" className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c9a227]">WhatsApp</a></div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-8 sm:py-16 lg:grid-cols-2 lg:items-center lg:gap-16">
        <ProductImageGallery
          productName={product.name}
          mainImage={product.image}
          additionalImages={additionalImages}
        />

        <div className="lg:py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-[#c9a227]"
          >
            <span aria-hidden="true">←</span>
            Retour à la collection
          </Link>

          <p className="mt-9 text-sm font-bold tracking-[0.28em] text-[#c9a227]">
            KING OF CAPS EXCLUSIVE
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
            {product.name}
          </h1>

          <div className="mt-7 flex items-center gap-4">
            <p className="text-3xl font-black leading-tight text-[#c9a227]">{formatMoney(selectedPrice, currency)}</p>
            <span className={`rounded-full border px-3 py-1 text-sm font-bold ${product.inStock ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-600"}`}>
              {product.inStock ? "En stock" : "Rupture de stock"}
            </span>
          </div>

          <p className="mt-8 max-w-xl text-lg leading-8 text-zinc-600">
            {product.description}
          </p>

          <div className="mt-10 border-y border-[#e5e5e5] py-5 text-sm text-zinc-500">
            <p>Livraison rapide à Cotonou et partout au Bénin.</p>
            <p className="mt-2">Commande simple et sécurisée directement sur WhatsApp.</p>
          </div>

          {product.inStock ? <ProductPurchaseActions product={{ productId: product.id, name: product.name, image: product.image, priceXof: product.priceXof, priceEur: product.priceEur, priceUsd: product.priceUsd, stockQuantity: product.stockQuantity }} /> : <span aria-disabled="true" className="mt-10 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-zinc-200 px-6 py-4 text-base font-black text-zinc-500 sm:w-auto">Rupture de stock</span>}
          <div className="mt-3 grid gap-3 sm:flex">
            <a
              href={orderUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center rounded-xl border border-[#e5e5e5] bg-white px-6 py-4 text-base font-black text-black transition hover:border-[#c9a227] hover:text-[#c9a227] sm:w-auto"
            >
              Commander via WhatsApp
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
