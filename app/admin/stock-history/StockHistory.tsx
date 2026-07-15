"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Product } from "@/app/lib/products";
import type { StockMovement, StockMovementType } from "@/app/lib/stock-movements";

type DirectionFilter = "all" | "additions" | "removals";

const movementLabels: Record<StockMovementType, string> = {
  creation: "Création du produit",
  increase: "Ajout rapide (+1)",
  decrease: "Retrait rapide (−1)",
  restock: "Réapprovisionnement",
  product_edit: "Modification du produit",
  order_deduction: "Déduction commande",
  order_cancellation: "Restauration après annulation",
};

function dateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function StockHistory({
  initialMovements,
  products,
  loadError = "",
}: {
  initialMovements: StockMovement[];
  products: Product[];
  loadError?: string;
}) {
  const [productId, setProductId] = useState("all");
  const [movementType, setMovementType] = useState<"all" | StockMovementType>("all");
  const [date, setDate] = useState("");
  const [direction, setDirection] = useState<DirectionFilter>("all");
  const productImages = useMemo(
    () => new Map(products.map((product) => [product.id, product.image])),
    [products],
  );
  const productOptions = useMemo(() => {
    const options = new Map<string, string>();
    initialMovements.forEach((movement) => options.set(movement.product_id, movement.product_name));
    return [...options.entries()].sort((first, second) => first[1].localeCompare(second[1], "fr"));
  }, [initialMovements]);
  const filteredMovements = useMemo(() => initialMovements.filter((movement) => {
    const matchesProduct = productId === "all" || movement.product_id === productId;
    const matchesType = movementType === "all" || movement.movement_type === movementType;
    const matchesDate = !date || dateKey(movement.created_at) === date;
    const matchesDirection = direction === "all"
      || (direction === "additions" && movement.quantity_change > 0)
      || (direction === "removals" && movement.quantity_change < 0);
    return matchesProduct && matchesType && matchesDate && matchesDirection;
  }), [date, direction, initialMovements, movementType, productId]);

  function resetFilters() {
    setProductId("all");
    setMovementType("all");
    setDate("");
    setDirection("all");
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[#e5e5e5] bg-white p-5 shadow-sm sm:p-7">
        <p className="text-sm font-bold tracking-[0.2em] text-[#c9a227]">INVENTAIRE</p>
        <h2 className="mt-2 text-3xl font-black">Historique du stock</h2>
        <p className="mt-2 text-sm text-zinc-500">Consultez chaque ajout, retrait et correction de stock.</p>

        {loadError && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{loadError}</p>}

        <div className="mt-6 rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] xl:items-end">
            <label className="text-sm font-bold text-zinc-700">
              <span className="mb-2 block">Produit</span>
              <select value={productId} onChange={(event) => setProductId(event.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-[#c9a227] focus:ring-1 focus:ring-[#c9a227]">
                <option value="all">Tous les produits</option>
                {productOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold text-zinc-700">
              <span className="mb-2 block">Type de mouvement</span>
              <select value={movementType} onChange={(event) => setMovementType(event.target.value as "all" | StockMovementType)} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-[#c9a227] focus:ring-1 focus:ring-[#c9a227]">
                <option value="all">Tous les mouvements</option>
                {Object.entries(movementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold text-zinc-700">
              <span className="mb-2 block">Date</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-[#c9a227] focus:ring-1 focus:ring-[#c9a227]" />
            </label>
            <button type="button" onClick={resetFilters} className="rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 text-sm font-bold text-zinc-700 transition hover:border-[#c9a227] hover:text-black">Réinitialiser</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {([ ["all", "Tous"], ["additions", "Ajouts uniquement"], ["removals", "Retraits uniquement"] ] as Array<[DirectionFilter, string]>).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setDirection(value)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${direction === value ? "border-[#c9a227] bg-[#c9a227]/15 text-[#a8861e]" : "border-[#e5e5e5] bg-white text-zinc-600 hover:border-[#c9a227]"}`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-zinc-500">{filteredMovements.length} mouvement{filteredMovements.length > 1 ? "s" : ""}</p>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-[#e5e5e5]">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="border-b border-[#e5e5e5] bg-[#fafafa] text-xs uppercase tracking-wide text-zinc-500">
              <tr><th className="px-4 py-3">Produit</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Variation</th><th className="px-4 py-3">Avant</th><th className="px-4 py-3">Après</th><th className="px-4 py-3">Date et heure</th></tr>
            </thead>
            <tbody>
              {filteredMovements.map((movement) => (
                <tr key={movement.id} className="border-b border-[#f0f0f0] last:border-0">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-100"><Image src={productImages.get(movement.product_id) ?? "/images/logo.png"} alt="" fill sizes="44px" className="object-cover" /></div><div><p className="font-bold text-zinc-800">{movement.product_name}</p>{movement.note && <p className="mt-0.5 text-xs text-zinc-500">{movement.note}</p>}</div></div></td>
                  <td className="px-4 py-3 font-semibold text-zinc-700">{movementLabels[movement.movement_type]}</td>
                  <td className={`px-4 py-3 font-black ${movement.quantity_change > 0 ? "text-green-700" : movement.quantity_change < 0 ? "text-red-700" : "text-zinc-600"}`}>{movement.quantity_change > 0 ? "+" : ""}{movement.quantity_change}</td>
                  <td className="px-4 py-3 font-semibold text-zinc-600">{movement.previous_quantity}</td>
                  <td className="px-4 py-3 font-black text-zinc-900">{movement.new_quantity}</td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(movement.created_at).toLocaleString("fr-FR")}</td>
                </tr>
              ))}
              {filteredMovements.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500">Aucun mouvement ne correspond à ces filtres.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
