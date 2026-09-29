import { calculateProductCurrencyPrices, getProductPrice, type Currency } from "./currency.ts";

export const SERVICE_FEE_XOF = 100;

const serviceFeePrices = calculateProductCurrencyPrices(SERVICE_FEE_XOF);

export function serviceFeeAmount(currency: Currency) {
  return getProductPrice(serviceFeePrices, currency);
}

export function calculateCheckoutTotals(subtotal: number, currency: Currency) {
  const serviceFee = serviceFeeAmount(currency);
  return {
    subtotal,
    serviceFee,
    total: subtotal + serviceFee,
  };
}

export function payDunyaTotalWithServiceFee(subtotalXof: number) {
  return subtotalXof + SERVICE_FEE_XOF;
}