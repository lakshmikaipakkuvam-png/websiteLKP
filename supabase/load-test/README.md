# Supabase Database Capacity Load Test

This is a manual database-capacity test. It is not a production schema migration.

## What I inspected

- No Prisma schema or Prisma migrations exist in this repo.
- Supabase SQL migrations in `supabase/migrations/`
- API database repositories in `api/*Repository.js`
- API routes in `api/*Routes.js`
- Checkout/admin code in `admin-dashboard/src/pages/UserOrdering.jsx` and `admin-dashboard/src/pages/Orders.jsx`

## Tables Used

- `public.product_categories`
- `public.products`
- `public.customers`
- `public.orders`
- `public.order_items`
- `public.payments`
- `public.feedback_reviews`
- `public.combo_offers`

## Relationships

- `orders.customer_id -> customers.id`
- `order_items.order_id -> orders.id on delete cascade`
- `order_items.product_id -> products.id on delete set null`
- `order_items.combo_offer_id -> combo_offers.id on delete set null`
- `payments.order_id -> orders.id on delete cascade`
- `payments.customer_id -> customers.id on delete set null`
- `feedback_reviews.order_id -> orders.id on delete cascade`
- `feedback_reviews.customer_id -> customers.id on delete set null`
- `feedback_reviews.payment_id -> payments.id on delete set null`

## Risks and Notes

- This repo is Supabase SQL based, not Prisma based. A dedicated SQL script is safer than a permanent migration.
- Products and combo offers require `image_urls` for published rows. The load test uses harmless `https://example.com/...` placeholder strings only. It does not upload files to Supabase Storage.
- The current script is a worst-case text-heavy profile: product descriptions, ingredients, storage text, shelf text, customer addresses, order notes, reviews, and combo descriptions are intentionally long.
- Customers are unique by `phone_number`, so test phone numbers use the deterministic `9100xxxxxx` range.
- Orders are identified with `LOADTEST_ORDER_`.
- Cleanup deletes only records matching the `LOADTEST_`/`LOAD_TEST` markers.
- Do not run `prisma migrate reset`, `supabase db reset`, or any destructive reset command.

## Commands / Manual Flow

Run these from Supabase SQL Editor, or with `psql` against the Supabase database.

### 1. Capture BEFORE size

Run:

```sql
\i supabase/load-test/measure_capacity.sql
```

If using Supabase SQL Editor, paste the contents of:

```txt
supabase/load-test/measure_capacity.sql
```

### 2. Run load test

Run:

```sql
\i supabase/load-test/run_load_test.sql
```

This inserts approximately:

- 40 categories
- 100 text-heavy products
- 1,000 customers
- 1,000 orders
- 3,000 order items
- 1,000 payments
- 750 feedback reviews
- 100 combo offers

The script reports:

- database size before
- database size after
- growth in MB
- percentage growth
- row counts before/after
- table size breakdown
- estimated additional order capacity relative to 500 MB

### 3. Capture AFTER size

Run `measure_capacity.sql` again if you want a separate measurement snapshot.

### 4. Cleanup

Run:

```sql
\i supabase/load-test/cleanup_load_test.sql
```

This deletes only records created by the load test and reports deleted rows by table.

### 5. Verify cleanup

Run `measure_capacity.sql` again.
