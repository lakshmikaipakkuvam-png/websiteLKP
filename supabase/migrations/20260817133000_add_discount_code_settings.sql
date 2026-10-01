alter table public.profile
add column if not exists discount_enabled boolean not null default false,
add column if not exists discount_code text,
add column if not exists discount_type text not null default 'amount',
add column if not exists discount_value integer not null default 0,
add column if not exists discount_min_order_amount integer not null default 0;

alter table public.profile
drop constraint if exists profile_discount_settings_check;

alter table public.profile
add constraint profile_discount_settings_check check (
  discount_type in ('amount', 'percent')
  and discount_value >= 0
  and discount_min_order_amount >= 0
);

alter table public.orders
add column if not exists discount_code text,
add column if not exists discount_amount integer not null default 0;

alter table public.orders
drop constraint if exists orders_discount_amount_check;

alter table public.orders
add constraint orders_discount_amount_check check (discount_amount >= 0);

alter table public.orders
drop constraint if exists orders_grand_total_amount_check;

alter table public.orders
add constraint orders_grand_total_amount_check check (grand_total_amount >= 0);
