create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  product_id text not null,
  product_name text not null,
  product_image text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  total_amount integer not null check (total_amount >= 0),
  customer_first_name text not null,
  customer_last_name text not null,
  customer_phone text not null,
  customer_email text,
  customer_address text not null,
  customer_city text not null,
  customer_note text,
  payment_method text not null check (payment_method in ('cash_on_delivery', 'mobile_money', 'card')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  order_status text not null default 'new' check (order_status in ('new', 'confirmed', 'preparing', 'delivered', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
