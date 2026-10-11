import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight, Download, ShoppingBag } from "lucide-react";
import { createBrandedQrSvg } from "../lib/qr-code";
import { absoluteUrl, SITE_NAME, SITE_URL } from "../lib/seo";

const PAGE_PATH = "/reseaux";
const TITLE = "Nos liens officiels";
const DESCRIPTION =
  "Retrouvez KING OF CAPS sur Instagram, TikTok, WhatsApp et sur la boutique en ligne. Casquettes à Cotonou, Bénin.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    type: "website",
    locale: "fr_BJ",
    url: PAGE_PATH,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | ${TITLE}`,
    description: DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE_NAME} — Cotonou, Bénin` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | ${TITLE}`,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

type IconProps = { className?: string };

function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.6" cy="6.4" r="0.6" fill="currentColor" />
    </svg>
  );
}

function TikTokIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function SnapchatIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z" />
    </svg>
  );
}

function FacebookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function configuredUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

type LinkItem = {
  label: string;
  handle: string;
  href: string | null;
  Icon: (props: IconProps) => React.ReactElement;
};

const links: LinkItem[] = [
  {
    label: "Instagram",
    handle: "@king_0f_caps",
    href: "https://www.instagram.com/king_0f_caps/",
    Icon: InstagramIcon,
  },
  {
    label: "TikTok",
    handle: "@king.of.caps_",
    href: "https://www.tiktok.com/@king.of.caps_",
    Icon: TikTokIcon,
  },
  {
    label: "WhatsApp",
    handle: "Écrivez-nous",
    href: "https://wa.me/message/VDJXXL2SFGOPL1",
    Icon: WhatsAppIcon,
  },
  {
    label: "Snapchat",
    handle: "KING OF CAPS",
    href: "https://snapchat.com/t/cJjmmhND",
    Icon: SnapchatIcon,
  },
  {
    label: "Boutique en ligne",
    handle: SITE_URL.replace(/^https?:\/\//, ""),
    href: SITE_URL,
    Icon: ({ className }) => <ShoppingBag aria-hidden="true" className={className} />,
  },
  {
    label: "Facebook",
    handle: "KING OF CAPS",
    href: configuredUrl(process.env.NEXT_PUBLIC_FACEBOOK_URL),
    Icon: FacebookIcon,
  },
];

export default async function LinksPage() {
  const pageUrl = absoluteUrl(PAGE_PATH);
  const qrDataUrl = createBrandedQrSvg(pageUrl);
  const visibleLinks = links.filter((link) => link.href);

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-black px-5 py-12 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-[#d4af37]/10 blur-3xl"
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <div className="overflow-hidden rounded-full border border-[#d4af37]/60 shadow-[0_0_40px_rgba(212,175,55,0.2)]">
          <Image
            src="/images/logo.jpg"
            alt="Logo KING OF CAPS"
            width={120}
            height={120}
            priority
            className="h-28 w-28 object-cover"
          />
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-[0.3em] text-[#d4af37]">KING OF CAPS</h1>
        <p className="mt-2 text-[11px] uppercase tracking-[0.35em] text-white/50">Cotonou, Bénin</p>
        <div className="my-6 h-px w-16 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
        <p className="text-center text-base text-white/80">L’univers KING OF CAPS, à portée de clic.</p>

        <nav aria-label="Réseaux sociaux" className="mt-10 flex w-full flex-col gap-4">
          {visibleLinks.map(({ label, handle, href, Icon }) => (
            <a
              key={label}
              href={href!}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-h-16 items-center gap-4 rounded-2xl border border-[#d4af37]/30 bg-white/[0.03] px-5 py-3 transition duration-300 hover:-translate-y-0.5 hover:border-[#d4af37] hover:bg-[#d4af37]/10 hover:shadow-[0_8px_30px_rgba(212,175,55,0.15)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d4af37]/15 text-[#d4af37]">
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold uppercase tracking-widest">{label}</span>
                <span className="truncate text-xs text-white/50">{handle}</span>
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className="h-5 w-5 text-[#d4af37]/70 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#d4af37]"
              />
            </a>
          ))}
        </nav>

        <section
          aria-labelledby="qr-title"
          className="mt-12 flex w-full flex-col items-center rounded-2xl border border-[#d4af37]/30 bg-white/[0.03] p-6"
        >
          <h2 id="qr-title" className="text-sm font-semibold uppercase tracking-[0.3em] text-[#d4af37]">
            QR code
          </h2>
          <p className="mt-2 text-center text-xs text-white/50">Scannez pour retrouver tous nos liens.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`QR code vers ${pageUrl}`}
            width={240}
            height={240}
            className="mt-5 h-60 w-60 rounded-xl bg-white"
          />
          <a
            href={qrDataUrl}
            download="king-of-caps-reseaux-qr.svg"
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#d4af37] px-6 text-sm font-semibold uppercase tracking-widest text-black transition duration-300 hover:bg-[#e6c35c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37] active:scale-95"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            Télécharger en SVG
          </a>
          <p className="mt-3 text-[11px] text-white/40">Format vectoriel, prêt pour l’impression.</p>
        </section>

        <p className="mt-10 text-[11px] uppercase tracking-[0.25em] text-white/30">© KING OF CAPS</p>
      </div>
    </main>
  );
}
