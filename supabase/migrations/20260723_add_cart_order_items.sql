alter table public.orders
add column if not exists checkout_id text,
add column if not exists subtotal_amount integer,
add column if not exists delivery_fee integer not null default 0;

update public.orders
set subtotal_amount = total_amount
where subtotal_amount is null;

alter table public.orders
alter column subtotal_amount set not null,
add constraint orders_subtotal_amount_check check (subtotal_amount >= 0),
add constraint orders_delivery_fee_check check (delivery_fee >= 0);

create unique index if not exists orders_checkout_id_idx
on public.orders (checkout_id)
where checkout_id is not null;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  product_image text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total integer not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);
alter table public.order_items enable row level security;
revoke all on table public.order_items from anon, authenticated;

create or replace function public.create_order_with_items(p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  created_order public.orders%rowtype;
  existing_order public.orders%rowtype;
  item jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'La commande doit contenir au moins un article.';
  end if;
  if coalesce(trim(p_order->>'checkout_id'), '') = '' then
    raise exception 'Identifiant de checkout manquant.';
  end if;

  select * into existing_order
  from public.orders
  where checkout_id = p_order->>'checkout_id';

  if found then
    return jsonb_build_object('created', false, 'order', to_jsonb(existing_order));
  end if;

  insert into public.orders (
    order_number, product_id, product_name, product_image, quantity,
    unit_price, subtotal_amount, delivery_fee, total_amount,
    customer_first_name, customer_last_name, customer_phone, customer_email,
    customer_address, customer_city, customer_note, payment_method,
    payment_status, order_status, paydunya_token, checkout_id,
    stock_reserved_at, notifications_sent_at
  ) values (
    p_order->>'order_number', p_order->>'product_id', p_order->>'product_name',
    p_order->>'product_image', (p_order->>'quantity')::integer,
    (p_order->>'unit_price')::integer, (p_order->>'subtotal_amount')::integer,
    (p_order->>'delivery_fee')::integer, (p_order->>'total_amount')::integer,
    p_order->>'customer_first_name', p_order->>'customer_last_name',
    p_order->>'customer_phone', nullif(p_order->>'customer_email', ''),
    p_order->>'customer_address', p_order->>'customer_city',
    nullif(p_order->>'customer_note', ''), p_order->>'payment_method',
    p_order->>'payment_status', p_order->>'order_status',
    nullif(p_order->>'paydunya_token', ''), p_order->>'checkout_id', null, null
  )
  returning * into created_order;

  for item in select value from jsonb_array_elements(p_items)
  loop
    if (item->>'line_total')::integer <> (item->>'unit_price')::integer * (item->>'quantity')::integer then
      raise exception 'Le total d’une ligne de commande est invalide.';
    end if;

    insert into public.order_items (
      order_id, product_id, product_name, product_image, unit_price, quantity, line_total
    ) values (
      created_order.id, item->>'product_id', item->>'product_name', item->>'product_image',
      (item->>'unit_price')::integer, (item->>'quantity')::integer, (item->>'line_total')::integer
    );
  end loop;

  return jsonb_build_object('created', true, 'order', to_jsonb(created_order));
exception
  when unique_violation then
    select * into existing_order
    from public.orders
    where checkout_id = p_order->>'checkout_id';
    if found then
      return jsonb_build_object('created', false, 'order', to_jsonb(existing_order));
    end if;
    raise;
end;
$$;

create or replace function public.reserve_order_stock(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  target_product public.products%rowtype;
  updated_order public.orders%rowtype;
  item public.order_items%rowtype;
  item_count integer := 0;
begin
  select * into target_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Commande introuvable.'; end if;
  if target_order.stock_reserved_at is not null then
    return jsonb_build_object('processed', false, 'order', to_jsonb(target_order));
  end if;
  if target_order.order_status not in ('pending', 'awaiting_payment') then
    raise exception 'Le stock ne peut pas être réservé pour cette commande.';
  end if;

  for item in select * from public.order_items where order_id = p_order_id order by product_id
  loop
    item_count := item_count + 1;
    select * into target_product from public.products where id = item.product_id for update;
    if not found or target_product.available is not true or target_product.stock_quantity < item.quantity then
      raise exception 'Stock insuffisant pour le produit %.', item.product_name;
    end if;
    update public.products
    set stock_quantity = stock_quantity - item.quantity,
        available = (stock_quantity - item.quantity) > 0
    where id = item.product_id;
    insert into public.stock_movements (
      product_id, product_name, movement_type, quantity_change,
      previous_quantity, new_quantity, note
    ) values (
      item.product_id, item.product_name, 'order_deduction', -item.quantity,
      target_product.stock_quantity, target_product.stock_quantity - item.quantity,
      case when target_order.order_status = 'awaiting_payment' then 'Réservation PayDunya — commande ' else 'Commande ' end || target_order.order_number
    );
  end loop;

  if item_count = 0 then
    select * into target_product from public.products where id = target_order.product_id for update;
    if not found or target_product.available is not true or target_product.stock_quantity < target_order.quantity then
      raise exception 'Stock insuffisant pour cette commande.';
    end if;
    update public.products
    set stock_quantity = stock_quantity - target_order.quantity,
        available = (stock_quantity - target_order.quantity) > 0
    where id = target_order.product_id;
  end if;

  update public.orders set stock_reserved_at = now() where id = p_order_id returning * into updated_order;
  return jsonb_build_object('processed', true, 'order', to_jsonb(updated_order));
end;
$$;

create or replace function public.approve_paydunya_order(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  updated_order public.orders%rowtype;
begin
  select * into target_order from public.orders where paydunya_token = p_token for update;
  if not found then raise exception 'Commande PayDunya introuvable.'; end if;
  if target_order.payment_status = 'paid' and target_order.order_status = 'confirmed' then
    return jsonb_build_object('processed', false, 'order', to_jsonb(target_order));
  end if;
  if target_order.payment_status <> 'pending' or target_order.order_status <> 'awaiting_payment' then
    raise exception 'La commande PayDunya ne peut pas être confirmée.';
  end if;
  if target_order.stock_reserved_at is null then
    perform public.reserve_order_stock(target_order.id);
  end if;
  insert into public.paydunya_payment_events (token, status) values (p_token, 'completed')
  on conflict (token, status) do nothing;
  if not found then
    return jsonb_build_object('processed', false, 'order', to_jsonb(target_order));
  end if;
  update public.orders
  set payment_status = 'paid', order_status = 'confirmed'
  where id = target_order.id returning * into updated_order;
  return jsonb_build_object('processed', true, 'order', to_jsonb(updated_order));
end;
$$;

create or replace function public.release_order_stock(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  target_product public.products%rowtype;
  updated_order public.orders%rowtype;
  item public.order_items%rowtype;
  item_count integer := 0;
begin
  select * into target_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Commande introuvable.'; end if;
  if target_order.stock_reserved_at is null then
    return jsonb_build_object('processed', false, 'order', to_jsonb(target_order));
  end if;

  for item in select * from public.order_items where order_id = target_order.id order by product_id
  loop
    item_count := item_count + 1;
    select * into target_product from public.products where id = item.product_id for update;
    if found then
      update public.products set stock_quantity = stock_quantity + item.quantity, available = true where id = item.product_id;
      insert into public.stock_movements (
        product_id, product_name, movement_type, quantity_change,
        previous_quantity, new_quantity, note
      ) values (
        item.product_id, item.product_name, 'order_cancellation', item.quantity,
        target_product.stock_quantity, target_product.stock_quantity + item.quantity,
        'Libération de la commande ' || target_order.order_number
      );
    end if;
  end loop;

  if item_count = 0 then
    select * into target_product from public.products where id = target_order.product_id for update;
    if found then
      update public.products set stock_quantity = stock_quantity + target_order.quantity, available = true
      where id = target_order.product_id;
      insert into public.stock_movements (
        product_id, product_name, movement_type, quantity_change,
        previous_quantity, new_quantity, note
      ) values (
        target_order.product_id, target_order.product_name, 'order_cancellation', target_order.quantity,
        target_product.stock_quantity, target_product.stock_quantity + target_order.quantity,
        'Libération de la commande ' || target_order.order_number
      );
    end if;
  end if;

  update public.orders set stock_reserved_at = null where id = target_order.id returning * into updated_order;
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
  item public.order_items%rowtype;
  item_count integer := 0;
begin
  if coalesce(p_status, '') not in ('cancelled', 'failed') then raise exception 'Statut PayDunya invalide.'; end if;
  select * into target_order from public.orders where paydunya_token = p_token for update;
  if not found then raise exception 'Commande PayDunya introuvable.'; end if;
  if target_order.payment_status <> 'pending' or target_order.order_status <> 'awaiting_payment' then
    return jsonb_build_object('processed', false, 'order', to_jsonb(target_order));
  end if;
  insert into public.paydunya_payment_events (token, status) values (p_token, p_status)
  on conflict (token, status) do nothing;
  if not found then return jsonb_build_object('processed', false, 'order', to_jsonb(target_order)); end if;

  if target_order.stock_reserved_at is not null then
    for item in select * from public.order_items where order_id = target_order.id order by product_id
    loop
      item_count := item_count + 1;
      select * into target_product from public.products where id = item.product_id for update;
      if found then
        update public.products set stock_quantity = stock_quantity + item.quantity, available = true where id = item.product_id;
        insert into public.stock_movements (
          product_id, product_name, movement_type, quantity_change,
          previous_quantity, new_quantity, note
        ) values (
          item.product_id, item.product_name, 'order_cancellation', item.quantity,
          target_product.stock_quantity, target_product.stock_quantity + item.quantity,
          'Libération PayDunya — commande ' || target_order.order_number
        );
      end if;
    end loop;
    if item_count = 0 then
      update public.products set stock_quantity = stock_quantity + target_order.quantity, available = true
      where id = target_order.product_id;
    end if;
  end if;

  update public.orders
  set payment_status = 'failed', order_status = 'cancelled', stock_reserved_at = null
  where id = target_order.id returning * into updated_order;
  return jsonb_build_object('processed', true, 'order', to_jsonb(updated_order));
end;
$$;

revoke all on function public.create_order_with_items(jsonb, jsonb) from public;
revoke all on function public.reserve_order_stock(uuid) from public;
revoke all on function public.release_order_stock(uuid) from public;
revoke all on function public.approve_paydunya_order(text) from public;
revoke all on function public.fail_paydunya_order(text, text) from public;
grant execute on function public.create_order_with_items(jsonb, jsonb) to service_role;
grant execute on function public.reserve_order_stock(uuid) to service_role;
grant execute on function public.release_order_stock(uuid) to service_role;
grant execute on function public.approve_paydunya_order(text) to service_role;
grant execute on function public.fail_paydunya_order(text, text) to service_role;
