update public.subscriptions
set monthly_amount = round(monthly_amount);

update public.delivery_records
set
  expected_amount = round(expected_amount),
  collected_amount = round(collected_amount),
  due_amount = round(due_amount);

update public.payments
set amount = round(amount);

update public.ledger_entries
set
  debit = round(debit),
  credit = round(credit),
  balance_snapshot = null;

update public.ledger_entries le
set
  credit = 0,
  balance_snapshot = null,
  description = 'Unverified payment entry - credit held until verification'
from public.payments p
where le.payment_id = p.id
  and le.entry_type = 'payment'
  and p.payment_status not in ('verified', 'received');

with ranked_delivery_entries as (
  select
    id,
    row_number() over (
      partition by delivery_record_id, entry_type
      order by created_at asc, id asc
    ) as entry_rank
  from public.ledger_entries
  where entry_type = 'delivery'
    and delivery_record_id is not null
)
update public.ledger_entries le
set
  debit = 0,
  credit = 0,
  balance_snapshot = null,
  description = 'Duplicate delivery entry neutralized'
from ranked_delivery_entries ranked
where le.id = ranked.id
  and ranked.entry_rank > 1;
