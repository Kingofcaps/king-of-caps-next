alter table public.products
add column if not exists sort_order bigint;

with ranked as (
  select
    id,
    row_number() over (
      order by created_at desc nulls last, id desc
    ) as position
  from public.products
)
update public.products as product
set sort_order = ranked.position
from ranked
where product.id = ranked.id
  and product.sort_order is null;

alter table public.products
alter column sort_order set not null;

create index if not exists products_sort_order_created_at_idx
on public.products (sort_order asc, created_at desc);

create or replace function public.reorder_products(p_product_ids text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_count integer;
  distinct_count integer;
  catalogue_count integer;
begin
  requested_count := coalesce(cardinality(p_product_ids), 0);

  if requested_count = 0 then
    raise exception 'La liste des produits est vide.';
  end if;

  select count(distinct requested.product_id)
  into distinct_count
  from unnest(p_product_ids) as requested(product_id);

  if distinct_count <> requested_count then
    raise exception 'La liste contient des identifiants en double.';
  end if;

  select count(*)
  into catalogue_count
  from public.products;

  if requested_count <> catalogue_count then
    raise exception 'La liste doit contenir tous les produits du catalogue.';
  end if;

  if exists (
    select 1
    from unnest(p_product_ids) as requested(requested_id)
    left join public.products as product on product.id = requested.requested_id
    where product.id is null
  ) then
    raise exception 'La liste contient un produit inconnu.';
  end if;

  update public.products as product
  set sort_order = ordered.position
  from unnest(p_product_ids) with ordinality as ordered(id, position)
  where product.id = ordered.id;
end;
$$;

revoke all on function public.reorder_products(text[]) from public;
grant execute on function public.reorder_products(text[]) to service_role;
