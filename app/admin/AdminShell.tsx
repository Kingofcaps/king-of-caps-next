"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, Package, ShoppingCart, Store, X } from "lucide-react";
import { useEffect, useState } from "react";

const navigation = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Produits", icon: Package },
  { href: "/admin/orders", label: "Commandes", icon: ShoppingCart },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMobileMenuOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  function isCurrentPage(href: string) {
    return pathname === href;
  }

  function navigationClassName(href: string) {
    return `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${isCurrentPage(href) ? "bg-[#c9a227]/15 text-[#a8861e] ring-1 ring-[#c9a227]/30" : "text-zinc-700 hover:bg-zinc-100 hover:text-black"}`;
  }

  const navigationLinks = (onNavigate?: () => void) => navigation.map(({ href, label, icon: Icon }) => (
    <Link key={href} href={href} onClick={onNavigate} className={navigationClassName(href)}>
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
      <span>{label}</span>
    </Link>
  ));

  return (
    <div className="admin-light min-h-screen bg-[#f7f7f7] text-zinc-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-[#e5e5e5] bg-white p-5 md:flex">
        <Link href="/admin" className="rounded-xl px-3 py-2 transition hover:bg-zinc-50">
          <p className="text-xs font-bold tracking-[0.28em] text-[#c9a227]">KING OF CAPS</p>
          <h1 className="mt-1 text-xl font-black">Administration</h1>
        </Link>
        <nav aria-label="Navigation administration" className="mt-10 grid gap-2">
          {navigationLinks()}
          <Link href="/" className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-black">
            <Store aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span>Voir la boutique</span>
          </Link>
        </nav>
        <button onClick={logout} className="mt-auto flex items-center gap-3 rounded-xl border border-[#e5e5e5] px-3 py-3 text-left text-sm font-bold text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700">
          <LogOut aria-hidden="true" className="h-5 w-5" />
          Déconnexion
        </button>
      </aside>

      <main className="min-h-screen min-w-0 md:ml-72">
        <header className="sticky top-0 z-30 border-b border-[#e5e5e5] bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link href="/admin" className="text-xs font-bold tracking-[0.2em] text-[#c9a227]">KING OF CAPS</Link>
            <button type="button" onClick={() => setIsMobileMenuOpen(true)} aria-label="Ouvrir la navigation" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#e5e5e5] bg-white text-black transition hover:border-[#c9a227]">
              <Menu aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </header>
        <div className="min-w-0">{children}</div>
      </main>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" aria-label="Fermer la navigation" onClick={() => setIsMobileMenuOpen(false)} className="absolute inset-0 cursor-default bg-black/35" />
          <aside role="dialog" aria-modal="true" aria-label="Navigation administration" className="relative flex h-full w-[min(18rem,calc(100vw-2.5rem))] flex-col border-r border-[#e5e5e5] bg-white p-5 shadow-2xl transition-transform">
            <div className="flex items-start justify-between gap-3">
              <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)} className="rounded-xl px-3 py-2"><p className="text-xs font-bold tracking-[0.24em] text-[#c9a227]">KING OF CAPS</p><h1 className="mt-1 text-lg font-black">Administration</h1></Link>
              <button type="button" onClick={() => setIsMobileMenuOpen(false)} aria-label="Fermer" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#e5e5e5] text-zinc-700 transition hover:border-[#c9a227] hover:text-black"><X aria-hidden="true" className="h-5 w-5" /></button>
            </div>
            <nav aria-label="Navigation mobile" className="mt-9 grid gap-2">
              {navigationLinks(() => setIsMobileMenuOpen(false))}
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-black"><Store aria-hidden="true" className="h-5 w-5 shrink-0" />Voir la boutique</Link>
            </nav>
            <button onClick={logout} className="mt-auto flex items-center gap-3 rounded-xl border border-[#e5e5e5] px-3 py-3 text-left text-sm font-bold text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"><LogOut aria-hidden="true" className="h-5 w-5" />Déconnexion</button>
          </aside>
        </div>
      )}
    </div>
  );
}
