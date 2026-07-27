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
    console.warn("[push][subscribe] Corps d’abonnement invalide.", {
      bodyPresent: Boolean(body),
    });
    return NextResponse.json(
      { error: "Abonnement push invalide." },
      { status: 400 },
    );
  }

  try {
    console.info("[push][subscribe] Abonnement validé, upsert Supabase démarré.", {
      endpointPresent: Boolean(subscription.endpoint),
      p256dhPresent: Boolean(subscription.p256dh),
      authPresent: Boolean(subscription.auth),
      userAgentPresent: Boolean(subscription.user_agent),
    });
    await savePushSubscription(subscription);
    console.info("[push][subscribe] Upsert Supabase terminé.");
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[push][subscribe] Échec d’enregistrement Supabase.", {
      message,
    });
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
