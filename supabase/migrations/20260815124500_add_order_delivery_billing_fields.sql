alter table public.orders
add column if not exists delivery_pincode text,
add column if not exists billing_same_as_shipping boolean not null default true,
add column if not exists billing_name text,
add column if not exists billing_address text,
add column if not exists billing_city text,
add column if not exists billing_state text,
add column if not exists billing_pincode text,
add column if not exists billing_phone text;

alter table public.orders
drop constraint if exists orders_delivery_pincode_not_empty;

alter table public.orders
add constraint orders_delivery_pincode_not_empty check (
  delivery_pincode is null
  or nullif(btrim(delivery_pincode), '') is not null
);

alter table public.orders
drop constraint if exists orders_billing_required_when_different_check;

alter table public.orders
add constraint orders_billing_required_when_different_check check (
  billing_same_as_shipping
  or (
    nullif(btrim(billing_name), '') is not null
    and nullif(btrim(billing_address), '') is not null
    and nullif(btrim(billing_city), '') is not null
    and nullif(btrim(billing_state), '') is not null
    and nullif(btrim(billing_pincode), '') is not null
  )
);
