drop policy if exists "riders read assigned delivery ledger entries" on public.ledger_entries;
create policy "riders read assigned delivery ledger entries"
on public.ledger_entries
for select
using (
  public.current_role() = 'rider'
  and exists (
    select 1
    from public.delivery_records dr
    join public.riders r on r.id = dr.rider_id
    where dr.id = ledger_entries.delivery_record_id
      and r.auth_user_id = auth.uid()
  )
);

drop policy if exists "riders insert assigned delivery ledger entries" on public.ledger_entries;
create policy "riders insert assigned delivery ledger entries"
on public.ledger_entries
for insert
with check (
  public.current_role() = 'rider'
  and exists (
    select 1
    from public.delivery_records dr
    join public.riders r on r.id = dr.rider_id
    where dr.id = ledger_entries.delivery_record_id
      and r.auth_user_id = auth.uid()
  )
);
