create extension if not exists pgcrypto;

create table if not exists public.product_subcategories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  category_id uuid not null references public.product_categories(id) on delete cascade,
  name text not null,
  slug text not null,
  constraint product_subcategories_name_check check (char_length(btrim(name)) > 0),
  constraint product_subcategories_slug_check check (char_length(btrim(slug)) > 0),
  constraint product_subcategories_category_slug_unique unique (category_id, slug)
);

create index if not exists product_subcategories_category_id_idx
on public.product_subcategories (category_id);

alter table public.products
add column if not exists category_id uuid references public.product_categories(id) on delete set null,
add column if not exists subcategory_id uuid references public.product_subcategories(id) on delete set null,
add column if not exists free_delivery boolean not null default false;

create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_subcategory_id_idx on public.products (subcategory_id);
create index if not exists products_free_delivery_idx on public.products (free_delivery);

update public.products p
set category_id = c.id
from public.product_categories c
where p.category_id is null
  and lower(c.name) = lower(nullif(btrim(p.category->>'selected'), ''));

alter table public.combo_offers
add column if not exists free_delivery boolean not null default false;

create index if not exists combo_offers_free_delivery_idx on public.combo_offers (free_delivery);

create table if not exists public.admin_customer_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  customer_name text,
  rating integer,
  message text,
  image_urls text[] not null default '{}',
  active boolean not null default true,
  constraint admin_customer_reviews_rating_check check (rating is null or (rating between 1 and 5)),
  constraint admin_customer_reviews_content_check check (
    nullif(btrim(coalesce(message, '')), '') is not null
    or cardinality(image_urls) > 0
  )
);

create index if not exists admin_customer_reviews_active_created_idx
on public.admin_customer_reviews (active, created_at desc);

create or replace function public.set_product_subcategories_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_product_subcategories_updated_at on public.product_subcategories;

create trigger set_product_subcategories_updated_at
before update on public.product_subcategories
for each row
execute function public.set_product_subcategories_updated_at();

create or replace function public.set_admin_customer_reviews_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_admin_customer_reviews_updated_at on public.admin_customer_reviews;

create trigger set_admin_customer_reviews_updated_at
before update on public.admin_customer_reviews
for each row
execute function public.set_admin_customer_reviews_updated_at();
