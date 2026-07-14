import { notFound } from "next/navigation";
import { getProduct } from "@/app/lib/products";
import CheckoutForm from "./CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: PageProps<"/checkout/[productId]">) {
  const { productId } = await params;
  const product = await getProduct(productId);
  if (!product) notFound();

  return <CheckoutForm product={product} />;
}
