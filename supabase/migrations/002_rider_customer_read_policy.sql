drop policy if exists "riders read related customers" on public.customers;

create policy "riders read related customers"
on public.customers
for select
using (
  exists (
    select 1
    from public.orders o
    join public.riders r on r.id = o.rider_id
    where o.customer_id = customers.id
      and r.auth_user_id = auth.uid()
  )
);
