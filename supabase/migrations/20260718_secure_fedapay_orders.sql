alter table public.orders
add column if not exists fedapay_transaction_id text,
add column if not exists stock_reserved_at timestamptz,
add column if not exists notifications_sent_at timestamptz;

create unique index if not exists orders_fedapay_transaction_id_idx
on public.orders (fedapay_transaction_id)
where fedapay_transaction_id is not null;

alter table public.orders drop constraint if exists orders_order_status_check;
alter table public.orders
add constraint orders_order_status_check check (
  order_status in (
    'new',
    'pending',
    'awaiting_payment',
    'confirmed',
    'preparing',
    'delivered',
    'cancelled'
  )
);

create table if not exists public.fedapay_webhook_events (
  event_id text primary key,
  transaction_id text not null,
  event_name text not null,
  processed_at timestamptz not null default now()
);

alter table public.fedapay_webhook_events enable row level security;
revoke all on table public.fedapay_webhook_events from anon, authenticated;

create or replace function public.approve_fedapay_order(
  p_transaction_id text,
  p_event_id text
)
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
  if coalesce(trim(p_transaction_id), '') = '' or coalesce(trim(p_event_id), '') = '' then
    raise exception 'Transaction ou événement FedaPay manquant.';
  end if;

  select * into target_order
  from public.orders
  where fedapay_transaction_id = p_transaction_id
  for update;

  if not found then
    raise exception 'Commande FedaPay introuvable.';
  end if;

  if target_order.payment_status = 'paid' and target_order.order_status = 'confirmed' then
    return jsonb_build_object('processed', false, 'order', to_jsonb(target_order));
  end if;

  if target_order.payment_status <> 'pending' or target_order.order_status <> 'awaiting_payment' then
    raise exception 'La commande FedaPay ne peut pas être approuvée dans son état actuel.';
  end if;

  insert into public.fedapay_webhook_events (event_id, transaction_id, event_name)
  values (p_event_id, p_transaction_id, 'transaction.approved')
  on conflict (event_id) do nothing;

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
    'Paiement FedaPay approuvé — commande ' || target_order.order_number
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

create or replace function public.fail_fedapay_order(
  p_transaction_id text,
  p_event_id text,
  p_event_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  updated_order public.orders%rowtype;
begin
  if p_event_name not in ('transaction.declined', 'transaction.canceled') then
    raise exception 'Événement FedaPay invalide.';
  end if;

  select * into target_order
  from public.orders
  where fedapay_transaction_id = p_transaction_id
  for update;

  if not found then
    raise exception 'Commande FedaPay introuvable.';
  end if;

  if target_order.payment_status <> 'pending' or target_order.order_status <> 'awaiting_payment' then
    return jsonb_build_object('processed', false, 'order', to_jsonb(target_order));
  end if;

  insert into public.fedapay_webhook_events (event_id, transaction_id, event_name)
  values (p_event_id, p_transaction_id, p_event_name)
  on conflict (event_id) do nothing;

  if not found then
    return jsonb_build_object('processed', false, 'order', to_jsonb(target_order));
  end if;

  update public.orders
  set
    payment_status = 'failed',
    order_status = 'cancelled'
  where id = target_order.id
  returning * into updated_order;

  return jsonb_build_object('processed', true, 'order', to_jsonb(updated_order));
end;
$$;

revoke all on function public.approve_fedapay_order(text, text) from public;
revoke all on function public.fail_fedapay_order(text, text, text) from public;
grant execute on function public.approve_fedapay_order(text, text) to service_role;
grant execute on function public.fail_fedapay_order(text, text, text) to service_role;
