-- SAFE cleanup for LOAD_TEST data only.
-- Deletes only records with LOADTEST_/LOAD_TEST markers created by run_load_test.sql.
-- Run manually. Do not modify these predicates to broader matches.

begin;

set local statement_timeout = '120s';

with deleted_feedback as (
  delete from public.feedback_reviews fr
  using public.orders o
  where fr.order_id = o.id
    and o.order_number like 'LOADTEST_ORDER_%'
  returning fr.id
),
deleted_payments as (
  delete from public.payments p
  using public.orders o
  where p.order_id = o.id
    and o.order_number like 'LOADTEST_ORDER_%'
  returning p.id
),
deleted_order_items as (
  delete from public.order_items oi
  using public.orders o
  where oi.order_id = o.id
    and o.order_number like 'LOADTEST_ORDER_%'
  returning oi.id
),
deleted_orders as (
  delete from public.orders
  where order_number like 'LOADTEST_ORDER_%'
  returning id
),
deleted_combos as (
  delete from public.combo_offers
  where combo_name like 'LOADTEST_Combo_%'
  returning id
),
deleted_products as (
  delete from public.products
  where product_name like 'LOADTEST_Product_%'
  returning id
),
deleted_customers as (
  delete from public.customers
  where phone_number like '9100%'
    and customer_name like 'LOADTEST Customer %'
  returning id
),
deleted_categories as (
  delete from public.product_categories
  where slug like 'loadtest-category-%'
    and name like 'LOADTEST_Category_%'
  returning id
)
select 'feedback_reviews' as table_name, count(*) as deleted_rows from deleted_feedback
union all select 'payments', count(*) from deleted_payments
union all select 'order_items', count(*) from deleted_order_items
union all select 'orders', count(*) from deleted_orders
union all select 'combo_offers', count(*) from deleted_combos
union all select 'products', count(*) from deleted_products
union all select 'customers', count(*) from deleted_customers
union all select 'product_categories', count(*) from deleted_categories
order by table_name;

select
  current_database() as database_name,
  pg_database_size(current_database()) as database_size_bytes,
  pg_size_pretty(pg_database_size(current_database())) as database_size_after_cleanup;

commit;
