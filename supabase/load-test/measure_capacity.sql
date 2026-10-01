-- SAFE read-only capacity measurement for the current database.
-- Run before load test, after load test, and after cleanup if desired.

select
  current_database() as database_name,
  pg_database_size(current_database()) as database_size_bytes,
  pg_size_pretty(pg_database_size(current_database())) as database_size;

select
  schemaname,
  relname as table_name,
  pg_total_relation_size(relid) as total_size_bytes,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size,
  pg_size_pretty(pg_relation_size(relid)) as table_size,
  pg_size_pretty(pg_indexes_size(relid)) as index_size
from pg_catalog.pg_statio_user_tables
order by pg_total_relation_size(relid) desc;

select 'products' as table_name, count(*) as row_count from public.products
union all select 'product_categories', count(*) from public.product_categories
union all select 'customers', count(*) from public.customers
union all select 'orders', count(*) from public.orders
union all select 'order_items', count(*) from public.order_items
union all select 'payments', count(*) from public.payments
union all select 'feedback_reviews', count(*) from public.feedback_reviews
union all select 'combo_offers', count(*) from public.combo_offers
order by table_name;
