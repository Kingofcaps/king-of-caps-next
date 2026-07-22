alter table public.orders
add column if not exists paydunya_token text;

create unique index if not exists orders_paydunya_token_idx
on public.orders (paydunya_token)
where paydunya_token is not null;

create table if not exists public.paydunya_payment_events (
  token text not null,
  status text not null check (status in ('completed', 'cancelled', 'failed')),
  processed_at timestamptz not null default now(),
  primary key (token, status)
);

alter table public.paydunya_payment_events enable row level security;
revoke all on table public.paydunya_payment_events from anon, authenticated;

create or replace function public.approve_paydunya_order(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  target_product public.products%rowtype;
  updated_order public.orders%rowtype;
begin
  if coalesce(trim(p_token), '') = '' then
    raise exception 'Token PayDunya manquant.';
  end if;

  select * into target_order
  from public.orders
  where paydunya_token = p_token
  for update;

  if not found then
    raise exception 'Commande PayDunya introuvable.';
  end if;

  if target_order.payment_status = 'paid' and target_order.order_status = 'confirmed' then
    return jsonb_build_object('processed', false, 'order', to_jsonb(target_order));
  end if;

  if target_order.payment_status <> 'pending' or target_order.order_status <> 'awaiting_payment' then
    raise exception 'La commande PayDunya ne peut pas être confirmée dans son état actuel.';
  end if;

  insert into public.paydunya_payment_events (token, status)
  values (p_token, 'completed')
  on conflict (token, status) do nothing;

  if not found then
    return jsonb_build_object('processed', false, 'order', to_jsonb(target_order));
  end if;

  select * into target_product
  from public.products
  where id = target_order.product_id
  for update;

  if not found or target_product.available is not true or target_product.stock_quantity < target_order.quantity then
    raise exception 'Stock insuffisant pour confirmer cette commande payée.';
  end if;

  update public.products
  set
    stock_quantity = stock_quantity - target_order.quantity,
    available = (stock_quantity - target_order.quantity) > 0
  where id = target_order.product_id;

  insert into public.stock_movements (
    product_id,
    product_name,
    movement_type,
    quantity_change,
    previous_quantity,
    new_quantity,
    note
  ) values (
    target_order.product_id,
    target_order.product_name,
    'order_deduction',
    -target_order.quantity,
    target_product.stock_quantity,
    target_product.stock_quantity - target_order.quantity,
    'Paiement PayDunya confirmé — commande ' || target_order.order_number
  );

  update public.orders
  set
    payment_status = 'paid',
    order_status = 'confirmed',
    stock_reserved_at = now()
  where id = target_order.id
  returning * into updated_order;

  return jsonb_build_object('processed', true, 'order', to_jsonb(updated_order));
end;
$$;

create or replace function public.fail_paydunya_order(p_token text, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  target_product public.products%rowtype;
  updated_order public.orders%rowtype;
begin
  if p_status not in ('cancelled', 'failed') then
    raise exception 'Statut PayDunya invalide.';
  end if;

  select * into target_order
  from public.orders
  where paydunya_token = p_token
  for update;

  if not found then
    raise exception 'Commande PayDunya introuvable.';
  end if;

  if target_order.payment_status <> 'pending' or target_order.order_status <> 'awaiting_payment' then
    return jsonb_build_object('processed', false, 'order', to_jsonb(target_order));
  end if;

  insert into public.paydunya_payment_events (token, status)
  values (p_token, p_status)
  on conflict (token, status) do nothing;

  if not found then
    return jsonb_build_object('processed', false, 'order', to_jsonb(target_order));
  end if;

  if target_order.stock_reserved_at is not null then
    select * into target_product
    from public.products
    where id = target_order.product_id
    for update;

    if found then
      update public.products
      set
        stock_quantity = stock_quantity + target_order.quantity,
        available = true
      where id = target_order.product_id;

      insert into public.stock_movements (
        product_id,
        product_name,
        movement_type,
        quantity_change,
        previous_quantity,
        new_quantity,
        note
      ) values (
        target_order.product_id,
        target_order.product_name,
        'order_cancellation',
        target_order.quantity,
        target_product.stock_quantity,
        target_product.stock_quantity + target_order.quantity,
        'Paiement PayDunya non abouti — commande ' || target_order.order_number
      );
    end if;
  end if;

  update public.orders
  set
    payment_status = 'failed',
    order_status = 'cancelled',
    stock_reserved_at = null
  where id = target_order.id
  returning * into updated_order;

  return jsonb_build_object('processed', true, 'order', to_jsonb(updated_order));
end;
$$;

revoke all on function public.approve_paydunya_order(text) from public;
revoke all on function public.fail_paydunya_order(text, text) from public;
grant execute on function public.approve_paydunya_order(text) to service_role;
grant execute on function public.fail_paydunya_order(text, text) to service_role;

drop function if exists public.approve_fedapay_order(text, text);
drop function if exists public.fail_fedapay_order(text, text, text);

comment on column public.orders.fedapay_transaction_id is
'Identifiant historique conservé uniquement pour les anciennes commandes; aucune nouvelle transaction ne l’utilise.';
