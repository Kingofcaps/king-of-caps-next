import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ alignItems: "center", background: "#09090b", color: "#d4af37", display: "flex", fontSize: 112, fontWeight: 900, height: "100%", justifyContent: "center", width: "100%" }}>
      K
    </div>,
    size,
  );
}
