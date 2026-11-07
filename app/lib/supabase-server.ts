import { createClient } from "@supabase/supabase-js";

type SupabaseServerKeyKind = "secret" | "legacy_service_role";

export type SupabaseFailureCategory =
  | "configuration"
  | "authentication"
  | "rls"
  | "stock"
  | "policy_or_privilege"
  | "schema_or_function"
  | "sql"
  | "network"
  | "unknown";

const supabaseFailureMessages: Record<SupabaseFailureCategory, string> = {
  configuration: "Supabase server configuration is missing or unsupported.",
  authentication: "Supabase authentication failed.",
  rls: "Supabase Row Level Security rejected the operation.",
  stock: "Stock was insufficient for the requested reservation.",
  policy_or_privilege: "Supabase denied the requested operation or database privilege.",
  schema_or_function: "Supabase could not resolve the requested table, column, relationship, or function.",
  sql: "Supabase rejected the database operation.",
  network: "Supabase could not be reached.",
  unknown: "Supabase request failed.",
};

function safeErrorCode(code: unknown) {
  return typeof code === "string" && /^[A-Z0-9_-]{1,32}$/i.test(code) ? code : null;
}

export function classifySupabaseFailure(
  httpStatus: number | null,
  code: string | null,
  safeClassificationText = "",
): SupabaseFailureCategory {
  if (code === "SUPABASE_CONFIGURATION_MISSING" || code === "SUPABASE_KEY_FORMAT_INVALID") return "configuration";
  if (code === "PGRST303" || code === "PGRST301" || httpStatus === 401) return "authentication";
  if (
    code === "42501"
    && /row.level security|row level security|violates row.level|row-level security policy/i.test(safeClassificationText)
  ) return "rls";
  if (code === "P0001" && /stock insuffisant|insufficient stock/i.test(safeClassificationText)) return "stock";
  if (code === "42501" || httpStatus === 403) return "policy_or_privilege";
  if (code && /^PGRST20[0-5]$/.test(code)) return "schema_or_function";
  if (code && /^[0-9A-Z]{5}$/i.test(code) && !code.startsWith("PGRST")) return "sql";
  if (httpStatus === null) return "network";
  return "unknown";
}

export class SupabaseServerError extends Error {
  readonly httpStatus: number | null;
  readonly errorCode: string | null;
  readonly category: SupabaseFailureCategory;

  constructor(httpStatus: number | null, errorCode: string | null, safeClassificationText = "") {
    const category = classifySupabaseFailure(httpStatus, errorCode, safeClassificationText);
    super(supabaseFailureMessages[category]);
    this.name = "SupabaseServerError";
    this.httpStatus = httpStatus;
    this.errorCode = safeErrorCode(errorCode);
    this.category = category;
  }
}

export function requireSupabaseServerKey(value: string | undefined) {
  const apiKey = value?.trim();
  if (!apiKey) throw new SupabaseServerError(null, "SUPABASE_CONFIGURATION_MISSING");
  try {
    serviceKeyKind(apiKey);
  } catch {
    throw new SupabaseServerError(null, "SUPABASE_KEY_FORMAT_INVALID");
  }
  return apiKey;
}

export async function supabaseServerErrorFromResponse(response: Response) {
  let errorCode: string | null = null;
  let classification = "";
  try {
    const payload = await response.json() as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
    errorCode = safeErrorCode(payload.code);
    classification = [payload.message, payload.details, payload.hint]
      .filter((value): value is string => typeof value === "string")
      .join(" ")
      .slice(0, 1_000);
  } catch {
    // Keep unstructured response bodies out of the error object and logs.
  }
  return new SupabaseServerError(response.status, errorCode, classification);
}

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
