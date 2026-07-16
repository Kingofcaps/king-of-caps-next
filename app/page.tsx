import Image from "next/image";
import HomeHeader from "./components/HomeHeader";
import ProductGallery from "./components/ProductGallery";
import StorefrontBottom from "./components/StorefrontBottom";
import { getProducts } from "./lib/products";
import { absoluteUrl, serializeJsonLd, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./lib/seo";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getProducts();
  const homeJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: absoluteUrl("/images/logo.jpg"),
        description: SITE_DESCRIPTION,
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+22950687515",
          contactType: "customer service",
          areaServed: "BJ",
          availableLanguage: "fr",
        },
      },
      {
        "@type": "Store",
        "@id": `${SITE_URL}/#store`,
        name: SITE_NAME,
        url: SITE_URL,
        image: absoluteUrl("/images/boutique.jpg"),
        telephone: "+22950687515",
        parentOrganization: { "@id": `${SITE_URL}/#organization` },
        address: {
          "@type": "PostalAddress",
          addressLocality: "Cotonou",
          addressCountry: "BJ",
        },
        areaServed: [
          { "@type": "City", name: "Cotonou" },
          { "@type": "Country", name: "Bénin" },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        inLanguage: "fr-BJ",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#fafafa] text-black">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeJsonLd) }} />
      <HomeHeader />

      <section className="relative isolate min-h-[340px] overflow-hidden text-white">
        <Image
          src="/images/boutique.jpg"
          alt="Boutique King of Caps"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/25 to-[#fafafa]/35" />

        <div className="relative z-10 mx-auto flex min-h-[340px] max-w-4xl flex-col items-center justify-center px-5 pb-6 text-center sm:px-8">
          <Image
            src="/images/logo.png"
            alt="Logo King of Caps"
            width={176}
            height={176}
            priority
            className="mb-7 h-28 w-28 rounded-full object-contain shadow-2xl sm:h-36 sm:w-36"
          />
          <p className="mb-3 text-xs font-bold tracking-[0.35em] text-amber-300 sm:text-sm">
            LA RÉFÉRENCE À COTONOU
          </p>
          <h1 className="text-5xl font-black tracking-tight sm:text-7xl">KING OF CAPS</h1>
          <p className="mt-5 max-w-xl text-lg text-white/80 sm:text-xl">
            Le royaume de la casquette au Bénin
          </p>
        </div>
      </section>

      <ProductGallery products={products} />
      <StorefrontBottom />
    </main>
  );
}
