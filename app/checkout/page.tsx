import { isPayDunyaConfigured } from "@/app/lib/paydunya";
import CheckoutForm from "./[productId]/CheckoutForm";

export const dynamic = "force-dynamic";

export default function CartCheckoutPage() {
  return <CheckoutForm source="cart" onlinePaymentsEnabled={isPayDunyaConfigured()} />;
}
