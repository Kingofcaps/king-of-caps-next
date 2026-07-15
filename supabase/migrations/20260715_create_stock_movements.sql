create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  product_name text not null,
  movement_type text not null check (
    movement_type in (
      'creation',
      'increase',
      'decrease',
      'restock',
      'product_edit',
      'order_deduction',
      'order_cancellation'
    )
  ),
  quantity_change integer not null,
  previous_quantity integer not null check (previous_quantity >= 0),
  new_quantity integer not null check (new_quantity >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_product_id_idx
  on public.stock_movements (product_id);

create index if not exists stock_movements_movement_type_idx
  on public.stock_movements (movement_type);

create index if not exists stock_movements_created_at_idx
  on public.stock_movements (created_at desc);

alter table public.stock_movements enable row level security;

revoke all on table public.stock_movements from anon, authenticated;
