"use client";

import Link from "next/link";
import { CreditCard, Smartphone, Truck, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/app/components/CartProvider";
import { PENDING_CART_ORDER_KEY, cartItemCount, cartSubtotal, type CartItem } from "@/app/lib/cart";
import { checkoutButtonLabel, paymentMethodLabel, PAYMENT_OPTIONS } from "@/app/lib/checkout";
import type { PaymentMethod } from "@/app/lib/orders";
import { formatDualPrice } from "@/app/lib/prices";
import { isValidEmail } from "@/app/lib/validation";
import ProductImage from "@/app/components/ProductImage";

const ONLINE_PAYMENT_UNAVAILABLE_MESSAGE = "Le paiement en ligne est temporairement indisponible. Choisissez le paiement à la livraison.";
export default function CheckoutForm({
  initialItems,
  source,
  onlinePaymentsEnabled,
}: {
  initialItems?: CartItem[];
  source: "cart" | "direct";
  onlinePaymentsEnabled: boolean;
}) {
  const router = useRouter();
  const cart = useCart();
  const items = useMemo(() => source === "cart" ? cart.items : (initialItems ?? []), [cart.items, initialItems, source]);
  const ready = source === "direct" || cart.hydrated;
  const submissionStarted = useRef(false);
  const checkoutIdRef = useRef<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;
  const onlinePaymentUnavailable = !onlinePaymentsEnabled && paymentMethod !== "cash_on_delivery";

  async function handleOrder() {
    if (submissionStarted.current || loading) return;
    if (items.length === 0) return setError("Votre panier est vide.");
    if (onlinePaymentUnavailable) return setError(ONLINE_PAYMENT_UNAVAILABLE_MESSAGE);
    const fields = [[firstName, "prénom"], [lastName, "nom"], [phone, "téléphone"], [email, "adresse e-mail"], [address, "adresse"], [city, "ville ou quartier"]] as const;
    const missing = fields.find(([value]) => !value.trim());
    if (missing) return setError(`Veuillez renseigner votre ${missing[1]}.`);
    if (!isValidEmail(email)) return setError("Veuillez saisir une adresse e-mail valide.");

    checkoutIdRef.current ??= globalThis.crypto.randomUUID();
    submissionStarted.current = true;
    setLoading(true);
    setError("");
    let orderCreated = false;

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutId: checkoutIdRef.current,
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          city: city.trim(),
          note: note.trim(),
          paymentMethod,
        }),
      });
      const result = (await response.json()) as { success?: boolean; orderNumber?: string; checkoutUrl?: string; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error ?? "Impossible de créer la commande.");
      if (!result.orderNumber) throw new Error("La commande a été créée sans numéro de référence.");
      orderCreated = true;

      if (paymentMethod === "cash_on_delivery") {
        if (source === "cart") cart.clearCart();
        router.push(`/commande-confirmee/${encodeURIComponent(result.orderNumber)}`);
      } else {
        if (!result.checkoutUrl) throw new Error("PayDunya n’a pas retourné d’URL de paiement.");
        if (source === "cart") {
          window.localStorage.setItem(PENDING_CART_ORDER_KEY, result.orderNumber);
        }
        window.location.assign(result.checkoutUrl);
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Impossible de créer la commande.");
    } finally {
      setLoading(false);
      if (!orderCreated) submissionStarted.current = false;
    }
  }

  if (!ready) return <main className="min-h-screen bg-[#fafafa] p-5"><div className="mx-auto mt-16 h-52 max-w-5xl animate-pulse rounded-3xl bg-zinc-100" /></main>;

  return (
    <main className="min-h-screen bg-[#fafafa] text-zinc-900">
      <header className="border-b border-[#e5e5e5] bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8"><Link href="/" className="text-sm font-bold tracking-[0.22em]">KING OF CAPS</Link><Link href={source === "cart" ? "/panier" : "/"} className="text-sm font-semibold text-zinc-600">Retour</Link></div></header>
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="order-2 space-y-6 lg:order-1">
          <div><p className="text-sm font-bold tracking-[0.22em] text-[#a8861e]">CHECKOUT SÉCURISÉ</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Finaliser la commande</h1></div>
          <CheckoutCard title="Informations de l’acheteur"><div className="grid gap-4 sm:grid-cols-2"><Input label="Prénom *" value={firstName} onChange={setFirstName} /><Input label="Nom *" value={lastName} onChange={setLastName} /><Input label="Téléphone *" type="tel" value={phone} onChange={setPhone} /><Input label="Adresse e-mail *" type="email" value={email} onChange={setEmail} /></div></CheckoutCard>
          <CheckoutCard title="Livraison"><Input label="Adresse *" value={address} onChange={setAddress} /><div className="mt-4"><Input label="Ville ou arrondissement *" value={city} onChange={setCity} /></div><label className="mt-4 block text-sm font-bold"><span className="mb-2 block">Informations complémentaires</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-[#c9a227]" /></label></CheckoutCard>
          <CheckoutCard title="Paiement"><button type="button" onClick={() => setPaymentSheetOpen(true)} className="flex w-full items-center justify-between rounded-xl border-2 border-[#c9a227] bg-white px-4 py-4 text-left"><span><span className="block text-xs font-bold uppercase tracking-wider text-zinc-500">Moyen sélectionné</span><span className="mt-1 block font-black">{paymentMethodLabel(paymentMethod)}</span></span><span className="text-sm font-black text-[#8a6b13]">Choisir un moyen de paiement</span></button></CheckoutCard>
          {onlinePaymentUnavailable && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{ONLINE_PAYMENT_UNAVAILABLE_MESSAGE}</p>}
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          <button type="button" onClick={handleOrder} disabled={loading || items.length === 0 || onlinePaymentUnavailable} className="w-full rounded-2xl bg-black px-5 py-4 text-lg font-black text-white shadow-lg transition hover:bg-[#c9a227] disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Traitement en cours…" : checkoutButtonLabel(paymentMethod, total)}</button>
        </section>

        <aside className="order-1 h-fit rounded-3xl border border-[#e5e5e5] bg-white p-5 shadow-xl shadow-zinc-200/50 lg:sticky lg:top-6"><p className="text-sm font-bold tracking-[0.18em] text-[#a8861e]">RÉSUMÉ · {cartItemCount(items)} ARTICLE{cartItemCount(items) > 1 ? "S" : ""}</p><div className="mt-5 max-h-[440px] space-y-4 overflow-y-auto pr-1">{items.map((item) => <div key={item.productId} className="flex gap-3 border-b border-zinc-100 pb-4 last:border-0"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100"><ProductImage src={item.image} alt={item.name} fill sizes="80px" className="object-cover" /></div><div className="min-w-0 flex-1"><p className="line-clamp-2 font-black">{item.name}</p><p className="mt-1 text-xs text-zinc-500">{formatDualPrice(item.unitPrice)} × {item.quantity}</p><p className="mt-1 font-bold text-[#a8861e]">{formatDualPrice(item.unitPrice * item.quantity)}</p></div></div>)}</div><dl className="mt-5 space-y-3 border-t border-zinc-200 pt-5 text-sm"><div className="flex justify-between"><dt>Sous-total</dt><dd className="font-bold">{formatDualPrice(subtotal)}</dd></div><div className="flex justify-between"><dt>Frais de livraison</dt><dd className="font-bold">{formatDualPrice(deliveryFee)}</dd></div><div className="flex justify-between border-t border-zinc-200 pt-4 text-lg font-black"><dt>Total final</dt><dd className="text-[#a8861e]">{formatDualPrice(total)}</dd></div></dl></aside>
      </div>

      <PaymentSheet open={paymentSheetOpen} selected={paymentMethod} onlinePaymentsEnabled={onlinePaymentsEnabled} onClose={() => setPaymentSheetOpen(false)} onSelect={(method) => { setPaymentMethod(method); setError(""); setPaymentSheetOpen(false); }} />
    </main>
  );
}

function PaymentSheet({ open, selected, onlinePaymentsEnabled, onClose, onSelect }: { open: boolean; selected: PaymentMethod; onlinePaymentsEnabled: boolean; onClose: () => void; onSelect: (method: PaymentMethod) => void }) {
  if (!open) return null;
  const icons = { mobile_money: Smartphone, card: CreditCard, cash_on_delivery: Truck };
  const methods = PAYMENT_OPTIONS.map((option) => ({ ...option, icon: icons[option.value], disabled: option.online && !onlinePaymentsEnabled }));
  return <div className="fixed inset-0 z-[100] flex items-end bg-black/40" role="dialog" aria-modal="true" aria-labelledby="payment-sheet-title" onClick={onClose}><section className="w-full rounded-t-[28px] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:mx-auto sm:max-w-xl" onClick={(event) => event.stopPropagation()}><div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-zinc-200" /><div className="flex items-center justify-between"><h2 id="payment-sheet-title" className="text-xl font-black">Choisir un moyen de paiement</h2><button type="button" onClick={onClose} aria-label="Fermer" className="grid h-10 w-10 place-items-center rounded-full bg-zinc-100"><X className="h-5 w-5" /></button></div><div className="mt-5 space-y-3">{methods.map((method) => { const Icon = method.icon; return <button key={method.value} type="button" disabled={method.disabled} onClick={() => onSelect(method.value)} className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${selected === method.value ? "border-[#c9a227] bg-[#c9a227]/10" : "border-zinc-200"}`}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-zinc-100"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-black">{method.title}</span><span className="mt-1 block text-sm text-zinc-500">{method.description}</span></span><span className={`h-5 w-5 rounded-full border-2 p-1 ${selected === method.value ? "border-[#c9a227] bg-[#c9a227] shadow-[inset_0_0_0_3px_white]" : "border-zinc-300"}`} /></button>; })}</div></section></div>;
}

function CheckoutCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-black">{title}</h2><div className="mt-5">{children}</div></section>;
}

function Input({ label, type = "text", value, onChange }: { label: string; type?: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-bold"><span className="mb-2 block">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-[#c9a227]" /></label>;
}
