alter table public.orders
add column if not exists fedapay_transaction_id text default null,
add column if not exists stock_reserved_at timestamptz default null,
add column if not exists notifications_sent_at timestamptz default null;

create unique index if not exists orders_fedapay_transaction_id_idx
on public.orders (fedapay_transaction_id)
where fedapay_transaction_id is not null;

alter table public.orders
alter column payment_status set default 'pending';

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
