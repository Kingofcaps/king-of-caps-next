"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navigation = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Produits" },
  { href: "/admin/orders", label: "Commandes" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  function linkClassName(href: string) {
    return `rounded-xl px-3 py-2.5 text-sm font-bold transition ${pathname === href ? "bg-black text-white" : "text-zinc-700 hover:bg-zinc-100 hover:text-black"}`;
  }

  return <div className="admin-light min-h-screen bg-[#f7f7f7] text-zinc-900 md:flex"><aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[#e5e5e5] bg-white p-5 md:flex"><Link href="/admin" className="px-3"><p className="text-xs font-bold tracking-[0.28em] text-[#c9a227]">KING OF CAPS</p><h1 className="mt-1 text-xl font-black">Administration</h1></Link><nav className="mt-10 grid gap-2">{navigation.map((item) => <Link key={item.href} href={item.href} className={linkClassName(item.href)}>{item.label}</Link>)}<Link href="/" className="rounded-xl px-3 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-black">Voir la boutique</Link></nav><button onClick={logout} className="mt-auto rounded-xl border border-[#e5e5e5] px-3 py-2.5 text-left text-sm font-bold text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700">Déconnexion</button></aside><div className="min-w-0 flex-1"><header className="border-b border-[#e5e5e5] bg-white px-4 py-4 md:hidden"><div className="flex items-center justify-between gap-3"><Link href="/admin" className="text-xs font-bold tracking-[0.2em] text-[#c9a227]">KING OF CAPS</Link><button onClick={logout} className="text-xs font-bold text-zinc-600">Déconnexion</button></div><nav className="mt-4 grid grid-cols-4 gap-2">{navigation.map((item) => <Link key={item.href} href={item.href} className={`${linkClassName(item.href)} truncate px-2 text-center text-[11px]`}>{item.label}</Link>)}<Link href="/" className="truncate rounded-xl px-2 py-2.5 text-center text-[11px] font-bold text-zinc-700 transition hover:bg-zinc-100">Boutique</Link></nav></header>{children}</div></div>;
}
