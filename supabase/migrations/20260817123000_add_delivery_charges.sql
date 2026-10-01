alter table public.profile
add column if not exists delivery_chennai_amount integer not null default 50,
add column if not exists delivery_bangalore_amount integer not null default 70,
add column if not exists delivery_default_amount integer not null default 60;

alter table public.profile
drop constraint if exists profile_delivery_charge_amounts_check;

alter table public.profile
add constraint profile_delivery_charge_amounts_check check (
  delivery_chennai_amount >= 0
  and delivery_bangalore_amount >= 0
  and delivery_default_amount >= 0
);

alter table public.orders
add column if not exists delivery_charge integer not null default 0,
add column if not exists grand_total_amount integer not null default 0;

update public.orders
set grand_total_amount = subtotal_amount + delivery_charge
where grand_total_amount = 0;

alter table public.orders
drop constraint if exists orders_delivery_charge_check;

alter table public.orders
add constraint orders_delivery_charge_check check (delivery_charge >= 0);

alter table public.orders
drop constraint if exists orders_grand_total_amount_check;

alter table public.orders
add constraint orders_grand_total_amount_check check (grand_total_amount >= subtotal_amount);
