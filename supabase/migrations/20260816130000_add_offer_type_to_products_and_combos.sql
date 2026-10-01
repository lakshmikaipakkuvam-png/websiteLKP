alter table public.products
add column if not exists offer_type text not null default 'none';

alter table public.products
drop constraint if exists products_offer_type_check;

alter table public.products
add constraint products_offer_type_check
check (offer_type in ('none', 'limited_time', 'festival'));

create index if not exists products_offer_type_idx on public.products (offer_type);

alter table public.combo_offers
add column if not exists offer_type text not null default 'none';

alter table public.combo_offers
drop constraint if exists combo_offers_offer_type_check;

alter table public.combo_offers
add constraint combo_offers_offer_type_check
check (offer_type in ('none', 'limited_time', 'festival'));

create index if not exists combo_offers_offer_type_idx on public.combo_offers (offer_type);
