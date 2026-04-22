do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum ('active', 'inactive', 'paused', 'ended');
  end if;
  if not exists (select 1 from pg_type where typname = 'delivery_frequency') then
    create type delivery_frequency as enum ('daily', 'weekdays', 'custom_days');
  end if;
  if not exists (select 1 from pg_type where typname = 'billing_cycle') then
    create type billing_cycle as enum ('monthly');
  end if;
  if not exists (select 1 from pg_type where typname = 'delivery_record_status') then
    create type delivery_record_status as enum (
      'scheduled',
      'delivered',
      'partially_delivered',
      'not_delivered',
      'skipped',
      'rescheduled'
    );
  end if;
end $$;

do $$
begin
  alter type ledger_entry_type add value if not exists 'delivery';
exception
  when duplicate_object then null;
end $$;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  rider_id uuid references public.riders(id) on delete set null,
  bottles_per_delivery integer not null check (bottles_per_delivery > 0),
  delivery_frequency delivery_frequency not null default 'daily',
  delivery_days smallint[] not null default '{}',
  preferred_time_slot text,
  monthly_amount numeric(12,2) not null check (monthly_amount >= 0),
  payment_method payment_method not null default 'cash',
  billing_cycle billing_cycle not null default 'monthly',
  start_date date not null,
  end_date date,
  status subscription_status not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.delivery_records (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  subscription_id uuid not null references public.subscriptions(id) on delete restrict,
  rider_id uuid references public.riders(id) on delete set null,
  scheduled_date date not null,
  scheduled_time_slot text,
  scheduled_bottles integer not null check (scheduled_bottles > 0),
  delivered_bottles integer check (delivered_bottles is null or delivered_bottles >= 0),
  status delivery_record_status not null default 'scheduled',
  expected_amount numeric(12,2) not null default 0,
  collected_amount numeric(12,2) not null default 0,
  due_amount numeric(12,2) not null default 0,
  delivered_at timestamptz,
  transaction_reference text,
  note text,
  proof_url text,
  legacy_order_id uuid unique references public.orders(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.payments
  add column if not exists subscription_id uuid references public.subscriptions(id) on delete set null,
  add column if not exists delivery_record_id uuid references public.delivery_records(id) on delete set null;

alter table public.ledger_entries
  add column if not exists subscription_id uuid references public.subscriptions(id) on delete set null,
  add column if not exists delivery_record_id uuid references public.delivery_records(id) on delete set null;

alter table public.delivery_proofs
  add column if not exists delivery_record_id uuid references public.delivery_records(id) on delete cascade;

create index if not exists idx_subscriptions_customer_id on public.subscriptions(customer_id);
create index if not exists idx_subscriptions_rider_id on public.subscriptions(rider_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
create index if not exists idx_delivery_records_customer_id on public.delivery_records(customer_id);
create index if not exists idx_delivery_records_subscription_id on public.delivery_records(subscription_id);
create index if not exists idx_delivery_records_rider_id on public.delivery_records(rider_id);
create index if not exists idx_delivery_records_scheduled_date on public.delivery_records(scheduled_date);
create unique index if not exists idx_delivery_records_subscription_date_unique
  on public.delivery_records(subscription_id, scheduled_date);

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
before update on public.subscriptions
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_delivery_records_updated_at on public.delivery_records;
create trigger trg_delivery_records_updated_at
before update on public.delivery_records
for each row execute procedure public.set_updated_at();

alter table public.subscriptions enable row level security;
alter table public.delivery_records enable row level security;

insert into public.subscriptions (
  customer_id,
  rider_id,
  bottles_per_delivery,
  delivery_frequency,
  delivery_days,
  preferred_time_slot,
  monthly_amount,
  payment_method,
  billing_cycle,
  start_date,
  end_date,
  status,
  created_at,
  updated_at
)
select
  c.id,
  c.assigned_rider_id,
  c.daily_bottle_qty,
  'daily'::delivery_frequency,
  '{}'::smallint[],
  '09:00 - 12:00',
  greatest((c.daily_bottle_qty * c.price_per_bottle * 30)::numeric(12,2), 0),
  c.default_payment_method,
  'monthly'::billing_cycle,
  c.service_start_date,
  nullif(c.service_end_date, c.service_start_date),
  case when c.is_active then 'active'::subscription_status else 'inactive'::subscription_status end,
  c.created_at,
  c.updated_at
from public.customers c
where not exists (
  select 1
  from public.subscriptions s
  where s.customer_id = c.id
);

insert into public.delivery_records (
  customer_id,
  subscription_id,
  rider_id,
  scheduled_date,
  scheduled_time_slot,
  scheduled_bottles,
  delivered_bottles,
  status,
  expected_amount,
  collected_amount,
  due_amount,
  delivered_at,
  transaction_reference,
  note,
  proof_url,
  legacy_order_id,
  created_at,
  updated_at
)
select
  o.customer_id,
  s.id,
  o.rider_id,
  coalesce(o.service_day, o.delivery_date::date),
  '09:00 - 12:00',
  o.bottle_qty,
  o.delivered_qty,
  case
    when o.order_status = 'delivered' and o.amount_received > 0 and o.due_amount > 0 then 'partially_delivered'::delivery_record_status
    when o.order_status = 'delivered' then 'delivered'::delivery_record_status
    when o.order_status = 'cancelled' then 'skipped'::delivery_record_status
    else 'scheduled'::delivery_record_status
  end,
  o.total_amount,
  o.amount_received,
  o.due_amount,
  case when o.order_status = 'delivered' then o.updated_at else null end,
  o.transaction_reference,
  o.notes,
  null,
  o.id,
  o.created_at,
  o.updated_at
from public.orders o
join lateral (
  select s.id
  from public.subscriptions s
  where s.customer_id = o.customer_id
  order by s.created_at asc
  limit 1
) s on true
where not exists (
  select 1
  from public.delivery_records dr
  where dr.legacy_order_id = o.id
);

update public.payments p
set
  subscription_id = dr.subscription_id,
  delivery_record_id = dr.id
from public.delivery_records dr
where p.order_id = dr.legacy_order_id
  and (p.delivery_record_id is null or p.subscription_id is null);

update public.ledger_entries le
set
  subscription_id = dr.subscription_id,
  delivery_record_id = dr.id
from public.delivery_records dr
where le.order_id = dr.legacy_order_id
  and (le.delivery_record_id is null or le.subscription_id is null);

update public.delivery_proofs dp
set delivery_record_id = dr.id
from public.delivery_records dr
where dp.order_id = dr.legacy_order_id
  and dp.delivery_record_id is null;

drop policy if exists "admins full access subscriptions" on public.subscriptions;
create policy "admins full access subscriptions" on public.subscriptions for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "riders read assigned subscriptions" on public.subscriptions;
create policy "riders read assigned subscriptions" on public.subscriptions for select
using (
  public.current_role() = 'rider'
  and rider_id in (select id from public.riders where auth_user_id = auth.uid())
);

drop policy if exists "admins full access delivery records" on public.delivery_records;
create policy "admins full access delivery records" on public.delivery_records for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "riders read assigned delivery records" on public.delivery_records;
create policy "riders read assigned delivery records" on public.delivery_records for select
using (
  public.current_role() = 'rider'
  and rider_id in (select id from public.riders where auth_user_id = auth.uid())
);

drop policy if exists "riders update assigned delivery records" on public.delivery_records;
create policy "riders update assigned delivery records" on public.delivery_records for update
using (
  public.current_role() = 'rider'
  and rider_id in (select id from public.riders where auth_user_id = auth.uid())
)
with check (
  public.current_role() = 'rider'
  and rider_id in (select id from public.riders where auth_user_id = auth.uid())
);

drop policy if exists "riders read related customers by deliveries" on public.customers;
create policy "riders read related customers by deliveries"
on public.customers
for select
using (
  exists (
    select 1
    from public.delivery_records dr
    join public.riders r on r.id = dr.rider_id
    where dr.customer_id = customers.id
      and r.auth_user_id = auth.uid()
  )
);
