const CFA_FRANCS_PER_EURO = 655.957;
const fcfaFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function parsePrice(price: number | string) {
  if (typeof price === "number") {
    return Number.isFinite(price) && price > 0 ? Math.round(price) : 0;
  }

  const dualPriceFcfa = price.match(/\(([\d\s\u00a0\u202f]+)\s*(?:F|CFA|FCFA)\)/i)?.[1];
  const amount = Number((dualPriceFcfa ?? price).replace(/[^\d]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function formatFcfaPrice(priceFcfa: number | string) {
  return `${fcfaFormatter.format(parsePrice(priceFcfa))} F`;
}

export function formatDualPrice(priceFcfa: number | string) {
  const amountFcfa = parsePrice(priceFcfa);
  const priceEuro = Math.round(amountFcfa / CFA_FRANCS_PER_EURO);
  return `${priceEuro} € (${fcfaFormatter.format(amountFcfa)} F)`;
}
