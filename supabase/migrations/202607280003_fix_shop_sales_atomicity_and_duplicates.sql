-- Normalise le nom de la table déjà déployée sans perdre ses données.
do $$
begin
  if to_regclass('public.shop_sales') is null
     and to_regclass('public.boutique_sales') is not null then
    alter table public.boutique_sales rename to shop_sales;
  end if;
end;
$$;

-- Normalise le lien idempotent vers le mouvement source historique.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'shop_sales'
      and column_name = 'source_stock_movement_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'shop_sales'
      and column_name = 'source_movement_id'
  ) then
    alter table public.shop_sales
      rename column source_stock_movement_id to source_movement_id;
  end if;
end;
$$;

alter table public.shop_sales
  add column if not exists request_id uuid;

-- Seuls les doublons certains (même mouvement source non nul) sont corrigés.
-- Aucune déduplication n'est faite sur le produit, le montant ou la date seuls.
do $$
declare
  duplicate_count bigint;
begin
  select coalesce(sum(grouped.row_count - 1), 0)
  into duplicate_count
  from (
    select count(*) as row_count
    from public.shop_sales
    where source_movement_id is not null
    group by source_movement_id
    having count(*) > 1
  ) grouped;

  raise notice 'Ventes boutique : % doublon(s) certain(s) seront supprimés', duplicate_count;
end;
$$;

with ranked_duplicates as (
  select
    id,
    row_number() over (
      partition by source_movement_id
      order by created_at asc, id asc
    ) as duplicate_rank
  from public.shop_sales
  where source_movement_id is not null
)
delete from public.shop_sales sale
using ranked_duplicates duplicate
where sale.id = duplicate.id
  and duplicate.duplicate_rank > 1;

create unique index if not exists shop_sales_source_movement_id_uidx
  on public.shop_sales (source_movement_id)
  where source_movement_id is not null;

do $$
declare
  duplicate_count bigint;
begin
  select coalesce(sum(grouped.row_count - 1), 0)
  into duplicate_count
  from (
    select count(*) as row_count
    from public.shop_sales
    where request_id is not null
    group by request_id
    having count(*) > 1
  ) grouped;

  raise notice 'Ventes boutique : % doublon(s) de requête certain(s) seront supprimés', duplicate_count;
end;
$$;

with ranked_duplicates as (
  select
    id,
    row_number() over (
      partition by request_id
      order by created_at asc, id asc
    ) as duplicate_rank
  from public.shop_sales
  where request_id is not null
)
delete from public.shop_sales sale
using ranked_duplicates duplicate
where sale.id = duplicate.id
  and duplicate.duplicate_rank > 1;

create unique index if not exists shop_sales_request_id_uidx
  on public.shop_sales (request_id)
  where request_id is not null;

create index if not exists shop_sales_product_id_idx
  on public.shop_sales (product_id);

create index if not exists shop_sales_sold_at_idx
  on public.shop_sales (sold_at desc);

alter table public.shop_sales
  drop constraint if exists boutique_sales_payment_method_check,
  drop constraint if exists shop_sales_payment_method_check;

alter table public.shop_sales
  add constraint shop_sales_payment_method_check check (
    payment_method in (
      'Non précisé',
      'Espèces',
      'MTN MoMo',
      'Celtiis Cash',
      'Carte bancaire',
      'Virement',
      'Autre'
    )
  );

alter table public.stock_movements
  drop constraint if exists stock_movements_movement_type_check;

alter table public.stock_movements
  add constraint stock_movements_movement_type_check check (
    movement_type in (
      'creation',
      'increase',
      'decrease',
      'restock',
      'product_edit',
      'order_deduction',
      'order_cancellation',
      'shop_sale'
    )
  );

create or replace function public.record_shop_sale(
  p_product_id text,
  p_quantity integer,
  p_unit_price integer,
  p_payment_method text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_product public.products%rowtype;
  updated_product public.products%rowtype;
  existing_sale public.shop_sales%rowtype;
  created_sale public.shop_sales%rowtype;
  created_movement public.stock_movements%rowtype;
begin
  if p_request_id is null then
    raise exception 'Identifiant de requête manquant.';
  end if;
  if p_quantity is null or p_quantity < 1 then
    raise exception 'La quantité doit être supérieure à zéro.';
  end if;
  if p_unit_price is null or p_unit_price < 1 then
    raise exception 'Le prix unitaire doit être supérieur à zéro.';
  end if;
  if p_payment_method not in (
    'Espèces', 'MTN MoMo', 'Celtiis Cash', 'Carte bancaire', 'Virement', 'Autre'
  ) then
    raise exception 'Mode de paiement invalide.';
  end if;

  select * into target_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Produit introuvable.';
  end if;

  -- Le verrou produit sérialise aussi les nouvelles tentatives portant le même
  -- request_id. Une relance retourne la vente existante sans toucher au stock.
  select * into existing_sale
  from public.shop_sales
  where request_id = p_request_id;

  if found then
    return jsonb_build_object(
      'created', false,
      'sale', to_jsonb(existing_sale),
      'product', to_jsonb(target_product)
    );
  end if;

  if target_product.stock_quantity < p_quantity then
    raise exception 'Stock insuffisant pour cette vente.';
  end if;

  update public.products
  set stock_quantity = stock_quantity - p_quantity,
      available = (stock_quantity - p_quantity) > 0
  where id = p_product_id
  returning * into updated_product;

  insert into public.stock_movements (
    product_id,
    product_name,
    movement_type,
    quantity_change,
    previous_quantity,
    new_quantity,
    note
  ) values (
    target_product.id,
    target_product.name,
    'shop_sale',
    -p_quantity,
    target_product.stock_quantity,
    target_product.stock_quantity - p_quantity,
    'Vente boutique — ' || p_payment_method
  )
  returning * into created_movement;

  insert into public.shop_sales (
    product_id,
    product_name,
    quantity,
    unit_price,
    total_price,
    payment_method,
    sold_at,
    source_movement_id,
    request_id
  ) values (
    target_product.id,
    target_product.name,
    p_quantity,
    p_unit_price,
    p_quantity * p_unit_price,
    p_payment_method,
    now(),
    created_movement.id,
    p_request_id
  )
  returning * into created_sale;

  return jsonb_build_object(
    'created', true,
    'sale', to_jsonb(created_sale),
    'product', to_jsonb(updated_product)
  );
end;
$$;

revoke all on function public.record_shop_sale(text, integer, integer, text, uuid) from public;
grant execute on function public.record_shop_sale(text, integer, integer, text, uuid) to service_role;

alter table public.shop_sales enable row level security;
revoke all on table public.shop_sales from anon, authenticated;
