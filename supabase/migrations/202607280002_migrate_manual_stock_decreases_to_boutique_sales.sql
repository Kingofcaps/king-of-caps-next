-- Reprise historique des retraits manuels de stock en ventes boutique.
-- Le NOTICE est émis avant toute conversion afin que le journal d'exécution
-- affiche le volume et le montant qui vont être repris.

create table if not exists public.shop_sales (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  total_price integer not null check (total_price = quantity * unit_price),
  payment_method text not null default 'Non précisé' check (payment_method = 'Non précisé'),
  sold_at timestamptz not null,
  source_movement_id uuid not null references public.stock_movements(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (source_movement_id)
);

create index if not exists shop_sales_product_id_idx
  on public.shop_sales (product_id);

create index if not exists shop_sales_sold_at_idx
  on public.shop_sales (sold_at desc);

alter table public.shop_sales enable row level security;
revoke all on table public.shop_sales from anon, authenticated;

alter table public.stock_movements
  add column if not exists migrated_to_boutique_sale_at timestamptz;

do $$
declare
  movement_count bigint;
  estimated_total bigint;
begin
  select count(*), coalesce(sum(abs(movement.quantity_change)::bigint * 5000), 0)
    into movement_count, estimated_total
  from public.stock_movements movement
  where movement.movement_type = 'decrease'
    and movement.quantity_change < 0
    and movement.quantity_change = movement.new_quantity - movement.previous_quantity
    and movement.migrated_to_boutique_sale_at is null
    and not exists (
      select 1
      from public.shop_sales sale
      where sale.source_movement_id = movement.id
    );

  raise notice 'Reprise ventes boutique : % mouvement(s), montant estimé : % F',
    movement_count, estimated_total;
end;
$$;

insert into public.shop_sales (
  product_id,
  product_name,
  quantity,
  unit_price,
  total_price,
  payment_method,
  sold_at,
  source_movement_id
)
select
  movement.product_id,
  movement.product_name,
  abs(movement.quantity_change),
  5000,
  abs(movement.quantity_change) * 5000,
  'Non précisé',
  movement.created_at,
  movement.id
from public.stock_movements movement
where movement.movement_type = 'decrease'
  and movement.quantity_change < 0
  and movement.quantity_change = movement.new_quantity - movement.previous_quantity
  and movement.migrated_to_boutique_sale_at is null
on conflict (source_movement_id) do nothing;

update public.stock_movements movement
set migrated_to_boutique_sale_at = coalesce(
  movement.migrated_to_boutique_sale_at,
  sale.created_at
)
from public.shop_sales sale
where sale.source_movement_id = movement.id
  and movement.movement_type = 'decrease'
  and movement.quantity_change < 0
  and movement.quantity_change = movement.new_quantity - movement.previous_quantity
  and movement.migrated_to_boutique_sale_at is null;
