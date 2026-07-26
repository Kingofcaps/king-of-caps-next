import { notFound } from "next/navigation";
import { getProduct } from "@/app/lib/products";
import { isPayDunyaConfigured } from "@/app/lib/paydunya";
import CheckoutForm from "./CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params, searchParams }: PageProps<"/checkout/[productId]">) {
  const { productId } = await params;
  const query = await searchParams;
  const product = await getProduct(productId);
  if (!product) notFound();
  const requestedQuantity = Number(typeof query.quantity === "string" ? query.quantity : 1);
  const quantity = Math.min(Math.max(1, Number.isInteger(requestedQuantity) ? requestedQuantity : 1), product.stockQuantity);

  return <CheckoutForm source="direct" initialItems={[{ productId: product.id, name: product.name, image: product.image, priceXof: product.priceXof, priceEur: product.priceEur, priceUsd: product.priceUsd, quantity, stockQuantity: product.stockQuantity }]} onlinePaymentsEnabled={isPayDunyaConfigured()} />;
}
