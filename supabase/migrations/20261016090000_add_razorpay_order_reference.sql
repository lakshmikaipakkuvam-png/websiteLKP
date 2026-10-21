begin;

alter table public.orders add column if not exists razorpay_order_id text;
create unique index if not exists orders_razorpay_order_id_unique
  on public.orders (razorpay_order_id) where razorpay_order_id is not null;

-- Callback retries must not record two successful payments for one shop order.
create unique index if not exists payments_razorpay_success_order_unique
  on public.payments (order_id) where provider = 'razorpay' and status = 'success';

commit;
