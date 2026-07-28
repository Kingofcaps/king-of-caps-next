import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdminToken } from "@/app/lib/admin-auth";
import { getPwaInstallationStats } from "@/app/lib/pwa-installations";

export const runtime = "nodejs";

export async function GET() {
  if (!isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    return NextResponse.json(await getPwaInstallationStats());
  } catch (error) {
    console.error("[pwa][admin] Chargement des statistiques impossible.", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de charger les installations PWA." },
      { status: 500 },
    );
  }
}
