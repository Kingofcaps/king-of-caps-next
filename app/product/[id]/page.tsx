import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct } from "../../lib/products";

const WHATSAPP_URL = "https://wa.me/22950687515";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: PageProps<"/product/[id]">) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) notFound();

  const orderMessage = `Bonjour KING OF CAPS, je souhaite commander ${product.name} au prix de ${product.price}.`;
  const orderUrl = `${WHATSAPP_URL}?text=${encodeURIComponent(orderMessage)}`;

  return (
    <main className="min-h-screen bg-[#fafafa] text-black">
      <header className="border-b border-[#e5e5e5] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="text-sm font-bold tracking-[0.22em] text-black">
            KING OF CAPS
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c9a227]"
          >
            WhatsApp
          </a>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-8 sm:py-16 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="relative aspect-square overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
          <Image
            src={product.image}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

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
            <p className="text-3xl font-black text-[#c9a227]">{product.price}</p>
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

          <div className="mt-10 grid gap-3 sm:flex">
            {product.inStock ? <Link href={`/checkout/${product.id}`} className="inline-flex w-full items-center justify-center rounded-xl bg-black px-6 py-4 text-base font-black text-white shadow-lg shadow-black/10 transition hover:bg-[#c9a227] sm:w-auto">Commander en ligne</Link> : <span aria-disabled="true" className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-zinc-200 px-6 py-4 text-base font-black text-zinc-500 sm:w-auto">Rupture de stock</span>}
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
