import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confirmation de commande",
  robots: { index: false, follow: false, noarchive: true },
};

export default function OrderConfirmationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
