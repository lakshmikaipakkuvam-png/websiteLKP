create extension if not exists pgcrypto;

create sequence if not exists public.order_number_seq
  start with 1001
  increment by 1
  no minvalue
  no maxvalue
  cache 1;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null default ('LKP-' || lpad(nextval('public.order_number_seq')::text, 6, '0')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  customer_name text not null,
  phone_number text not null,
  whatsapp_number text,
  delivery_address text not null,
  customer_notes text,

  subtotal_amount integer not null,
  status text not null default 'new',

  constraint orders_order_number_unique unique (order_number),
  constraint orders_customer_name_not_empty check (nullif(btrim(customer_name), '') is not null),
  constraint orders_phone_number_not_empty check (nullif(btrim(phone_number), '') is not null),
  constraint orders_delivery_address_not_empty check (nullif(btrim(delivery_address), '') is not null),
  constraint orders_subtotal_amount_check check (subtotal_amount >= 0),
  constraint orders_status_check check (status in ('new', 'accepted', 'packed', 'completed', 'cancelled'))
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now(),

  product_name text not null,
  product_image_url text,
  category_label text,
  weight_label text,
  quantity integer not null,
  unit_price integer not null,
  line_total integer not null,

  constraint order_items_product_name_not_empty check (nullif(btrim(product_name), '') is not null),
  constraint order_items_quantity_check check (quantity > 0),
  constraint order_items_unit_price_check check (unit_price >= 0),
  constraint order_items_line_total_check check (line_total >= 0),
  constraint order_items_line_total_matches_quantity_check check (line_total = quantity * unit_price)
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_phone_number_idx on public.orders (phone_number);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_product_id_idx on public.order_items (product_id);

create or replace function public.set_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_orders_updated_at on public.orders;

create trigger set_orders_updated_at
before update on public.orders
for each row
execute function public.set_orders_updated_at();
