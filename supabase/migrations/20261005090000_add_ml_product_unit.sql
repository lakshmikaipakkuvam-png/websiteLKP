begin;

alter table public.products
  drop constraint if exists products_weight_unit_check;
alter table public.products
  add constraint products_weight_unit_check
  check (weight_unit in ('gram', 'kg', 'ml'));

alter table public.products
  drop constraint if exists products_published_required_fields_check;
alter table public.products
  add constraint products_published_required_fields_check check (
    draft
    or (
      nullif(btrim(category->>'selected'), '') is not null
      and nullif(btrim(product_name), '') is not null
      and (weight_qty_float is not null or weight_qty_integer is not null)
      and weight_unit in ('gram', 'kg', 'ml')
      and nullif(btrim(description), '') is not null
      and price is not null
      and price >= 0
      and array_length(image_urls, 1) > 0
    )
  );

commit;
