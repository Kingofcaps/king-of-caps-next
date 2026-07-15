"use client";

import { useState } from "react";

type CampaignProduct = {
  id: string;
  name: string;
};

type CampaignChannel = {
  label: string;
  source: string;
  medium: string;
};

const channels: CampaignChannel[] = [
  { label: "WhatsApp", source: "whatsapp", medium: "social" },
  { label: "TikTok", source: "tiktok", medium: "social" },
  { label: "Instagram", source: "instagram", medium: "social" },
  { label: "Facebook", source: "facebook", medium: "social" },
  { label: "Google", source: "google", medium: "cpc" },
];

const inputClassName = "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-gray-400 focus:border-[#c9a227] focus:ring-1 focus:ring-[#c9a227]";

function normalizeUtmValue(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function CampaignLinkGenerator({ products }: { products: CampaignProduct[] }) {
  const [campaignName, setCampaignName] = useState("");
  const [destination, setDestination] = useState<"homepage" | "product">("homepage");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [customSource, setCustomSource] = useState("");
  const [customMedium, setCustomMedium] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [feedback, setFeedback] = useState("");

  const normalizedCampaign = normalizeUtmValue(campaignName);

  function generateLink(source: string, medium: string) {
    const normalizedSource = normalizeUtmValue(source);
    const normalizedMedium = normalizeUtmValue(medium);
    if (!normalizedCampaign || !normalizedSource || !normalizedMedium || (destination === "product" && !productId)) {
      setFeedback("Renseignez le nom de campagne et tous les champs nécessaires.");
      setGeneratedUrl("");
      return;
    }

    const pathname = destination === "product" ? `/product/${encodeURIComponent(productId)}` : "/";
    const url = new URL(pathname, "https://kingofcaps.bj");
    url.searchParams.set("utm_source", normalizedSource);
    url.searchParams.set("utm_medium", normalizedMedium);
    url.searchParams.set("utm_campaign", normalizedCampaign);
    setGeneratedUrl(url.toString());
    setFeedback("Lien généré.");
  }

  async function copyLink() {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setFeedback("Lien copié dans le presse-papiers.");
    } catch {
      setFeedback("Impossible de copier automatiquement. Sélectionnez le lien ci-dessous.");
    }
  }

  return (
    <section className="rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm sm:p-7">
      <div>
        <p className="text-sm font-bold tracking-[0.2em] text-[#c9a227]">CAMPAGNES</p>
        <h3 className="mt-2 text-2xl font-black">Liens de suivi des réseaux sociaux</h3>
        <p className="mt-2 text-sm text-zinc-500">Créez un lien King Of Caps avec des paramètres UTM pour mesurer chaque campagne dans Vercel Analytics.</p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="text-sm font-bold text-zinc-700">
          <span className="mb-2 block">Nom de la campagne</span>
          <input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="Ex. Nouvelle collection" className={inputClassName} />
        </label>

        <label className="text-sm font-bold text-zinc-700">
          <span className="mb-2 block">Destination</span>
          <select value={destination} onChange={(event) => setDestination(event.target.value as "homepage" | "product")} className={inputClassName}>
            <option value="homepage">Page d’accueil</option>
            <option value="product">Un produit spécifique</option>
          </select>
        </label>

        {destination === "product" && (
          <label className="text-sm font-bold text-zinc-700 lg:col-span-2">
            <span className="mb-2 block">Produit</span>
            <select value={productId} onChange={(event) => setProductId(event.target.value)} disabled={products.length === 0} className={inputClassName}>
              {products.length === 0 ? <option value="">Aucun produit disponible</option> : products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="mt-6">
        <p className="text-sm font-bold text-zinc-700">Générer pour un réseau</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {channels.map((channel) => (
            <button key={channel.source} type="button" onClick={() => generateLink(channel.source, channel.medium)} className="rounded-xl border border-[#e5e5e5] bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:border-[#c9a227]">
              {channel.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-4">
        <p className="text-sm font-black text-zinc-800">Autre campagne</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <label className="text-sm font-bold text-zinc-700">
            <span className="mb-2 block">Source personnalisée</span>
            <input value={customSource} onChange={(event) => setCustomSource(event.target.value)} placeholder="Ex. influenceur" className={inputClassName} />
          </label>
          <label className="text-sm font-bold text-zinc-700">
            <span className="mb-2 block">Support personnalisé</span>
            <input value={customMedium} onChange={(event) => setCustomMedium(event.target.value)} placeholder="Ex. partenariat" className={inputClassName} />
          </label>
          <button type="button" onClick={() => generateLink(customSource, customMedium)} className="rounded-xl bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-[#c9a227]">Autre</button>
        </div>
      </div>

      <div className="mt-6">
        <label className="text-sm font-bold text-zinc-700">
          <span className="mb-2 block">URL générée</span>
          <input value={generatedUrl} readOnly placeholder="Le lien apparaîtra ici" onFocus={(event) => event.currentTarget.select()} className={`${inputClassName} font-mono text-xs`} />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" disabled={!generatedUrl} onClick={copyLink} className="rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#c9a227] disabled:cursor-not-allowed disabled:opacity-40">Copier le lien</button>
          <a href={generatedUrl || undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!generatedUrl} className={`rounded-xl border border-[#e5e5e5] bg-white px-4 py-2.5 text-sm font-bold text-black transition ${generatedUrl ? "hover:border-[#c9a227]" : "pointer-events-none opacity-40"}`}>Ouvrir le lien</a>
          {feedback && <p role="status" className="text-sm font-semibold text-zinc-600">{feedback}</p>}
        </div>
      </div>
    </section>
  );
}
