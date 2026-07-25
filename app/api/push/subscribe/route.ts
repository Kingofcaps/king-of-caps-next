import { NextResponse } from "next/server";
import {
  isTrustedPushRequest,
  parsePushSubscription,
  readSmallJsonBody,
  savePushSubscription,
} from "@/app/lib/push-subscriptions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedPushRequest(request)) {
    return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  }

  const body = await readSmallJsonBody(request);
  const subscription = parsePushSubscription(
    body,
    request.headers.get("user-agent"),
  );
  if (!subscription) {
    return NextResponse.json(
      { error: "Abonnement push invalide." },
      { status: 400 },
    );
  }

  try {
    await savePushSubscription(subscription);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Impossible d’enregistrer les notifications." },
      { status: 500 },
    );
  }
}
