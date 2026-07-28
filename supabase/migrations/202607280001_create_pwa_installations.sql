create table if not exists public.pwa_installations (
  id uuid primary key default gen_random_uuid(),
  installation_id text unique not null,
  platform text not null check (platform in ('ios', 'android', 'desktop')),
  user_agent text,
  installed_at timestamptz not null default now(),
  last_opened_at timestamptz not null default now()
);

create index if not exists pwa_installations_installed_at_idx
on public.pwa_installations (installed_at desc);

alter table public.pwa_installations enable row level security;

revoke all on table public.pwa_installations from public, anon, authenticated;
grant select, insert, update on table public.pwa_installations to service_role;

drop policy if exists "Service role manages PWA installations"
on public.pwa_installations;

create policy "Service role manages PWA installations"
on public.pwa_installations
for all
to service_role
using (true)
with check (true);
