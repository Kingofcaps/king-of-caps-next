create table if not exists public.push_notification_events (
  id uuid primary key default gen_random_uuid(),
  event_key text unique not null,
  product_id text not null,
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed')),
  subscription_count integer not null default 0 check (subscription_count >= 0),
  delivered_count integer not null default 0 check (delivered_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  removed_count integer not null default 0 check (removed_count >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.push_notification_events enable row level security;

revoke all on table public.push_notification_events from public, anon, authenticated;
grant select, insert, update on table public.push_notification_events to service_role;

drop policy if exists "Service role manages push notification events"
on public.push_notification_events;

create policy "Service role manages push notification events"
on public.push_notification_events
for all
to service_role
using (true)
with check (true);

create or replace function public.claim_push_notification_event(
  p_event_key text,
  p_product_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.push_notification_events (event_key, product_id)
  values (p_event_key, p_product_id)
  on conflict (event_key) do nothing;

  if found then return true; end if;

  update public.push_notification_events
  set status = 'processing', completed_at = null
  where event_key = p_event_key
    and product_id = p_product_id
    and status = 'failed'
    and delivered_count = 0;

  return found;
end;
$$;

revoke all on function public.claim_push_notification_event(text, text) from public;
grant execute on function public.claim_push_notification_event(text, text) to service_role;
