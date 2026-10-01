alter table public.orders
add column if not exists delivery_state text,
add column if not exists delivery_district text;

alter table public.customers
add column if not exists delivery_state text,
add column if not exists delivery_district text;

alter table public.orders
drop constraint if exists orders_delivery_state_not_empty,
drop constraint if exists orders_delivery_district_not_empty;

alter table public.orders
add constraint orders_delivery_state_not_empty check (
  delivery_state is null
  or nullif(btrim(delivery_state), '') is not null
),
add constraint orders_delivery_district_not_empty check (
  delivery_district is null
  or nullif(btrim(delivery_district), '') is not null
);

alter table public.customers
drop constraint if exists customers_delivery_state_not_empty,
drop constraint if exists customers_delivery_district_not_empty;

alter table public.customers
add constraint customers_delivery_state_not_empty check (
  delivery_state is null
  or nullif(btrim(delivery_state), '') is not null
),
add constraint customers_delivery_district_not_empty check (
  delivery_district is null
  or nullif(btrim(delivery_district), '') is not null
);
