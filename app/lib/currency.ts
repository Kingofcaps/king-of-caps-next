export const SUPPORTED_CURRENCIES = ["XOF", "EUR", "USD"] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export type ProductPrices = {
  priceXof: number;
  priceEur: number;
  priceUsd: number;
};

const CFA_FRANCS_PER_EURO = 655.957;
const CFA_FRANCS_PER_US_DOLLAR = 555.5555555556;

export function calculateProductCurrencyPrices(priceXof: number): ProductPrices {
  const normalizedXof = Number.isFinite(priceXof) ? Math.max(0, Math.round(priceXof)) : 0;
  return {
    priceXof: normalizedXof,
    priceEur: Math.round(normalizedXof / CFA_FRANCS_PER_EURO) * 100,
    priceUsd: Math.round(normalizedXof / CFA_FRANCS_PER_US_DOLLAR) * 100,
  };
}

export const CURRENCY_COOKIE_NAME = "koc_currency";

const UEMOA_COUNTRIES = new Set(["BJ", "BF", "CI", "GW", "ML", "NE", "SN", "TG"]);
const EURO_COUNTRIES = new Set([
  "AD", "AT", "BE", "BG", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT",
  "LT", "LU", "LV", "MC", "ME", "MT", "NL", "PT", "SI", "SK", "SM", "VA", "XK",
]);
const USD_COUNTRIES = new Set(["US", "CA"]);

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && SUPPORTED_CURRENCIES.includes(value.toUpperCase() as Currency);
}

export function normalizeCurrency(value: unknown, fallback: Currency = "XOF"): Currency {
  return isCurrency(value) ? value.toUpperCase() as Currency : fallback;
}

export function currencyForCountry(country: string | null | undefined): Currency {
  const code = country?.trim().toUpperCase() ?? "";
  if (UEMOA_COUNTRIES.has(code)) return "XOF";
  if (EURO_COUNTRIES.has(code)) return "EUR";
  if (USD_COUNTRIES.has(code)) return "USD";
  return "XOF";
}

export function getProductPrice(product: ProductPrices, currency: Currency): number {
  if (currency === "EUR") return product.priceEur;
  if (currency === "USD") return product.priceUsd;
  return product.priceXof;
}

export function formatMoney(amount: number, currency: Currency): string {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  if (currency === "XOF") {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(safeAmount)} F`;
  }

  const units = safeAmount / 100;
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: Number.isInteger(units) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(units);
  return currency === "EUR" ? `${formatted} €` : `${formatted} $`;
}

export function currencyLabel(currency: Currency) {
  if (currency === "EUR") return "euro";
  if (currency === "USD") return "dollar américain";
  return "franc CFA";
}
