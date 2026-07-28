"use client";

import { useEffect, useState } from "react";
import type { PwaInstallationStats, PwaPlatform } from "@/app/lib/pwa-installations";

const platformLabels: Record<PwaPlatform, string> = {
  ios: "iPhone / iPad",
  android: "Android",
  desktop: "Ordinateur",
};

export default function PwaInstallationsPanel() {
  const [stats, setStats] = useState<PwaInstallationStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadStats() {
      try {
        const response = await fetch("/api/admin/pwa-installations", { cache: "no-store" });
        const payload = await response.json() as PwaInstallationStats & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Impossible de charger les installations PWA.");
        if (active) setStats(payload);
      } catch (caughtError) {
        if (active) setError(caughtError instanceof Error ? caughtError.message : "Impossible de charger les installations PWA.");
      }
    }
    void loadStats();
    return () => { active = false; };
  }, []);

  return (
    <section className="rounded-3xl border border-[#e5e5e5] bg-white p-5 shadow-sm sm:p-7">
      <div>
        <p className="text-sm font-bold tracking-[0.2em] text-[#c9a227]">INSTALLATIONS PWA</p>
        <h3 className="mt-2 text-2xl font-black">Applications installées</h3>
        <p className="mt-2 text-sm text-zinc-500">Comptage anonyme à la première ouverture en mode standalone, indépendant des notifications.</p>
      </div>

      {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      {!stats && !error && <div className="mt-6 h-28 animate-pulse rounded-2xl bg-zinc-100" />}
      {stats && <>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <PwaStat label="Total unique" value={stats.total} />
          <PwaStat label="Aujourd’hui" value={stats.today} />
          <PwaStat label="Cette semaine" value={stats.thisWeek} />
          <PwaStat label="Ce mois" value={stats.thisMonth} />
          <PwaStat label="iPhone / iPad" value={stats.byPlatform.ios} />
          <PwaStat label="Android" value={stats.byPlatform.android} />
          <PwaStat label="Ordinateur" value={stats.byPlatform.desktop} />
        </div>
        <div className="mt-7 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-[#e5e5e5] text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-3 py-3">Plateforme</th><th className="px-3 py-3">Installation</th><th className="px-3 py-3">Dernière ouverture</th><th className="px-3 py-3">Identifiant anonyme</th></tr></thead>
            <tbody>{stats.recent.map((installation) => <tr key={installation.id} className="border-b border-[#f0f0f0] last:border-0"><td className="px-3 py-3 font-bold">{platformLabels[installation.platform]}</td><td className="px-3 py-3 text-zinc-600">{new Date(installation.installed_at).toLocaleString("fr-FR")}</td><td className="px-3 py-3 text-zinc-600">{new Date(installation.last_opened_at).toLocaleString("fr-FR")}</td><td className="px-3 py-3 font-mono text-xs text-zinc-500">{installation.installation_id.slice(0, 18)}…</td></tr>)}{stats.recent.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-zinc-500">Aucune installation enregistrée.</td></tr>}</tbody>
          </table>
        </div>
      </>}
    </section>
  );
}

function PwaStat({ label, value }: { label: string; value: number }) {
  return <article className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-4"><p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{label}</p><p className="mt-2 text-xl font-black text-zinc-900">{value}</p></article>;
}
