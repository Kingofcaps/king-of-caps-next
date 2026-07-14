import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "King of Caps | Le royaume de la casquette au Bénin",
  description: "Découvrez la collection King of Caps et commandez votre casquette au Bénin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
