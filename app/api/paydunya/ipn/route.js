import { createHash, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

function asNonEmptyString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseDataValue(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

async function readNotification(request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json();
    const data = parseDataValue(body?.data) ?? parseDataValue(body);

    return {
      data,
      hash: asNonEmptyString(data?.hash),
    };
  }

  const formData = await request.formData();
  const serializedData = formData.get("data");
  const data = parseDataValue(serializedData);

  return {
    data,
    hash:
      asNonEmptyString(data?.hash) ??
      asNonEmptyString(formData.get("data[hash]")) ??
      asNonEmptyString(formData.get("hash")),
  };
}

function isValidHash(receivedHash, masterKey) {
  if (!/^[a-f\d]{128}$/i.test(receivedHash)) {
    return false;
  }

  const expectedHash = createHash("sha512").update(masterKey, "utf8").digest();
  const receivedHashBuffer = Buffer.from(receivedHash, "hex");

  return (
    receivedHashBuffer.length === expectedHash.length &&
    timingSafeEqual(receivedHashBuffer, expectedHash)
  );
}

export async function GET() {
  return Response.json({ active: true, endpoint: "PayDunya IPN" });
}

export async function POST(request) {
  const masterKey = process.env.PAYDUNYA_MASTER_KEY;

  if (!masterKey) {
    return Response.json(
      { error: "Configuration PayDunya indisponible." },
      { status: 500 },
    );
  }

  let notification;

  try {
    notification = await readNotification(request);
  } catch {
    return Response.json(
      { error: "Notification PayDunya illisible." },
      { status: 400 },
    );
  }

  if (!notification.hash || !isValidHash(notification.hash, masterKey)) {
    return Response.json(
      { error: "Hash de sécurité PayDunya invalide." },
      { status: 401 },
    );
  }

  return Response.json({ received: true }, { status: 200 });
}
