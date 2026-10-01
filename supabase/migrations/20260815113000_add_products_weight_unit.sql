alter table public.products
add column if not exists weight_unit text;

alter table public.products
drop constraint if exists products_weight_unit_check;

alter table public.products
add constraint products_weight_unit_check check (weight_unit in ('gram', 'kg'));
