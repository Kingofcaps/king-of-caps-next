import Link from "next/link";

export default function CheckoutSuccessPage() {
  return <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-5 text-zinc-900"><div className="max-w-lg rounded-3xl border border-[#e5e5e5] bg-white p-8 text-center shadow-xl shadow-zinc-200/60"><p className="text-sm font-bold tracking-[0.22em] text-[#c9a227]">PAIEMENT EN COURS DE VÉRIFICATION</p><h1 className="mt-4 text-3xl font-black">Merci pour votre commande</h1><p className="mt-4 leading-7 text-zinc-600">Votre paiement est contrôlé de façon sécurisée auprès de FedaPay. Nous confirmerons votre commande dès validation.</p><Link href="/" className="mt-8 inline-flex rounded-xl bg-black px-5 py-3 font-black text-white">Retour à la boutique</Link></div></main>;
}
