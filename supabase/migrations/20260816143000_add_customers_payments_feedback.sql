create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  customer_name text not null,
  phone_number text not null,
  whatsapp_number text,
  delivery_address text not null,
  delivery_pincode text,
  billing_same_as_shipping boolean not null default true,
  billing_name text,
  billing_address text,
  billing_city text,
  billing_state text,
  billing_pincode text,
  billing_phone text,
  order_status text not null default 'processed',

  constraint customers_phone_number_unique unique (phone_number),
  constraint customers_customer_name_not_empty check (nullif(btrim(customer_name), '') is not null),
  constraint customers_phone_number_not_empty check (nullif(btrim(phone_number), '') is not null),
  constraint customers_delivery_address_not_empty check (nullif(btrim(delivery_address), '') is not null),
  constraint customers_order_status_check check (order_status in ('processed', 'packed', 'in_transit', 'delivered', 'cancelled'))
);

alter table public.orders
add column if not exists customer_id uuid references public.customers(id) on delete set null;

update public.orders
set status = case
  when status in ('new', 'accepted') then 'processed'
  when status = 'completed' then 'delivered'
  else status
end
where status in ('new', 'accepted', 'completed');

alter table public.orders
drop constraint if exists orders_status_check;

alter table public.orders
alter column status set default 'processed';

alter table public.orders
add constraint orders_status_check check (status in ('processed', 'packed', 'in_transit', 'delivered', 'cancelled'));

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  provider text not null default 'test',
  provider_order_id text not null,
  provider_payment_id text not null,
  provider_signature_id text not null,
  amount integer not null,
  status text not null default 'success',

  constraint payments_provider_order_id_unique unique (provider_order_id),
  constraint payments_provider_payment_id_unique unique (provider_payment_id),
  constraint payments_provider_signature_id_unique unique (provider_signature_id),
  constraint payments_amount_check check (amount >= 0),
  constraint payments_status_check check (status in ('success', 'failed'))
);

create table if not exists public.feedback_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  rating integer not null,
  message text,

  constraint feedback_reviews_order_id_unique unique (order_id),
  constraint feedback_reviews_rating_check check (rating between 1 and 5)
);

create index if not exists customers_phone_number_idx on public.customers (phone_number);
create index if not exists customers_order_status_idx on public.customers (order_status);
create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists payments_order_id_idx on public.payments (order_id);
create index if not exists payments_customer_id_idx on public.payments (customer_id);
create index if not exists feedback_reviews_order_id_idx on public.feedback_reviews (order_id);
create index if not exists feedback_reviews_customer_id_idx on public.feedback_reviews (customer_id);

create or replace function public.set_customers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_customers_updated_at on public.customers;

create trigger set_customers_updated_at
before update on public.customers
for each row
execute function public.set_customers_updated_at();

create or replace function public.set_payments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_payments_updated_at on public.payments;

create trigger set_payments_updated_at
before update on public.payments
for each row
execute function public.set_payments_updated_at();

create or replace function public.set_feedback_reviews_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_feedback_reviews_updated_at on public.feedback_reviews;

create trigger set_feedback_reviews_updated_at
before update on public.feedback_reviews
for each row
execute function public.set_feedback_reviews_updated_at();
