export const KING_OF_CAPS_WHATSAPP_URL = "https://wa.me/22950687515";
export const KING_OF_CAPS_CANONICAL_URL = "https://kingofcaps.bj";

type WhatsAppProduct = {
  id: string;
  name: string;
};

export function productCanonicalUrl(productId: string) {
  return `${KING_OF_CAPS_CANONICAL_URL}/product/${encodeURIComponent(productId)}`;
}

export function productWhatsAppMessage(product: WhatsAppProduct, formattedPrice: string) {
  return [
    "Bonjour KING OF CAPS, je souhaite commander :",
    "",
    `Produit : ${product.name}`,
    `Prix : ${formattedPrice}`,
    `Lien du produit : ${productCanonicalUrl(product.id)}`,
  ].join("\n");
}

export function productWhatsAppOrderUrl(product: WhatsAppProduct, formattedPrice: string) {
  return `${KING_OF_CAPS_WHATSAPP_URL}?text=${encodeURIComponent(productWhatsAppMessage(product, formattedPrice))}`;
}
