"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PaymentMethod } from "@/app/lib/orders";
import { formatDualPrice, parsePrice } from "@/app/lib/prices";
import type { Product } from "@/app/lib/products";
import { isValidEmail } from "@/app/lib/validation";

export default function CheckoutForm({ product }: { product: Product }) {
  const router = useRouter();
  const submissionStarted = useRef(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const unitPrice = parsePrice(product.price);
  const totalAmount = useMemo(() => unitPrice * quantity, [quantity, unitPrice]);
  const stockQuantity = Math.max(0, product.stockQuantity);
  const isOutOfStock = !product.inStock || stockQuantity === 0;
  const isStockReached = quantity >= stockQuantity;

  async function handleOrder() {
    if (submissionStarted.current || loading) return;
    if (isOutOfStock) {
      setError("Stock insuffisant pour ce produit.");
      return;
    }

    const requiredFields = [[firstName, "prénom"], [lastName, "nom"], [phone, "téléphone"], [email, "adresse e-mail"], [address, "adresse"], [city, "ville ou quartier"]] as const;
    const missingField = requiredFields.find(([value]) => !value.trim());
    if (missingField) {
      setError(`Veuillez renseigner votre ${missingField[1]}.`);
      return;
    }
    if (!isValidEmail(email)) {
      setError("Veuillez saisir une adresse e-mail valide.");
      return;
    }

    const orderPayload = { productId: product.id, quantity, unit_price: unitPrice, total_amount: totalAmount, firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), email: email.trim(), address: address.trim(), city: city.trim(), note: note.trim(), paymentMethod };
    submissionStarted.current = true;
    setLoading(true);
    setError("");
    let orderCreated = false;

    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(orderPayload) });
      const result = (await response.json()) as { success?: boolean; orderNumber?: string; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error ?? "Impossible de créer la commande.");
      if (!result.orderNumber) throw new Error("La commande a été créée sans numéro de référence.");
      orderCreated = true;
      router.push(`/commande-confirmee/${result.orderNumber}`);
    } catch (submissionError) {
      console.error("Erreur lors de l’envoi de la commande :", submissionError);
      setError(submissionError instanceof Error ? submissionError.message : "Impossible de créer la commande.");
    } finally {
      setLoading(false);
      if (!orderCreated) submissionStarted.current = false;
    }
  }

  return (
    <main className="min-h-screen bg-[#fafafa] text-zinc-900">
      <header className="border-b border-[#e5e5e5] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="text-sm font-bold tracking-[0.22em] text-black">KING OF CAPS</Link>
          <Link href={`/product/${product.id}`} className="text-sm font-semibold text-zinc-600 hover:text-[#c9a227]">Retour au produit</Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="order-2 space-y-6 lg:order-1">
          <div>
            <p className="text-sm font-bold tracking-[0.22em] text-[#c9a227]">CHECKOUT SÉCURISÉ</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Finaliser la commande</h1>
          </div>

          <CheckoutCard title="Informations de l’acheteur">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Prénom *" value={firstName} onChange={setFirstName} required />
              <Input label="Nom *" value={lastName} onChange={setLastName} required />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input label="Téléphone *" type="tel" value={phone} onChange={setPhone} required />
              <Input label="Adresse e-mail *" type="email" autoComplete="email" value={email} onChange={setEmail} required />
            </div>
          </CheckoutCard>

          <CheckoutCard title="Livraison">
            <Input label="Adresse *" value={address} onChange={setAddress} required />
            <div className="mt-4"><Input label="Ville ou quartier *" value={city} onChange={setCity} required /></div>
            <div className="mt-4">
              <label className="block text-sm font-bold text-zinc-800">
                <span className="mb-2 block">Informations complémentaires optionnelles</span>
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="w-full resize-y rounded-xl border border-[#d4d4d4] bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/15" />
              </label>
            </div>
          </CheckoutCard>

          <CheckoutCard title="Paiement">
            <PaymentOption value="cash_on_delivery" selected={paymentMethod} onChange={setPaymentMethod} title="Paiement à la livraison" description="Payez lorsque votre commande vous est remise." />
            <PaymentOption value="mobile_money" selected={paymentMethod} onChange={setPaymentMethod} title="Mobile Money" description="Vous serez redirigé vers le checkout sécurisé FedaPay." />
            <PaymentOption value="card" selected={paymentMethod} onChange={setPaymentMethod} title="Carte bancaire" description="Le paiement est traité uniquement par la page sécurisée FedaPay." />
          </CheckoutCard>

          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          {isOutOfStock && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">Rupture de stock.</p>}
          <div className="relative z-[9999] pointer-events-auto">
            <button
              type="button"
              onClick={handleOrder}
              disabled={loading || isOutOfStock}
              style={{ position: "relative", zIndex: 9999, pointerEvents: "auto" }}
              className="relative z-[9999] w-full pointer-events-auto rounded-xl bg-black py-4 font-black text-white transition hover:bg-[#c9a227] disabled:opacity-60"
            >
              {loading ? "Commande en cours..." : isOutOfStock ? "Rupture de stock" : "Valider la commande"}
            </button>
          </div>
        </section>

        <aside className="order-1 h-fit rounded-3xl border border-[#e5e5e5] bg-white p-5 shadow-xl shadow-zinc-200/60 lg:sticky lg:top-6">
          <p className="text-sm font-bold tracking-[0.2em] text-[#c9a227]">RÉSUMÉ DE LA COMMANDE</p>
          <div className="mt-5 flex gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100"><Image src={product.image} alt={product.name} fill sizes="96px" className="object-cover" /></div>
            <div><h2 className="font-black">{product.name}</h2><p className="mt-2 text-sm text-zinc-500">Prix unitaire</p><p className="font-bold leading-tight text-[#c9a227]">{formatDualPrice(unitPrice)}</p></div>
          </div>
          <div className="mt-6 border-y border-[#e5e5e5] py-5">
            <p className="text-sm font-bold text-zinc-800">Quantité</p>
            <div className="mt-3 inline-flex items-center rounded-xl border border-[#d4d4d4] bg-white">
              <button type="button" aria-label="Diminuer la quantité" onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="px-4 py-2 text-xl">−</button>
              <span className="min-w-10 text-center font-black">{quantity}</span>
              <button type="button" aria-label="Augmenter la quantité" onClick={() => setQuantity((current) => current + 1)} disabled={isStockReached} className="px-4 py-2 text-xl disabled:cursor-not-allowed disabled:opacity-40">+</button>
            </div>
            {isStockReached && <p className="mt-2 text-xs font-semibold text-zinc-500">Stock maximum atteint ({stockQuantity} unité{stockQuantity > 1 ? "s" : ""}).</p>}
          </div>
          <div className="mt-5 flex items-start justify-between gap-3"><span className="font-bold">Total</span><strong className="text-right text-xl leading-tight text-[#c9a227] sm:text-2xl">{formatDualPrice(totalAmount)}</strong></div>
        </aside>
      </div>
    </main>
  );
}

function CheckoutCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-black">{title}</h2><div className="mt-5">{children}</div></section>;
}

function Input({ label, type = "text", autoComplete, value, onChange, required = false }: { label: string; type?: string; autoComplete?: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="block text-sm font-bold text-zinc-800"><span className="mb-2 block">{label}</span><input type={type} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="w-full rounded-xl border border-[#d4d4d4] bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/15" /></label>;
}

function PaymentOption({ value, selected, onChange, title, description }: { value: PaymentMethod; selected: PaymentMethod; onChange: (value: PaymentMethod) => void; title: string; description: string }) {
  return <label className={`mt-3 flex cursor-pointer gap-3 rounded-xl border p-4 transition ${selected === value ? "border-[#c9a227] bg-[#c9a227]/10" : "border-[#e5e5e5] bg-white"}`}><input type="radio" name="payment" checked={selected === value} onChange={() => onChange(value)} className="mt-1 accent-[#c9a227]" /><span><span className="block font-bold">{title}</span><span className="mt-1 block text-sm leading-5 text-zinc-500">{description}</span></span></label>;
}
