create extension if not exists pgcrypto;

create table if not exists public.combo_offers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  combo_name text,
  description text,
  combo_price integer,
  image_urls text[] not null default '{}',
  product_ids uuid[] not null default '{}',
  items jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  draft boolean not null default false,

  constraint combo_offers_published_required_fields_check check (
    draft
    or (
      nullif(btrim(combo_name), '') is not null
      and nullif(btrim(description), '') is not null
      and combo_price is not null
      and combo_price >= 0
      and array_length(image_urls, 1) > 0
      and array_length(product_ids, 1) >= 2
      and jsonb_array_length(items) >= 2
    )
  )
);

create index if not exists combo_offers_draft_idx on public.combo_offers (draft);
create index if not exists combo_offers_active_idx on public.combo_offers (active);
create index if not exists combo_offers_created_at_idx on public.combo_offers (created_at desc);
create index if not exists combo_offers_product_ids_gin_idx on public.combo_offers using gin (product_ids);

alter table public.order_items
add column if not exists item_type text not null default 'product',
add column if not exists combo_offer_id uuid references public.combo_offers(id) on delete set null,
add column if not exists combo_items jsonb;

alter table public.order_items
drop constraint if exists order_items_item_type_check;

alter table public.order_items
add constraint order_items_item_type_check check (item_type in ('product', 'combo'));

create index if not exists order_items_combo_offer_id_idx on public.order_items (combo_offer_id);

create or replace function public.set_combo_offers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_combo_offers_updated_at on public.combo_offers;

create trigger set_combo_offers_updated_at
before update on public.combo_offers
for each row
execute function public.set_combo_offers_updated_at();
