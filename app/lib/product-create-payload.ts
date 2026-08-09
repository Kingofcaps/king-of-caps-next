import { calculateProductCurrencyPrices } from "./currency.ts";

export type ProductCreateDetails = {
  id: string;
  name: string;
  price: string;
  priceXof: number;
  description: string;
  brand: string;
  category: string;
  color: string;
  stockQuantity: number;
  featured: boolean;
  newArrival: boolean;
  available: boolean;
};

export type ProductCreatePayload = ProductCreateDetails & {
  priceEur: number;
  priceUsd: number;
  image: string;
  images: string[];
};

function assertRemoteImageUrl(value: string) {
  if (/^data:/i.test(value) || /^blob:/i.test(value)) {
    throw new Error("La requête produit ne peut contenir que des URL d’images téléversées.");
  }

  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("L’URL de l’image téléversée est invalide.");
  }
}

export function buildProductCreatePayload(
  details: ProductCreateDetails,
  uploadedImageUrls: string[],
): ProductCreatePayload {
  const images = Array.from(new Set(uploadedImageUrls.map((url) => url.trim()).filter(Boolean)));
  if (images.length === 0) throw new Error("Veuillez téléverser une image principale.");
  if (images.length > 6) throw new Error("Vous pouvez ajouter jusqu’à 5 images supplémentaires.");
  images.forEach(assertRemoteImageUrl);
  const prices = calculateProductCurrencyPrices(details.priceXof);

  return {
    ...details,
    ...prices,
    image: images[0],
    images,
  };
}
