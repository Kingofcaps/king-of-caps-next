import Link from "next/link";
import {
  BadgeCheck,
  HeartHandshake,
  Mail,
  MessageCircle,
  Music2,
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
    title: "Livraison au Bénin et à l’international",
    description: "Nous livrons vos commandes partout au Bénin et dans plusieurs pays, selon la destination.",
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
      <section aria-labelledby="commitments-title" className="border-t border-black/[0.06] bg-white px-5 py-10 sm:px-8 sm:py-14 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold tracking-[0.34em] text-[#a8861e]">L’EXIGENCE KING OF CAPS</p>
            <h2 id="commitments-title" className="mt-4 text-3xl font-black tracking-[-0.03em] text-zinc-950 sm:text-5xl">Nos engagements</h2>
            <div aria-hidden="true" className="mx-auto mt-4 h-px w-16 bg-[#c9a227]" />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:mt-10 lg:grid-cols-5">
            {commitments.map(({ title, description, icon: Icon }) => (
              <article key={title} className="group flex flex-col items-center rounded-[18px] border border-black/[0.07] bg-white px-5 py-7 text-center shadow-[0_8px_28px_rgba(0,0,0,0.035)] transition duration-500 ease-out hover:-translate-y-1 hover:border-[#c9a227]/40 hover:shadow-[0_16px_40px_rgba(0,0,0,0.07)] lg:px-4 lg:py-6">
                <div className="grid h-11 w-11 place-items-center rounded-full border border-[#c9a227]/30 bg-[#fcfaf4] text-[#a8861e] transition duration-500 group-hover:border-[#c9a227] group-hover:bg-[#c9a227] group-hover:text-white">
                  <Icon aria-hidden="true" strokeWidth={1.45} className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-black leading-snug tracking-[-0.01em] text-zinc-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-zinc-950 px-5 text-white sm:px-8">
        <div className="mx-auto max-w-7xl py-8 sm:py-10">
          <div className="grid gap-6 border-b border-white/10 pb-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <p className="text-xs font-bold tracking-[0.36em] text-[#d4af37]">KING OF CAPS</p>
              <p className="mt-3 max-w-md text-xl font-black tracking-[-0.03em] sm:text-2xl lg:text-3xl">Le royaume de la casquette au Bénin.</p>
              <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-400">Des pièces sélectionnées avec soin, un service attentif et une expérience pensée pour vous.</p>
            </div>
            <nav aria-label="Liens de bas de page" className="flex flex-col items-start gap-2 text-sm font-bold">
              <Link href="/#collection" className="transition hover:text-[#d4af37]">La collection</Link>
              <div className="flex items-center gap-1 sm:gap-2">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Contacter KING OF CAPS sur WhatsApp" className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:text-[#d4af37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]">
                  <MessageCircle aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                </a>
                <a href="mailto:contact@kingofcaps.bj" aria-label="Envoyer un e-mail à KING OF CAPS" className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:text-[#d4af37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]">
                  <Mail aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                </a>
                <a href="https://www.instagram.com/king_0f_caps" target="_blank" rel="noopener noreferrer" aria-label="Suivre KING OF CAPS sur Instagram" className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:text-[#d4af37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <rect width="18" height="18" x="3" y="3" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.4" cy="6.6" r="0.8" fill="currentColor" stroke="none" />
                  </svg>
                </a>
                <a href="https://www.tiktok.com/@king.of.caps_" target="_blank" rel="noopener noreferrer" aria-label="Suivre KING OF CAPS sur TikTok" className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:text-[#d4af37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]">
                  <Music2 aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                </a>
              </div>
            </nav>
          </div>
          <div className="flex flex-col gap-2 pt-5 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} KING OF CAPS. Tous droits réservés.</p>
            <p>Cotonou, Bénin</p>
          </div>
        </div>
      </footer>
    </>
  );
}
