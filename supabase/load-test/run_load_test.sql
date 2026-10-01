-- SAFE database-capacity load test.
-- This script inserts clearly marked LOAD_TEST records only.
-- It does not create Supabase Storage objects, auth users, emails, webhooks, or real payments.
-- Run manually in Supabase SQL editor or psql. Do not run automatically in production deploys.

begin;

set local statement_timeout = '120s';

create extension if not exists pgcrypto;

create temp table load_test_before_size as
select pg_database_size(current_database()) as database_size_bytes;

create temp table load_test_before_counts as
select 'products' as table_name, count(*) as row_count from public.products
union all select 'product_categories', count(*) from public.product_categories
union all select 'customers', count(*) from public.customers
union all select 'orders', count(*) from public.orders
union all select 'order_items', count(*) from public.order_items
union all select 'payments', count(*) from public.payments
union all select 'feedback_reviews', count(*) from public.feedback_reviews
union all select 'combo_offers', count(*) from public.combo_offers;

insert into public.product_categories (name, slug)
select
  'LOADTEST_Category_' || lpad(n::text, 2, '0') as name,
  'loadtest-category-' || lpad(n::text, 2, '0') as slug
from generate_series(1, 40) as n
on conflict (slug) do nothing;

with category_pool as (
  select
    name,
    row_number() over (order by name) as rn,
    array_agg(name) over () as all_names
  from public.product_categories
  where slug like 'loadtest-category-%'
),
product_source as (
  select
    n,
    c.name as category_name,
    c.all_names,
    case (n % 12)
      when 0 then 'Traditional Sambal'
      when 1 then 'Dry Fish Sambal'
      when 2 then 'Veg Home Mix'
      when 3 then 'Nethili Special'
      when 4 then 'Vanjaram Spice'
      when 5 then 'Massi Blend'
      when 6 then 'Garlic Podi'
      when 7 then 'Curry Leaf Mix'
      when 8 then 'Pepper Rasam Mix'
      when 9 then 'Millet Crunch'
      when 10 then 'Chilli Coconut Mix'
      else 'Homemade Pickle'
    end as product_base
  from generate_series(1, 100) as n
  join category_pool c on c.rn = ((n - 1) % 40) + 1
)
insert into public.products (
  category,
  product_placement,
  product_name,
  weight_qty_float,
  weight_qty_integer,
  weight_unit,
  stock_number,
  description,
  ingredient,
  storage_text,
  shelf_text,
  price,
  offer_price,
  image_urls,
  draft,
  active,
  offer_type
)
select
  jsonb_build_object('selected', category_name, 'options', to_jsonb(all_names)),
  jsonb_build_object(
    'best_sellers', n % 9 = 0,
    'new_arrivals', n % 7 = 0,
    'current_offers', n % 11 = 0
  ),
  'LOADTEST_Product_' || lpad(n::text, 4, '0') || ' ' || product_base,
  case when n % 5 = 0 then 1.000 else 250.000 + ((n % 4) * 250) end,
  case when n % 5 = 0 then 1 else 250 + ((n % 4) * 250) end,
  case when n % 5 = 0 then 'kg' else 'gram' end,
  20 + (n % 180),
  'LOAD_TEST LARGE PRODUCT DESCRIPTION for ' || product_base || '. '
    || repeat('This is a deliberately long realistic ecommerce product paragraph describing homemade preparation, spice balance, aroma, texture, packaging care, customer usage, serving ideas, quality checks, batch notes, and storage reminders for database capacity testing only. ', 45),
  'LOAD_TEST LARGE INGREDIENT DETAILS: '
    || repeat('dry chilli, garlic, curry leaves, salt, roasted spices, sesame oil, tamarind, pepper, cumin, mustard, asafoetida, turmeric, coconut, traditional hand preparation notes, allergen notes, sourcing notes, batch trace notes. ', 35),
  'LOAD_TEST LARGE STORAGE TEXT: '
    || repeat('Store in a cool dry place, keep the pouch sealed after opening, avoid wet spoons, avoid direct sunlight, refrigerate after opening if the local climate is humid, and consume with clean handling. ', 25),
  'LOAD_TEST LARGE SHELF LIFE TEXT: '
    || repeat('Best before 12 months from manufacture date when stored as instructed. Natural color, aroma, and spice intensity may vary between small homemade batches. ', 25),
  120 + ((n % 35) * 15),
  case when n % 6 = 0 then 100 + ((n % 35) * 15) else null end,
  array['https://example.com/load-test/product-placeholder-' || lpad(n::text, 4, '0') || '.png'],
  false,
  n % 10 <> 0,
  case
    when n % 29 = 0 then 'festival'
    when n % 23 = 0 then 'limited_time'
    else 'none'
  end
from product_source
where not exists (
  select 1 from public.products p
  where p.product_name = 'LOADTEST_Product_' || lpad(product_source.n::text, 4, '0') || ' ' || product_source.product_base
);

insert into public.customers (
  customer_name,
  phone_number,
  whatsapp_number,
  delivery_address,
  delivery_pincode,
  delivery_state,
  delivery_district,
  billing_same_as_shipping,
  billing_name,
  billing_address,
  billing_city,
  billing_state,
  billing_pincode,
  billing_phone,
  order_status
)
select
  'LOADTEST Customer ' || lpad(n::text, 4, '0'),
  '9100' || lpad(n::text, 6, '0'),
  '9100' || lpad(n::text, 6, '0'),
  'LOAD_TEST Door ' || n || ', Capacity Test Street, Test Nagar. '
    || repeat('Long customer delivery landmark text with apartment block, floor, nearby shop, alternate route instruction, delivery timing note, and fake address details for capacity measurement only. ', 12),
  lpad((600000 + (n % 999))::text, 6, '0'),
  'Tamil Nadu',
  case (n % 8)
    when 0 then 'Chennai'
    when 1 then 'Coimbatore'
    when 2 then 'Madurai'
    when 3 then 'Tiruchirappalli'
    when 4 then 'Salem'
    when 5 then 'Tirunelveli'
    when 6 then 'Erode'
    else 'Thanjavur'
  end,
  true,
  null,
  null,
  null,
  null,
  null,
  null,
  case (n % 4)
    when 0 then 'confirmed'
    when 1 then 'preparing'
    when 2 then 'shipped'
    else 'delivered'
  end
from generate_series(1, 1000) as n
on conflict (phone_number) do nothing;

with customer_pool as (
  select id, customer_name, phone_number, whatsapp_number, delivery_address, delivery_pincode, delivery_state, delivery_district,
         row_number() over (order by phone_number) as rn
  from public.customers
  where phone_number like '9100%'
),
order_source as (
  select
    n,
    c.*,
    case (n % 4)
      when 0 then 'confirmed'
      when 1 then 'preparing'
      when 2 then 'shipped'
      else 'delivered'
    end as order_status
  from generate_series(1, 1000) as n
  join customer_pool c on c.rn = n
)
insert into public.orders (
  order_number,
  created_at,
  updated_at,
  customer_id,
  customer_name,
  phone_number,
  whatsapp_number,
  delivery_address,
  delivery_pincode,
  delivery_state,
  delivery_district,
  billing_same_as_shipping,
  customer_notes,
  subtotal_amount,
  status
)
select
  'LOADTEST_ORDER_' || lpad(n::text, 6, '0'),
  now() - ((n % 120)::text || ' days')::interval,
  now() - ((n % 120)::text || ' days')::interval,
  id,
  customer_name,
  phone_number,
  whatsapp_number,
  delivery_address,
  delivery_pincode,
  delivery_state,
  delivery_district,
  true,
  'LOAD_TEST LARGE ORDER NOTE: '
    || repeat('Customer requested careful packing, doorstep handoff, call before delivery, alternate landmark validation, spicy preference note, gift packing note, and operational comments for capacity measurement only. ', 16),
  0,
  order_status
from order_source
on conflict (order_number) do nothing;

with test_orders as (
  select id, order_number, row_number() over (order by order_number) as order_rn
  from public.orders
  where order_number like 'LOADTEST_ORDER_%'
),
test_products as (
  select id, product_name, image_urls, category, weight_qty_float, weight_qty_integer, weight_unit,
         coalesce(offer_price, price) as unit_price,
         row_number() over (order by product_name) as product_rn
  from public.products
  where product_name like 'LOADTEST_Product_%'
),
line_source as (
  select
    o.id as order_id,
    p.id as product_id,
    p.product_name,
    p.image_urls,
    p.category,
    p.weight_qty_float,
    p.weight_qty_integer,
    p.weight_unit,
    p.unit_price,
    1 + ((o.order_rn + line_no) % 3) as quantity,
    line_no
  from test_orders o
  join generate_series(1, 3) as line_no on true
  join test_products p on p.product_rn = (((o.order_rn * 3 + line_no - 2) % 100) + 1)
)
insert into public.order_items (
  order_id,
  product_id,
  item_type,
  product_name,
  product_image_url,
  category_label,
  weight_label,
  quantity,
  unit_price,
  line_total
)
select
  order_id,
  product_id,
  'product',
  product_name,
  image_urls[1],
  category->>'selected',
  coalesce(weight_qty_float, weight_qty_integer)::text || ' ' || case when weight_unit = 'kg' then 'Kg' else 'gram' end,
  quantity,
  unit_price,
  quantity * unit_price
from line_source
where not exists (
  select 1 from public.order_items oi
  where oi.order_id = line_source.order_id
    and oi.product_id = line_source.product_id
    and oi.item_type = 'product'
);

update public.orders o
set
  subtotal_amount = totals.subtotal,
  delivery_charge = case
    when lower(coalesce(o.delivery_district, '') || ' ' || coalesce(o.delivery_state, '')) like '%chennai%' then 50
    when lower(coalesce(o.delivery_district, '') || ' ' || coalesce(o.delivery_state, '')) like '%bangalore%' then 70
    when lower(coalesce(o.delivery_district, '') || ' ' || coalesce(o.delivery_state, '')) like '%bengaluru%' then 70
    else 60
  end,
  discount_code = case when totals.order_rn % 10 = 0 then 'LOADTEST10' else null end,
  discount_amount = case when totals.order_rn % 10 = 0 then least(100, totals.subtotal) else 0 end,
  grand_total_amount = totals.subtotal + case
    when lower(coalesce(o.delivery_district, '') || ' ' || coalesce(o.delivery_state, '')) like '%chennai%' then 50
    when lower(coalesce(o.delivery_district, '') || ' ' || coalesce(o.delivery_state, '')) like '%bangalore%' then 70
    when lower(coalesce(o.delivery_district, '') || ' ' || coalesce(o.delivery_state, '')) like '%bengaluru%' then 70
    else 60
  end - case when totals.order_rn % 10 = 0 then least(100, totals.subtotal) else 0 end
from (
  select
    oi.order_id,
    sum(line_total)::integer as subtotal,
    row_number() over (order by min(o.order_number)) as order_rn
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.order_id in (select id from public.orders where order_number like 'LOADTEST_ORDER_%')
  group by oi.order_id
) totals
where o.id = totals.order_id
  and o.order_number like 'LOADTEST_ORDER_%';

insert into public.payments (
  order_id,
  customer_id,
  provider,
  provider_order_id,
  provider_payment_id,
  provider_signature_id,
  amount,
  status
)
select
  o.id,
  o.customer_id,
  'test',
  'LOADTEST_PROVIDER_ORDER_' || lpad(row_number() over (order by o.order_number)::text, 6, '0'),
  'LOADTEST_PROVIDER_PAYMENT_' || lpad(row_number() over (order by o.order_number)::text, 6, '0'),
  'LOADTEST_PROVIDER_SIGNATURE_' || lpad(row_number() over (order by o.order_number)::text, 6, '0'),
  coalesce(o.grand_total_amount, o.subtotal_amount),
  case when row_number() over (order by o.order_number) % 20 = 0 then 'failed' else 'success' end
from public.orders o
where o.order_number like 'LOADTEST_ORDER_%'
  and not exists (
    select 1 from public.payments p
    where p.order_id = o.id
      and p.provider_order_id like 'LOADTEST_PROVIDER_ORDER_%'
  );

with review_source as (
  select
    o.id as order_id,
    o.customer_id,
    p.id as payment_id,
    row_number() over (order by o.order_number) as rn
  from public.orders o
  join public.payments p on p.order_id = o.id
  where o.order_number like 'LOADTEST_ORDER_%'
    and p.status = 'success'
  order by o.order_number
  limit 750
)
insert into public.feedback_reviews (
  order_id,
  customer_id,
  payment_id,
  rating,
  message
)
select
  order_id,
  customer_id,
  payment_id,
  3 + (rn % 3),
  'LOAD_TEST LARGE REVIEW for capacity measurement order ' || rn || '. '
    || repeat('The customer liked the packaging, taste, aroma, delivery communication, freshness, portion size, and traditional homemade feel. This long feedback text is fake and exists only to measure worst-case review storage. ', 18)
from review_source
on conflict (order_id) do nothing;

with product_pool as (
  select id, product_name, category, weight_qty_float, weight_qty_integer, weight_unit, price, offer_price, image_urls,
         row_number() over (order by product_name) as rn
  from public.products
  where product_name like 'LOADTEST_Product_%'
),
combo_source as (
  select n
  from generate_series(1, 100) as n
),
combo_items as (
  select
    c.n,
    jsonb_agg(jsonb_build_object(
      'productId', p.id,
      'productName', p.product_name,
      'categoryLabel', p.category->>'selected',
      'weightLabel', coalesce(p.weight_qty_float, p.weight_qty_integer)::text || ' ' || case when p.weight_unit = 'kg' then 'Kg' else 'gram' end,
      'price', coalesce(p.offer_price, p.price),
      'imageUrl', p.image_urls[1]
    ) order by p.rn) as items,
    array_agg(p.id order by p.rn) as product_ids,
    sum(coalesce(p.offer_price, p.price))::integer as source_price
  from combo_source c
  join product_pool p on p.rn in ((((c.n - 1) * 3) % 100) + 1, (((c.n - 1) * 3 + 1) % 100) + 1, (((c.n - 1) * 3 + 2) % 100) + 1)
  group by c.n
)
insert into public.combo_offers (
  combo_name,
  description,
  combo_price,
  image_urls,
  product_ids,
  items,
  active,
  draft,
  offer_type
)
select
  'LOADTEST_Combo_' || lpad(n::text, 3, '0'),
  'LOAD_TEST LARGE COMBO DESCRIPTION: '
    || repeat('A realistic bundled offer combining complementary homemade products, serving suggestions, occasion notes, gifting suitability, packaging explanation, and capacity-test text for database storage measurement only. ', 24),
  greatest(source_price - 50, 0),
  array['https://example.com/load-test/combo-placeholder-' || lpad(n::text, 3, '0') || '.png'],
  product_ids,
  items,
  n % 8 <> 0,
  false,
  case when n % 9 = 0 then 'festival' when n % 7 = 0 then 'limited_time' else 'none' end
from combo_items
where not exists (
  select 1 from public.combo_offers co
  where co.combo_name = 'LOADTEST_Combo_' || lpad(combo_items.n::text, 3, '0')
);

create temp table load_test_after_size as
select pg_database_size(current_database()) as database_size_bytes;

create temp table load_test_after_counts as
select 'products' as table_name, count(*) as row_count from public.products
union all select 'product_categories', count(*) from public.product_categories
union all select 'customers', count(*) from public.customers
union all select 'orders', count(*) from public.orders
union all select 'order_items', count(*) from public.order_items
union all select 'payments', count(*) from public.payments
union all select 'feedback_reviews', count(*) from public.feedback_reviews
union all select 'combo_offers', count(*) from public.combo_offers;

select
  pg_size_pretty(b.database_size_bytes) as database_size_before,
  pg_size_pretty(a.database_size_bytes) as database_size_after,
  round(((a.database_size_bytes - b.database_size_bytes)::numeric / 1024 / 1024), 3) as growth_mb,
  round((((a.database_size_bytes - b.database_size_bytes)::numeric / nullif(b.database_size_bytes, 0)) * 100), 3) as growth_percent,
  round(((a.database_size_bytes - b.database_size_bytes)::numeric / 1000 / 1024 / 1024), 4) as approx_mb_per_1000_orders,
  round(((a.database_size_bytes - b.database_size_bytes)::numeric / 100 / 1024 / 1024), 4) as approx_mb_per_100_large_products,
  round(((500 * 1024 * 1024 - a.database_size_bytes)::numeric / nullif(a.database_size_bytes - b.database_size_bytes, 0)) * 1000, 0) as estimated_additional_orders_at_500mb
from load_test_before_size b
cross join load_test_after_size a;

select
  after.table_name,
  before.row_count as rows_before,
  after.row_count as rows_after,
  after.row_count - before.row_count as rows_inserted
from load_test_before_counts before
join load_test_after_counts after using (table_name)
order by after.table_name;

select
  schemaname,
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size,
  pg_size_pretty(pg_relation_size(relid)) as table_size,
  pg_size_pretty(pg_indexes_size(relid)) as index_size
from pg_catalog.pg_statio_user_tables
where schemaname = 'public'
order by pg_total_relation_size(relid) desc;

commit;
