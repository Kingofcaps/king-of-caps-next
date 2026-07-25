import { NextResponse } from "next/server";
import {
  deletePushSubscription,
  isTrustedPushRequest,
  parsePushEndpoint,
  readSmallJsonBody,
} from "@/app/lib/push-subscriptions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedPushRequest(request)) {
    return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  }

  const endpoint = parsePushEndpoint(await readSmallJsonBody(request));
  if (!endpoint) {
    return NextResponse.json(
      { error: "Endpoint push invalide." },
      { status: 400 },
    );
  }

  try {
    await deletePushSubscription(endpoint);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Impossible de désactiver les notifications." },
      { status: 500 },
    );
  }
}
