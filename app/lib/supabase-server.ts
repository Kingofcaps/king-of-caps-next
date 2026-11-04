import { createClient } from "@supabase/supabase-js";

type SupabaseServerKeyKind = "secret" | "legacy_service_role";

function serviceKeyKind(apiKey: string): SupabaseServerKeyKind {
  if (apiKey.startsWith("sb_secret_")) return "secret";

  const segments = apiKey.split(".");
  if (segments.length === 3 && segments.every(Boolean)) {
    try {
      const payload = JSON.parse(Buffer.from(segments[1], "base64url").toString("utf8")) as {
        role?: unknown;
      };
      if (payload.role === "service_role") return "legacy_service_role";
    } catch {
      // Reject malformed legacy tokens without exposing their contents.
    }
  }

  throw new Error("La clé Supabase serveur doit être une clé secrète ou un JWT service_role legacy.");
}

export function supabaseServerAuthHeaders(apiKey: string) {
  const kind = serviceKeyKind(apiKey);
  return {
    apikey: apiKey,
    ...(kind === "legacy_service_role" ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}

export function createSupabaseServerClient(
  url: string,
  apiKey: string,
  fetcher: typeof fetch = fetch,
) {
  const kind = serviceKeyKind(apiKey);
  const safeFetch: typeof fetch = (input, init) => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
    headers.set("apikey", apiKey);
    if (kind === "secret") headers.delete("Authorization");
    return fetcher(input, { ...init, headers });
  };

  return createClient(url, apiKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: safeFetch },
  });
}
