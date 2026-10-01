alter table public.orders
add column if not exists tracking_id text;

create index if not exists orders_tracking_id_idx
on public.orders (tracking_id)
where tracking_id is not null;
