import { NextResponse } from "next/server";
import { savePwaInstallation, type PwaPlatform } from "@/app/lib/pwa-installations";

export const runtime = "nodejs";

const INSTALLATION_ID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/;
const PLATFORMS = new Set<PwaPlatform>(["ios", "android", "desktop"]);

function isTrustedRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowedOrigins = new Set([new URL(request.url).origin]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    try {
      allowedOrigins.add(new URL(siteUrl).origin);
    } catch {
      return false;
    }
  }
  return allowedOrigins.has(origin);
}

export async function POST(request: Request) {
  if (!isTrustedRequest(request)) {
    return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  }

  let body: { installationId?: unknown; platform?: unknown };
  try {
    const text = await request.text();
    if (!text || text.length > 4096) throw new Error("Corps invalide");
    body = JSON.parse(text) as typeof body;
  } catch {
    return NextResponse.json({ error: "Données d’installation invalides." }, { status: 400 });
  }

  const installationId = typeof body.installationId === "string" ? body.installationId.trim() : "";
  const platform = typeof body.platform === "string" ? body.platform : "";
  if (!INSTALLATION_ID_PATTERN.test(installationId) || !PLATFORMS.has(platform as PwaPlatform)) {
    return NextResponse.json({ error: "Données d’installation invalides." }, { status: 400 });
  }

  try {
    await savePwaInstallation({
      installationId,
      platform: platform as PwaPlatform,
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[pwa][installation] Échec de l’upsert Supabase.", error);
    return NextResponse.json({ error: "Impossible d’enregistrer l’installation PWA." }, { status: 500 });
  }
}
