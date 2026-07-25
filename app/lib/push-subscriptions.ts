import "server-only";

const MAX_ENDPOINT_LENGTH = 4096;
const MAX_KEY_LENGTH = 512;
const MAX_USER_AGENT_LENGTH = 512;
const BASE64_URL_PATTERN = /^[A-Za-z0-9_-]+={0,2}$/;

export type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
};

function text(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maximumLength
    ? normalized
    : null;
}

function validEndpoint(value: unknown) {
  const endpoint = text(value, MAX_ENDPOINT_LENGTH);
  if (!endpoint) return null;

  try {
    return new URL(endpoint).protocol === "https:" ? endpoint : null;
  } catch {
    return null;
  }
}

function validSubscriptionKey(value: unknown) {
  const key = text(value, MAX_KEY_LENGTH);
  return key && BASE64_URL_PATTERN.test(key) ? key : null;
}

export function parsePushSubscription(
  value: unknown,
  userAgent: string | null,
): PushSubscriptionRecord | null {
  if (!value || typeof value !== "object") return null;
  const subscription = value as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
  const endpoint = validEndpoint(subscription.endpoint);
  const p256dh = validSubscriptionKey(subscription.keys?.p256dh);
  const auth = validSubscriptionKey(subscription.keys?.auth);
  if (!endpoint || !p256dh || !auth) return null;

  return {
    endpoint,
    p256dh,
    auth,
    user_agent: text(userAgent, MAX_USER_AGENT_LENGTH),
  };
}

export function parsePushEndpoint(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return validEndpoint((value as { endpoint?: unknown }).endpoint);
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase n’est pas configuré côté serveur.");
  }
  return { url: url.replace(/\/+$/, ""), serviceRoleKey };
}

async function pushSubscriptionsRequest(path: string, init: RequestInit) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Supabase a refusé la requête push (${response.status}).`);
  }
}

export async function savePushSubscription(
  subscription: PushSubscriptionRecord,
) {
  await pushSubscriptionsRequest(
    "push_subscriptions?on_conflict=endpoint",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        ...subscription,
        updated_at: new Date().toISOString(),
      }),
    },
  );
}

export async function deletePushSubscription(endpoint: string) {
  await pushSubscriptionsRequest(
    `push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
    {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    },
  );
}

export function isTrustedPushRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const allowedOrigins = new Set([new URL(request.url).origin]);
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredSiteUrl) {
    try {
      allowedOrigins.add(new URL(configuredSiteUrl).origin);
    } catch {
      return false;
    }
  }

  return allowedOrigins.has(origin);
}

export async function readSmallJsonBody(request: Request) {
  const body = await request.text();
  if (!body || body.length > 16_384) return null;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}
