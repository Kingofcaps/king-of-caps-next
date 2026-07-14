import { NextResponse } from "next/server";
import { ADMIN_COOKIE, getAdminToken, isCorrectPassword } from "@/app/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { password }: { password?: unknown } = await request.json();

  if (!isCorrectPassword(password)) {
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, getAdminToken(), {
    httpOnly: true,
    maxAge: 60 * 60 * 12,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
