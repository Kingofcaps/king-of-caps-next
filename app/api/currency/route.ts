import { NextResponse } from "next/server";
import { CURRENCY_COOKIE_NAME, isCurrency } from "@/app/lib/currency";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { currency?: unknown } | null;
  if (!isCurrency(body?.currency)) {
    return NextResponse.json({ error: "Devise invalide." }, { status: 400 });
  }

  const response = NextResponse.json({ currency: body.currency.toUpperCase() });
  response.cookies.set(CURRENCY_COOKIE_NAME, body.currency.toUpperCase(), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
  return response;
}
