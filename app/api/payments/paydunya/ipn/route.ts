import { NextResponse } from "next/server";
import { processPayDunyaOrder } from "@/app/lib/paydunya-order-processing";
import { verifyPayDunyaHash } from "@/app/lib/paydunya";

export const runtime = "nodejs";

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function readPayDunyaData(formData: FormData) {
  const serializedData = stringValue(formData.get("data"));
  if (serializedData) {
    try {
      const data = JSON.parse(serializedData) as {
        hash?: unknown;
        invoice?: { token?: unknown };
      };
      return {
        hash: typeof data.hash === "string" ? data.hash.trim() : "",
        token: typeof data.invoice?.token === "string" ? data.invoice.token.trim() : "",
      };
    } catch {
      // PayDunya peut aussi encoder les nœuds avec la notation data[...].
    }
  }

  return {
    hash: stringValue(formData.get("data[hash]")),
    token: stringValue(formData.get("data[invoice][token]")) || stringValue(formData.get("data[token]")),
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const { hash, token } = readPayDunyaData(formData);
    if (!hash || !token) {
      return NextResponse.json({ error: "Notification PayDunya incomplète." }, { status: 400 });
    }
    if (!verifyPayDunyaHash(hash)) {
      return NextResponse.json({ error: "Notification PayDunya invalide." }, { status: 401 });
    }

    const result = await processPayDunyaOrder(token);
    return NextResponse.json({ received: true, status: result.status });
  } catch (error) {
    console.error("Erreur de traitement de l’IPN PayDunya :", error);
    return NextResponse.json({ error: "Notification PayDunya non traitée." }, { status: 500 });
  }
}
