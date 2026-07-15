import Link from "next/link";
import {
  BadgeCheck,
  HeartHandshake,
  MessageCircle,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";

const WHATSAPP_URL = "https://wa.me/22950687515";

type Commitment = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const commitments: Commitment[] = [
  {
    title: "Livraison partout au Bénin",
    description: "Nous livrons vos commandes rapidement partout au Bénin.",
    icon: Truck,
  },
  {
    title: "Paiement sécurisé",
    description: "Mobile Money, paiement à la livraison et autres moyens sécurisés.",
    icon: ShieldCheck,
  },
  {
    title: "Produits authentiques",
    description: "Des casquettes soigneusement sélectionnées auprès de fournisseurs de confiance.",
    icon: BadgeCheck,
  },
  {
    title: "Service client",
    description: "Nous répondons rapidement sur WhatsApp et les réseaux sociaux.",
    icon: MessageCircle,
  },
  {
    title: "Satisfaction garantie",
    description: "Nous faisons tout pour offrir une excellente expérience à nos clients.",
    icon: HeartHandshake,
  },
];

export default function StorefrontBottom() {
  return (
    <>
      <section aria-labelledby="commitments-title" className="border-t border-black/[0.06] bg-white px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold tracking-[0.34em] text-[#a8861e]">L’EXIGENCE KING OF CAPS</p>
            <h2 id="commitments-title" className="mt-4 text-3xl font-black tracking-[-0.03em] text-zinc-950 sm:text-5xl">Nos engagements</h2>
            <div aria-hidden="true" className="mx-auto mt-6 h-px w-16 bg-[#c9a227]" />
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            {commitments.map(({ title, description, icon: Icon }) => (
              <article key={title} className="group flex min-h-56 flex-col items-center rounded-[18px] border border-black/[0.07] bg-white px-5 py-7 text-center shadow-[0_8px_28px_rgba(0,0,0,0.035)] transition duration-500 ease-out hover:-translate-y-1 hover:border-[#c9a227]/40 hover:shadow-[0_16px_40px_rgba(0,0,0,0.07)]">
                <div className="grid h-11 w-11 place-items-center rounded-full border border-[#c9a227]/30 bg-[#fcfaf4] text-[#a8861e] transition duration-500 group-hover:border-[#c9a227] group-hover:bg-[#c9a227] group-hover:text-white">
                  <Icon aria-hidden="true" strokeWidth={1.45} className="h-5 w-5" />
                </div>
                <h3 className="mt-6 text-base font-black leading-snug tracking-[-0.01em] text-zinc-950">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-zinc-950 px-5 text-white sm:px-8">
        <div className="mx-auto max-w-7xl py-12 sm:py-16">
          <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <p className="text-xs font-bold tracking-[0.36em] text-[#d4af37]">KING OF CAPS</p>
              <p className="mt-4 max-w-md text-2xl font-black tracking-[-0.03em] sm:text-3xl">Le royaume de la casquette au Bénin.</p>
              <p className="mt-4 max-w-lg text-sm leading-6 text-zinc-400">Des pièces sélectionnées avec soin, un service attentif et une expérience pensée pour vous.</p>
            </div>
            <nav aria-label="Liens de bas de page" className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold">
              <Link href="/#collection" className="transition hover:text-[#d4af37]">La collection</Link>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="transition hover:text-[#d4af37]">WhatsApp</a>
            </nav>
          </div>
          <div className="flex flex-col gap-3 pt-7 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} KING OF CAPS. Tous droits réservés.</p>
            <p>Cotonou, Bénin</p>
          </div>
        </div>
      </footer>
    </>
  );
}
