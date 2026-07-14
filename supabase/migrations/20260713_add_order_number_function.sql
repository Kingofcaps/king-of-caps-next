create sequence if not exists public.orders_order_number_seq start with 1;

create or replace function public.next_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number bigint;
begin
  next_number := nextval('public.orders_order_number_seq');
  return format('KOC-%s-%s', to_char(current_date, 'YYYY'), lpad(next_number::text, 4, '0'));
end;
$$;

revoke all on function public.next_order_number() from public;
grant execute on function public.next_order_number() to service_role;
