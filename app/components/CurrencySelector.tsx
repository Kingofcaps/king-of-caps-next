"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_CURRENCIES, type Currency } from "@/app/lib/currency";
import { useCurrency } from "./CurrencyProvider";

export default function CurrencySelector({ className = "" }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function changeCurrency(nextCurrency: Currency) {
    if (nextCurrency === currency || saving) return;
    const previous = currency;
    setCurrency(nextCurrency);
    setSaving(true);
    try {
      const response = await fetch("/api/currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: nextCurrency }),
      });
      if (!response.ok) throw new Error("Impossible d’enregistrer la devise.");
      router.refresh();
    } catch {
      setCurrency(previous);
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className={`inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-bold text-zinc-800 shadow-sm ${className}`}>
      <span className="sr-only">Devise</span>
      <select
        value={currency}
        disabled={saving}
        onChange={(event) => void changeCurrency(event.target.value as Currency)}
        aria-label="Choisir la devise"
        className="cursor-pointer bg-transparent text-xs font-black outline-none disabled:cursor-wait disabled:opacity-60"
      >
        {SUPPORTED_CURRENCIES.map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
    </label>
  );
}
