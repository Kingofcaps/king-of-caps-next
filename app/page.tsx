import Image from "next/image";
import HomeHeader from "./components/HomeHeader";
import ProductGallery from "./components/ProductGallery";
import { getProducts } from "./lib/products";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getProducts();

  return (
    <main className="min-h-screen bg-[#fafafa] text-black">
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
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/40 to-[#fafafa]" />

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
    </main>
  );
}
