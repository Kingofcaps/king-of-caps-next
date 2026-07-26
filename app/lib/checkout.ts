import type { PaymentMethod } from "./orders";
import { formatMoney, type Currency } from "./currency.ts";

export const PAYMENT_OPTIONS: Array<{
  value: PaymentMethod;
  title: string;
  description: string;
  online: boolean;
}> = [
  { value: "mobile_money", title: "Mobile Money", description: "Paiement sécurisé via PayDunya", online: true },
  { value: "card", title: "Carte bancaire", description: "Visa et Mastercard via PayDunya", online: true },
  { value: "cash_on_delivery", title: "Paiement à la livraison", description: "Payez lorsque votre commande vous est remise", online: false },
];

export function paymentMethodLabel(method: PaymentMethod) {
  return PAYMENT_OPTIONS.find((option) => option.value === method)?.title ?? "Paiement";
}

export function checkoutButtonLabel(method: PaymentMethod, total: number, currency: Currency) {
  return method === "cash_on_delivery"
    ? "Confirmer la commande"
    : `Payer ${formatMoney(total, currency)}`;
}
