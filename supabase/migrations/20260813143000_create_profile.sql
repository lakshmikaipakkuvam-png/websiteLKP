create extension if not exists pgcrypto;

create table if not exists public.profile (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null,
  number text not null,
  address text not null,
  instagram_link text,
  facebook_link text,
  whatsapp text,

  constraint profile_required_fields_check check (
    nullif(btrim(name), '') is not null
    and nullif(btrim(number), '') is not null
    and nullif(btrim(address), '') is not null
  ),
  constraint profile_instagram_link_check check (
    instagram_link is null
    or instagram_link ~* '^https?://'
  ),
  constraint profile_facebook_link_check check (
    facebook_link is null
    or facebook_link ~* '^https?://'
  )
);

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profile_updated_at on public.profile;

create trigger set_profile_updated_at
before update on public.profile
for each row
execute function public.set_profile_updated_at();
