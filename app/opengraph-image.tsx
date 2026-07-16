import { ImageResponse } from "next/og";

export const alt = "KING OF CAPS — Le royaume de la casquette au Bénin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ alignItems: "center", background: "#09090b", color: "white", display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", padding: "72px", textAlign: "center", width: "100%" }}>
      <div style={{ color: "#d4af37", display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 8 }}>COTONOU · BÉNIN</div>
      <div style={{ display: "flex", fontSize: 88, fontWeight: 900, letterSpacing: -3, marginTop: 30 }}>KING OF CAPS</div>
      <div style={{ background: "#d4af37", display: "flex", height: 3, marginTop: 34, width: 96 }} />
      <div style={{ color: "#d4d4d8", display: "flex", fontSize: 32, marginTop: 34 }}>Le royaume de la casquette au Bénin</div>
    </div>,
    size,
  );
}
