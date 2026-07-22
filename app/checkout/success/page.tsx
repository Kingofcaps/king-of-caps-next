import Link from "next/link";

const messages = {
  pending: {
    eyebrow: "PAIEMENT EN COURS DE VÉRIFICATION",
    title: "Votre paiement est en attente",
    description: "PayDunya traite encore votre paiement. Votre commande sera confirmée uniquement après validation.",
  },
  cancelled: {
    eyebrow: "PAIEMENT ANNULÉ",
    title: "Votre commande n’a pas été confirmée",
    description: "Aucun paiement confirmé n’a été enregistré. Vous pouvez retourner à la boutique et réessayer.",
  },
  failed: {
    eyebrow: "PAIEMENT ÉCHOUÉ",
    title: "Le paiement n’a pas abouti",
    description: "Votre commande n’a pas été confirmée et aucun stock n’a été déduit définitivement.",
  },
  error: {
    eyebrow: "VÉRIFICATION IMPOSSIBLE",
    title: "Nous n’avons pas pu vérifier le paiement",
    description: "Ne recommencez pas immédiatement si votre compte a été débité. Contactez-nous avec votre numéro de commande.",
  },
} as const;

export default async function CheckoutSuccessPage({
  searchParams,
}: PageProps<"/checkout/success">) {
  const query = await searchParams;
  const status = typeof query.status === "string" && query.status in messages ? query.status as keyof typeof messages : "pending";
  const orderNumber = typeof query.orderNumber === "string" ? query.orderNumber : "";
  const message = messages[status];

  return <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-5 text-zinc-900"><div className="max-w-lg rounded-3xl border border-[#e5e5e5] bg-white p-8 text-center shadow-xl shadow-zinc-200/60"><p className="text-sm font-bold tracking-[0.22em] text-[#c9a227]">{message.eyebrow}</p><h1 className="mt-4 text-3xl font-black">{message.title}</h1><p className="mt-4 leading-7 text-zinc-600">{message.description}</p>{orderNumber && <p className="mt-4 text-sm font-bold text-zinc-700">Commande : {orderNumber}</p>}<Link href="/" className="mt-8 inline-flex rounded-xl bg-black px-5 py-3 font-black text-white">Retour à la boutique</Link></div></main>;
}
