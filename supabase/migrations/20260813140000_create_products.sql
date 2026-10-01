create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  category jsonb not null default '{"selected": null, "options": []}'::jsonb,
  product_placement jsonb not null default '{"best_sellers": false, "new_arrivals": false, "current_offers": false}'::jsonb,

  product_name text,
  weight_qty_float numeric(12, 3),
  weight_qty_integer integer,
  stock_number integer,
  description text,
  ingredient text,
  storage_text text,
  shelf_text text,
  price integer,
  offer_price integer,
  image_urls text[] not null default '{}',
  draft boolean not null default false,

  constraint products_published_required_fields_check check (
    draft
    or (
      nullif(btrim(category->>'selected'), '') is not null
      and nullif(btrim(product_name), '') is not null
      and (weight_qty_float is not null or weight_qty_integer is not null)
      and weight_unit in ('gram', 'kg')
      and nullif(btrim(description), '') is not null
      and price is not null
      and price >= 0
      and array_length(image_urls, 1) > 0
    )
  )
);

create index if not exists products_draft_idx on public.products (draft);
create index if not exists products_created_at_idx on public.products (created_at desc);
create index if not exists products_category_gin_idx on public.products using gin (category);
create index if not exists products_product_placement_gin_idx on public.products using gin (product_placement);

create or replace function public.set_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_products_updated_at on public.products;

create trigger set_products_updated_at
before update on public.products
for each row
execute function public.set_products_updated_at();
