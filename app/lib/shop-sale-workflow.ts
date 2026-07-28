export const SHOP_PAYMENT_METHODS = [
  "Espèces",
  "MTN MoMo",
  "Celtiis Cash",
  "Carte bancaire",
  "Virement",
  "Autre",
] as const;

export type ShopPaymentMethod = (typeof SHOP_PAYMENT_METHODS)[number];

export type ShopSaleDraft = {
  productId: string;
  productName: string;
  availableStock: number;
  quantity: number;
  unitPrice: number;
  paymentMethod: ShopPaymentMethod;
  requestId: string;
};

export type ShopSaleProduct = {
  id: string;
  name: string;
  stockQuantity: number;
  priceXof: number;
};

export function openShopSale(product: ShopSaleProduct, requestId: string): ShopSaleDraft {
  return {
    productId: product.id,
    productName: product.name,
    availableStock: product.stockQuantity,
    quantity: 1,
    unitPrice: product.priceXof,
    paymentMethod: "Espèces",
    requestId,
  };
}

export function cancelShopSaleDraft() {
  return null;
}

export function shopSaleTotal(draft: Pick<ShopSaleDraft, "quantity" | "unitPrice">) {
  return Math.max(0, Math.floor(draft.quantity)) * Math.max(0, Math.round(draft.unitPrice));
}

export function validateShopSale(draft: ShopSaleDraft) {
  if (!Number.isInteger(draft.quantity) || draft.quantity < 1) {
    return "La quantité doit être un nombre entier supérieur à zéro.";
  }
  if (draft.quantity > draft.availableStock) {
    return `Stock insuffisant : ${draft.availableStock} unité${draft.availableStock > 1 ? "s" : ""} disponible${draft.availableStock > 1 ? "s" : ""}.`;
  }
  if (!Number.isInteger(draft.unitPrice) || draft.unitPrice < 1) {
    return "Le prix unitaire doit être un nombre entier supérieur à zéro.";
  }
  if (!SHOP_PAYMENT_METHODS.includes(draft.paymentMethod)) {
    return "Mode de paiement invalide.";
  }
  if (!draft.requestId) return "Identifiant de requête manquant.";
  return null;
}

export async function submitShopSale<T>(
  draft: ShopSaleDraft,
  request: (input: ShopSaleDraft) => Promise<T>,
) {
  const validationError = validateShopSale(draft);
  if (validationError) throw new Error(validationError);
  return request(draft);
}
