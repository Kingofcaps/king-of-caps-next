"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { Currency } from "@/app/lib/currency";

type CurrencyContextValue = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ initialCurrency, children }: { initialCurrency: Currency; children: React.ReactNode }) {
  const [currency, setCurrency] = useState(initialCurrency);
  const value = useMemo(() => ({ currency, setCurrency }), [currency]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency doit être utilisé dans CurrencyProvider.");
  return context;
}
