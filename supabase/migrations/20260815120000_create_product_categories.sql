create extension if not exists pgcrypto;

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  slug text not null,

  constraint product_categories_name_not_empty check (nullif(btrim(name), '') is not null),
  constraint product_categories_slug_not_empty check (nullif(btrim(slug), '') is not null),
  constraint product_categories_slug_unique unique (slug)
);

create index if not exists product_categories_created_at_idx on public.product_categories (created_at asc);

create or replace function public.set_product_categories_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_product_categories_updated_at on public.product_categories;

create trigger set_product_categories_updated_at
before update on public.product_categories
for each row
execute function public.set_product_categories_updated_at();
