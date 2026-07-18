import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderByNumber } from "@/app/lib/orders";
import { formatDualPrice } from "@/app/lib/prices";

export const dynamic = "force-dynamic";

function paymentMethodLabel(method: string) {
  if (method === "cash_on_delivery") return "Paiement à la livraison";
  if (method === "mobile_money") return "Mobile Money";
  return "Carte bancaire";
}

export default async function OrderConfirmationPage({
  params,
}: PageProps<"/commande-confirmee/[orderNumber]">) {
  const { orderNumber } = await params;
  const order = await getOrderByNumber(orderNumber);
  if (!order) notFound();
  if (order.payment_method !== "cash_on_delivery" && (order.payment_status !== "paid" || order.order_status !== "confirmed")) notFound();

  return (
    <main className="min-h-screen bg-[#fafafa] px-5 py-10 text-zinc-900 sm:px-8 sm:py-16">
      <section className="mx-auto max-w-2xl rounded-3xl border border-[#e5e5e5] bg-white p-6 shadow-xl shadow-zinc-200/60 sm:p-10">
        <p className="text-sm font-bold tracking-[0.22em] text-[#c9a227]">KING OF CAPS</p>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">Commande confirmée</h1>
        <p className="mt-3 text-zinc-600">Nous vous contacterons rapidement pour confirmer votre commande.</p>

        <div className="mt-7 rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-4">
          <p className="text-xs font-bold tracking-[0.16em] text-zinc-500">NUMÉRO DE COMMANDE</p>
          <p className="mt-1 text-lg font-black text-[#c9a227]">{order.order_number}</p>
        </div>

        <div className="mt-6 flex gap-4 border-b border-[#e5e5e5] pb-6">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
            <Image src={order.product_image} alt={order.product_name} fill sizes="80px" className="object-cover" />
          </div>
          <div>
            <p className="font-black">{order.product_name}</p>
            <p className="mt-1 text-sm text-zinc-600">Quantité : {order.quantity}</p>
            <p className="mt-1 font-bold leading-tight text-[#c9a227]">{formatDualPrice(order.total_amount)}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="font-bold text-zinc-500">Paiement</dt><dd className="mt-1 font-semibold">{paymentMethodLabel(order.payment_method)}</dd></div>
          <div><dt className="font-bold text-zinc-500">Téléphone</dt><dd className="mt-1 font-semibold">{order.customer_phone}</dd></div>
        </dl>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="inline-flex flex-1 items-center justify-center rounded-xl bg-black px-5 py-3 font-black text-white transition hover:bg-[#c9a227]">Retour à la boutique</Link>
          <Link href="/#collection" className="inline-flex flex-1 items-center justify-center rounded-xl border border-[#e5e5e5] bg-white px-5 py-3 font-black text-black transition hover:border-[#c9a227]">Commander un autre produit</Link>
        </div>
      </section>
    </main>
  );
}
