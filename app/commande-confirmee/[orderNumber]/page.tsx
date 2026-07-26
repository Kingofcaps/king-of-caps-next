import Link from "next/link";
import { Check, Clock3, X } from "lucide-react";
import { notFound } from "next/navigation";
import { getOrderByNumber, type OrderItem } from "@/app/lib/orders";
import { formatMoney, normalizeCurrency } from "@/app/lib/currency";
import CartOrderCleanup from "./CartOrderCleanup";
import ProductImage from "@/app/components/ProductImage";

export const dynamic = "force-dynamic";

function paymentMethodLabel(method: string) {
  if (method === "cash_on_delivery") return "Paiement à la livraison";
  if (method === "mobile_money") return "Mobile Money via PayDunya";
  return "Carte bancaire via PayDunya";
}

export default async function OrderSummaryPage({ params }: PageProps<"/commande-confirmee/[orderNumber]">) {
  const { orderNumber } = await params;
  const order = await getOrderByNumber(orderNumber);
  if (!order) notFound();

  const isCashOnDelivery = order.payment_method === "cash_on_delivery";
  const isPaid = !isCashOnDelivery && order.payment_status === "paid" && order.order_status === "confirmed";
  const isPending = !isCashOnDelivery && order.payment_status === "pending" && order.order_status === "awaiting_payment";
  const isFailed = !isCashOnDelivery && (order.payment_status === "failed" || order.order_status === "cancelled");
  const items: OrderItem[] = order.order_items?.length ? order.order_items : [{
    id: `legacy-${order.id}`,
    order_id: order.id,
    product_id: order.product_id,
    product_name: order.product_name,
    product_image: order.product_image,
    unit_price: order.unit_price,
    quantity: order.quantity,
    line_total: order.total_amount,
    currency: normalizeCurrency(order.currency),
    created_at: order.created_at,
  }];
  const subtotal = order.subtotal_amount ?? items.reduce((total, item) => total + item.line_total, 0);
  const deliveryFee = order.delivery_fee ?? Math.max(0, order.total_amount - subtotal);
  const currency = normalizeCurrency(order.currency);
  const presentation = isPaid
    ? { title: "Commande confirmée", description: "Votre paiement PayDunya a été vérifié avec succès.", icon: Check, tone: "bg-emerald-100 text-emerald-700" }
    : isPending
      ? { title: "Paiement en cours de vérification", description: "La commande sera confirmée uniquement après validation réelle par PayDunya.", icon: Clock3, tone: "bg-amber-100 text-amber-700" }
      : isFailed
        ? { title: "Paiement non finalisé", description: "La commande n’est pas confirmée et la réservation de stock a été libérée.", icon: X, tone: "bg-red-100 text-red-700" }
        : { title: "Commande enregistrée", description: "Votre commande est enregistrée. Le règlement sera effectué à la livraison.", icon: Clock3, tone: "bg-amber-100 text-amber-700" };
  const Icon = presentation.icon;

  return (
    <main className="min-h-screen bg-[#fafafa] px-4 py-7 text-zinc-900 sm:px-8 sm:py-14">
      <CartOrderCleanup orderNumber={order.order_number} shouldClear={isPaid || isCashOnDelivery} />
      <section className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-[#e5e5e5] bg-white shadow-xl shadow-zinc-200/60">
        <div className="p-6 sm:p-9"><div className={`grid h-14 w-14 place-items-center rounded-full ${presentation.tone}`}><Icon className="h-7 w-7" /></div><p className="mt-5 text-xs font-bold tracking-[0.22em] text-[#a8861e]">KING OF CAPS</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">{presentation.title}</h1><p className="mt-3 leading-7 text-zinc-600">{presentation.description}</p>
          <div className="mt-6 grid gap-3 rounded-2xl border border-[#ece4c9] bg-[#faf8f1] p-4 sm:grid-cols-2"><div><p className="text-xs font-bold tracking-wider text-zinc-500">NUMÉRO DE COMMANDE</p><p className="mt-1 font-black text-[#a8861e]">{order.order_number}</p></div><div><p className="text-xs font-bold tracking-wider text-zinc-500">DATE</p><p className="mt-1 font-bold">{new Date(order.created_at).toLocaleString("fr-FR")}</p></div></div>

          <h2 className="mt-8 text-lg font-black">Produits</h2><div className="mt-3 space-y-3">{items.map((item) => <article key={item.id} className="flex gap-3 rounded-2xl border border-zinc-200 p-3"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100"><ProductImage src={item.product_image} alt={item.product_name} fill sizes="80px" className="object-cover" /></div><div className="min-w-0 flex-1"><p className="font-black">{item.product_name}</p><p className="mt-1 text-sm text-zinc-500">{formatMoney(item.unit_price, normalizeCurrency(item.currency, currency))} × {item.quantity}</p><p className="mt-1 font-black text-[#a8861e]">{formatMoney(item.line_total, normalizeCurrency(item.currency, currency))}</p></div></article>)}</div>

          <dl className="mt-6 space-y-3 rounded-2xl bg-zinc-50 p-4 text-sm"><Detail label="Sous-total général" value={formatMoney(subtotal, currency)} /><Detail label="Frais de livraison" value={formatMoney(deliveryFee, currency)} /><Detail label="Total final" value={formatMoney(order.total_amount, currency)} strong />{normalizeCurrency(order.payment_currency, currency) !== currency && <Detail label="Montant réglé via PayDunya" value={formatMoney(order.payment_total_amount, normalizeCurrency(order.payment_currency))} />}</dl>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2"><Detail label="Moyen de paiement" value={paymentMethodLabel(order.payment_method)} /><Detail label="Statut du paiement" value={isCashOnDelivery ? "À payer à la livraison" : order.payment_status === "paid" ? "Payé" : order.payment_status === "failed" ? "Échec" : "En attente"} /><Detail label="Statut de la commande" value={order.order_status === "awaiting_payment" ? "Paiement en attente" : order.order_status === "confirmed" ? "Confirmée" : order.order_status === "cancelled" ? "Annulée" : "Enregistrée"} /><Detail label="Client" value={`${order.customer_first_name} ${order.customer_last_name}`} /><Detail label="Téléphone" value={order.customer_phone} /><Detail label="Adresse" value={order.customer_address} /><Detail label="Ville ou arrondissement" value={order.customer_city} /></dl>

          {isPending && order.paydunya_token && <a href={`/api/payments/paydunya/return?token=${encodeURIComponent(order.paydunya_token)}`} className="mt-7 flex w-full items-center justify-center rounded-xl border-2 border-[#c9a227] px-5 py-3.5 font-black text-black">Vérifier à nouveau</a>}
          <Link href="/" className="mt-3 flex w-full items-center justify-center rounded-xl bg-black px-5 py-4 font-black text-white">Retourner à la boutique</Link>
        </div>
      </section>
    </main>
  );
}

function Detail({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex items-start justify-between gap-4"><dt className="font-bold text-zinc-500">{label}</dt><dd className={`text-right ${strong ? "text-lg font-black text-[#a8861e]" : "font-semibold"}`}>{value}</dd></div>;
}
