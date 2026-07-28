import type { Metadata } from "next";
import FavoriteProducts from "@/app/components/FavoriteProducts";
import HomeHeader from "@/app/components/HomeHeader";
import StorefrontBottom from "@/app/components/StorefrontBottom";
import { getProducts } from "@/app/lib/products";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mes favoris",
  description: "Retrouvez vos produits KING OF CAPS préférés.",
  alternates: { canonical: "/favoris" },
};

export default async function FavoritesPage() {
  const products = await getProducts();

  return (
    <main className="min-h-screen bg-[#fafafa] text-black">
      <HomeHeader />
      <section className="mx-auto min-h-[60vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-bold tracking-[0.25em] text-[#c9a227]">KING OF CAPS</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Mes favoris</h1>
        <p className="mt-3 max-w-xl text-sm text-zinc-500 sm:text-base">Votre sélection est enregistrée sur cet appareil.</p>
        <FavoriteProducts products={products} />
      </section>
      <StorefrontBottom />
    </main>
  );
}
