alter table public.products
add column if not exists price_xof integer,
add column if not exists price_eur integer,
add column if not exists price_usd integer;

-- Une seule initialisation depuis l'ancien tarif. Ces montants deviennent ensuite
-- des prix catalogue indépendants, modifiables dans l'administration.
update public.products
set price_xof = coalesce(
  price_xof,
  nullif(regexp_replace(coalesce(substring(coalesce(price, '') from '\(([^)]*)\)'), price), '[^0-9]', '', 'g'), '')::integer
);

update public.products
set price_eur = coalesce(price_eur, round(price_xof::numeric / 655.957)::integer * 100),
    price_usd = coalesce(price_usd, round(price_xof::numeric / 555.5555555556)::integer * 100)
where price_xof is not null;

alter table public.products
alter column price_xof set not null,
alter column price_eur set not null,
alter column price_usd set not null,
add constraint products_price_xof_check check (price_xof >= 0),
add constraint products_price_eur_check check (price_eur >= 0),
add constraint products_price_usd_check check (price_usd >= 0);

alter table public.orders
add column if not exists currency text not null default 'XOF',
add column if not exists payment_currency text not null default 'XOF',
add column if not exists payment_total_amount integer;

update public.orders
set currency = 'XOF',
    payment_currency = 'XOF',
    payment_total_amount = coalesce(payment_total_amount, total_amount);

alter table public.orders
alter column payment_total_amount set not null,
add constraint orders_currency_check check (currency in ('XOF', 'EUR', 'USD')),
add constraint orders_payment_currency_check check (payment_currency in ('XOF', 'EUR', 'USD')),
add constraint orders_payment_total_amount_check check (payment_total_amount >= 0);

alter table public.order_items
add column if not exists currency text not null default 'XOF';

update public.order_items item
set currency = coalesce(target.currency, 'XOF')
from public.orders target
where target.id = item.order_id;

alter table public.order_items
add constraint order_items_currency_check check (currency in ('XOF', 'EUR', 'USD'));

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
  order_currency text := coalesce(nullif(p_order->>'currency', ''), 'XOF');
begin
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'La commande doit contenir au moins un article.';
  end if;
  if coalesce(trim(p_order->>'checkout_id'), '') = '' then
    raise exception 'Identifiant de checkout manquant.';
  end if;
  if order_currency not in ('XOF', 'EUR', 'USD') then
    raise exception 'Devise de commande invalide.';
  end if;

  select * into existing_order from public.orders where checkout_id = p_order->>'checkout_id';
  if found then
    return jsonb_build_object('created', false, 'order', to_jsonb(existing_order));
  end if;

  insert into public.orders (
    order_number, product_id, product_name, product_image, quantity,
    unit_price, subtotal_amount, delivery_fee, total_amount, currency,
    payment_currency, payment_total_amount,
    customer_first_name, customer_last_name, customer_phone, customer_email,
    customer_address, customer_city, customer_note, payment_method,
    payment_status, order_status, paydunya_token, checkout_id,
    stock_reserved_at, notifications_sent_at
  ) values (
    p_order->>'order_number', p_order->>'product_id', p_order->>'product_name',
    p_order->>'product_image', (p_order->>'quantity')::integer,
    (p_order->>'unit_price')::integer, (p_order->>'subtotal_amount')::integer,
    (p_order->>'delivery_fee')::integer, (p_order->>'total_amount')::integer,
    order_currency, coalesce(nullif(p_order->>'payment_currency', ''), order_currency),
    (p_order->>'payment_total_amount')::integer,
    p_order->>'customer_first_name', p_order->>'customer_last_name',
    p_order->>'customer_phone', nullif(p_order->>'customer_email', ''),
    p_order->>'customer_address', p_order->>'customer_city',
    nullif(p_order->>'customer_note', ''), p_order->>'payment_method',
    p_order->>'payment_status', p_order->>'order_status',
    nullif(p_order->>'paydunya_token', ''), p_order->>'checkout_id', null, null
  ) returning * into created_order;

  for item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(nullif(item->>'currency', ''), 'XOF') <> order_currency then
      raise exception 'Une commande ne peut pas mélanger plusieurs devises.';
    end if;
    if (item->>'line_total')::integer <> (item->>'unit_price')::integer * (item->>'quantity')::integer then
      raise exception 'Le total d’une ligne de commande est invalide.';
    end if;
    insert into public.order_items (
      order_id, product_id, product_name, product_image, unit_price, quantity, line_total, currency
    ) values (
      created_order.id, item->>'product_id', item->>'product_name', item->>'product_image',
      (item->>'unit_price')::integer, (item->>'quantity')::integer,
      (item->>'line_total')::integer, order_currency
    );
  end loop;

  return jsonb_build_object('created', true, 'order', to_jsonb(created_order));
exception
  when unique_violation then
    select * into existing_order from public.orders where checkout_id = p_order->>'checkout_id';
    if found then return jsonb_build_object('created', false, 'order', to_jsonb(existing_order)); end if;
    raise;
end;
$$;

revoke all on function public.create_order_with_items(jsonb, jsonb) from public;
grant execute on function public.create_order_with_items(jsonb, jsonb) to service_role;
