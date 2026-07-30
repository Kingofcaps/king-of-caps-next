import Link from "next/link";
import HomeHeader from "./HomeHeader";
import StorefrontBottom from "./StorefrontBottom";

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

export default function LegalPage({
  eyebrow,
  title,
  introduction,
  sections,
}: {
  eyebrow: string;
  title: string;
  introduction: string;
  sections: LegalSection[];
}) {
  return (
    <main className="min-h-screen bg-[#fafafa] text-zinc-950">
      <HomeHeader />
      <article className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
        <header className="rounded-3xl bg-[#020817] px-6 py-9 text-white shadow-xl shadow-slate-950/10 sm:px-10 sm:py-12">
          <p className="text-xs font-bold tracking-[0.3em] text-[#d4af37]">{eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.03em] sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">{introduction}</p>
        </header>

        <div className="mt-8 grid gap-5 sm:mt-10">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-black/[0.07] bg-white p-6 shadow-[0_8px_28px_rgba(0,0,0,0.035)] sm:p-8">
              <h2 className="text-xl font-black tracking-[-0.02em] text-[#020817] sm:text-2xl">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-sm leading-7 text-zinc-600 sm:text-base">{paragraph}</p>
              ))}
              {section.items && (
                <ul className="mt-4 space-y-3 pl-5 text-sm leading-7 text-zinc-600 marker:text-[#c9a227] sm:text-base">
                  {section.items.map((item) => <li key={item} className="list-disc pl-1">{item}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>

        <aside className="mt-8 rounded-2xl border border-[#c9a227]/30 bg-[#fcfaf4] p-6 text-sm leading-7 text-zinc-700 sm:p-8">
          <h2 className="font-black text-[#020817]">Une question ?</h2>
          <p className="mt-2">
            Contactez KING OF CAPS au <a href="tel:+2290150687515" className="font-bold text-[#8a6b13] underline underline-offset-4">+229 01 50 68 75 15</a> ou à{" "}
            <a href="mailto:contact@kingofcaps.bj" className="font-bold text-[#8a6b13] underline underline-offset-4">contact@kingofcaps.bj</a>.
          </p>
          <Link href="/" className="mt-5 inline-flex rounded-full bg-[#020817] px-5 py-2.5 font-bold text-white transition hover:bg-[#c9a227]">Retour à la boutique</Link>
        </aside>

        <p className="mt-6 text-center text-xs text-zinc-500">Dernière mise à jour : 30 juillet 2026.</p>
      </article>
      <StorefrontBottom />
    </main>
  );
}
