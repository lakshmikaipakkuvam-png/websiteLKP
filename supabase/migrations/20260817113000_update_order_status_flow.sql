alter table public.orders
drop constraint if exists orders_status_check;

alter table public.customers
drop constraint if exists customers_order_status_check;

update public.orders
set status = case
  when status = 'processed' then 'confirmed'
  when status = 'packed' then 'preparing'
  when status = 'in_transit' then 'shipped'
  else status
end
where status in ('processed', 'packed', 'in_transit');

update public.customers
set order_status = case
  when order_status = 'processed' then 'confirmed'
  when order_status = 'packed' then 'preparing'
  when order_status = 'in_transit' then 'shipped'
  else order_status
end
where order_status in ('processed', 'packed', 'in_transit');

alter table public.orders
alter column status set default 'confirmed';

alter table public.customers
alter column order_status set default 'confirmed';

alter table public.orders
add constraint orders_status_check check (status in ('confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'));

alter table public.customers
add constraint customers_order_status_check check (order_status in ('confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'));
