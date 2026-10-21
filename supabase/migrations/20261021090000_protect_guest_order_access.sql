-- Existing orders remain accessible to the owner through authenticated admin APIs.
-- Do not assign legacy orders to guests based on unverified phone numbers.
alter table public.orders add column if not exists owner_session_hash text;
create index if not exists orders_owner_session_hash_idx on public.orders (owner_session_hash)
  where owner_session_hash is not null;

alter table public.orders add column if not exists payment_mode text
  check (payment_mode in ('test', 'live'));
alter table public.orders add column if not exists payment_state text not null default 'awaiting_payment'
  check (payment_state in ('awaiting_payment', 'paid', 'refunded', 'review'));
alter table public.payments add column if not exists payment_mode text not null default 'legacy'
  check (payment_mode in ('test', 'live', 'legacy'));
alter table public.payments add column if not exists refunded_amount_paise bigint not null default 0
  check (refunded_amount_paise >= 0);
alter table public.payments alter column provider_signature_id drop not null;

create or replace function public.lkp_record_payment(
  p_provider_order_id text, p_payment_id text, p_amount_paise bigint,
  p_currency text, p_mode text, p_refunded_paise bigint
) returns public.payments language plpgsql security definer set search_path = '' as $$
declare
  o public.orders%rowtype;
  p public.payments%rowtype;
begin
  select * into o from public.orders where razorpay_order_id = p_provider_order_id for update;
  if not found then raise exception 'Unknown payment order'; end if;
  if p_mode is null or o.payment_mode is distinct from p_mode or p_mode not in ('test','live')
    or p_currency is distinct from 'INR' or p_amount_paise is null
    or p_amount_paise <> coalesce(o.grand_total_amount, o.subtotal_amount)::bigint * 100
    or p_amount_paise < 100 or p_refunded_paise is null
    or p_refunded_paise < 0 or p_refunded_paise > p_amount_paise then
    raise exception 'Payment does not match order';
  end if;
  select * into p from public.payments where provider_order_id = p_provider_order_id;
  if found then
    if p.provider <> 'razorpay' or p.provider_payment_id <> p_payment_id or p.payment_mode <> p_mode then
      raise exception 'Conflicting payment';
    end if;
    update public.payments set refunded_amount_paise = greatest(refunded_amount_paise, p_refunded_paise)
      where id = p.id returning * into p;
  else
    insert into public.payments(order_id, customer_id, provider, provider_order_id, provider_payment_id,
      amount, status, payment_mode, refunded_amount_paise)
      values(o.id, o.customer_id, 'razorpay', p_provider_order_id, p_payment_id,
        p_amount_paise / 100, 'success', p_mode, p_refunded_paise) returning * into p;
  end if;
  update public.orders set payment_state = case
    when p.refunded_amount_paise > 0 then 'refunded'
    when status = 'cancelled' then 'review'
    else 'paid' end where id = o.id;
  return p;
end;
$$;
revoke all on function public.lkp_record_payment(text,text,bigint,text,text,bigint) from public, anon, authenticated;
grant execute on function public.lkp_record_payment(text,text,bigint,text,text,bigint) to service_role;

create or replace function public.lkp_guard_fulfilment() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.status in ('preparing','shipped','delivered') and new.status is distinct from old.status)
     or (new.tracking_id is not null and new.tracking_id is distinct from old.tracking_id) then
    if new.payment_state <> 'paid' or new.payment_mode is distinct from 'live' then
      raise exception 'A captured live payment is required before fulfilment';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists lkp_guard_fulfilment on public.orders;
create trigger lkp_guard_fulfilment before update on public.orders
  for each row execute function public.lkp_guard_fulfilment();

-- Application data is accessed exclusively by the authenticated server API.
do $$
declare table_name text;
begin
  foreach table_name in array array['products','profile','product_categories','product_subcategories',
    'orders','order_items','combo_offers','customers','payments','feedback_reviews','admin_customer_reviews']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
  end loop;
end;
$$;
