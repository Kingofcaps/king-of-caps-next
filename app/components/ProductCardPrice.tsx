"use client";

import { formatMoney, getProductPrice, type ProductPrices } from "@/app/lib/currency";
import { useCurrency } from "./CurrencyProvider";

export default function ProductCardPrice({
  prices,
  inStock,
}: {
  prices: ProductPrices;
  inStock: boolean;
}) {
  const { currency } = useCurrency();
  const price = getProductPrice(prices, currency);

  return (
    <div className="mt-1 flex min-h-14 flex-wrap items-start justify-between gap-x-1.5 gap-y-1 sm:min-h-[3.75rem] sm:gap-x-3">
      <div className="min-w-0">
        <p className="whitespace-nowrap text-[11px] font-black leading-tight text-[#d4af37] sm:text-xl">
          {formatMoney(price, currency)}
        </p>
      </div>
      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold sm:px-2.5 sm:py-1 sm:text-xs ${inStock ? "bg-emerald-900 text-emerald-100" : "bg-red-50 text-red-600"}`}>
        {inStock ? "En stock" : "Rupture de stock"}
      </span>
    </div>
  );
}
