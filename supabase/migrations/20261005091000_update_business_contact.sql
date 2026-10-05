-- The profile editor stores Indian numbers as ten digits. Customer WhatsApp
-- links prepend country code 91 when building the international wa.me URL.
update public.profile
set number = '8072115228', whatsapp = '8072115228'
where id = (
  select id from public.profile order by updated_at desc limit 1
);
