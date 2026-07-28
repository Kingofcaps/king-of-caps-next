import "server-only";

export type PwaPlatform = "ios" | "android" | "desktop";

export type PwaInstallation = {
  id: string;
  installation_id: string;
  platform: PwaPlatform;
  user_agent: string | null;
  installed_at: string;
  last_opened_at: string;
};

export type PwaInstallationStats = {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byPlatform: Record<PwaPlatform, number>;
  recent: PwaInstallation[];
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) throw new Error("Supabase n’est pas configuré côté serveur.");
  return { url: url.replace(/\/+$/, ""), serviceRoleKey };
}

async function pwaInstallationsRequest(path: string, init: RequestInit = {}) {
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
    const details = await response.text().catch(() => "");
    throw new Error(`Supabase a refusé la requête installations PWA (${response.status})${details ? ` : ${details.slice(0, 500)}` : ""}.`);
  }
  return response;
}

export async function savePwaInstallation(input: {
  installationId: string;
  platform: PwaPlatform;
  userAgent: string | null;
}) {
  const now = new Date().toISOString();
  await pwaInstallationsRequest("pwa_installations?on_conflict=installation_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      installation_id: input.installationId,
      platform: input.platform,
      user_agent: input.userAgent?.slice(0, 512) || null,
      last_opened_at: now,
    }),
  });
}

function periodBoundaries(now = new Date()) {
  const offsetMilliseconds = 60 * 60 * 1000;
  const local = new Date(now.getTime() + offsetMilliseconds);
  const localMidnightAsUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const day = local.getUTCDay() || 7;
  return {
    today: localMidnightAsUtc - offsetMilliseconds,
    week: localMidnightAsUtc - ((day - 1) * 24 * 60 * 60 * 1000) - offsetMilliseconds,
    month: Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - offsetMilliseconds,
  };
}

export async function getPwaInstallationStats(): Promise<PwaInstallationStats> {
  const response = await pwaInstallationsRequest(
    "pwa_installations?select=id,installation_id,platform,user_agent,installed_at,last_opened_at&order=installed_at.desc&limit=10000",
  );
  const installations = await response.json() as PwaInstallation[];
  const boundaries = periodBoundaries();
  const byPlatform: Record<PwaPlatform, number> = { ios: 0, android: 0, desktop: 0 };
  let today = 0;
  let thisWeek = 0;
  let thisMonth = 0;

  installations.forEach((installation) => {
    if (installation.platform in byPlatform) byPlatform[installation.platform] += 1;
    const installedAt = new Date(installation.installed_at).getTime();
    if (installedAt >= boundaries.today) today += 1;
    if (installedAt >= boundaries.week) thisWeek += 1;
    if (installedAt >= boundaries.month) thisMonth += 1;
  });

  return {
    total: installations.length,
    today,
    thisWeek,
    thisMonth,
    byPlatform,
    recent: installations.slice(0, 20),
  };
}
