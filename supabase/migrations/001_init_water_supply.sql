create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'rider');
  end if;
  if not exists (select 1 from pg_type where typname = 'rider_status') then
    create type rider_status as enum ('active', 'inactive');
  end if;
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum ('today', 'assigned', 'delivered', 'pending_payment', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type payment_method as enum ('cash', 'bank_transfer', 'jazzcash', 'easypaisa', 'credit', 'unknown');
  end if;
  if not exists (select 1 from pg_type where typname = 'order_payment_status') then
    create type order_payment_status as enum ('paid', 'partial', 'due', 'verification_pending', 'unpaid');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_record_status') then
    create type payment_record_status as enum ('verified', 'pending_verification', 'rejected', 'received');
  end if;
  if not exists (select 1 from pg_type where typname = 'ledger_entry_type') then
    create type ledger_entry_type as enum ('order', 'payment', 'adjustment');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  role app_role not null,
  full_name text not null,
  phone text,
  rider_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  phone text not null,
  vehicle_number text not null,
  status rider_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  alternate_phone text,
  address text not null,
  area text not null,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  rider_id uuid references public.riders(id) on delete set null,
  bottle_qty integer not null check (bottle_qty > 0),
  delivered_qty integer,
  price_per_bottle numeric(12,2) not null check (price_per_bottle >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  amount_received numeric(12,2) not null default 0,
  due_amount numeric(12,2) not null default 0,
  delivery_date timestamptz not null,
  notes text,
  order_status order_status not null default 'assigned',
  expected_payment_method payment_method not null default 'cash',
  payment_status order_payment_status not null default 'unpaid',
  transaction_reference text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  rider_id uuid references public.riders(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  payment_method payment_method not null,
  payment_status payment_record_status not null default 'received',
  transaction_reference text,
  proof_url text,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  received_at timestamptz not null default timezone('utc', now()),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  entry_type ledger_entry_type not null,
  debit numeric(12,2) not null default 0,
  credit numeric(12,2) not null default 0,
  balance_snapshot numeric(12,2),
  description text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.delivery_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  storage_path text not null,
  public_url text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_orders_customer_id on public.orders(customer_id);
create index if not exists idx_orders_rider_id on public.orders(rider_id);
create index if not exists idx_orders_delivery_date on public.orders(delivery_date);
create index if not exists idx_payments_order_id on public.payments(order_id);
create index if not exists idx_payments_customer_id on public.payments(customer_id);
create index if not exists idx_ledger_entries_customer_id on public.ledger_entries(customer_id);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists trg_riders_updated_at on public.riders;
create trigger trg_riders_updated_at before update on public.riders for each row execute procedure public.set_updated_at();
drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at before update on public.customers for each row execute procedure public.set_updated_at();
drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at before update on public.orders for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.riders enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.delivery_proofs enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_role() from public;
grant execute on function public.current_role() to authenticated;
grant execute on function public.current_role() to anon;

drop policy if exists "admins full access profiles" on public.profiles;
create policy "admins full access profiles" on public.profiles for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "rider own profile" on public.profiles;
create policy "rider own profile" on public.profiles for select
using (auth_user_id = auth.uid());

drop policy if exists "admins full access riders" on public.riders;
create policy "admins full access riders" on public.riders for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "riders own row" on public.riders;
create policy "riders own row" on public.riders for select
using (auth_user_id = auth.uid());

drop policy if exists "admins full access customers" on public.customers;
create policy "admins full access customers" on public.customers for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "admins full access orders" on public.orders;
create policy "admins full access orders" on public.orders for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "riders assigned orders" on public.orders;
create policy "riders assigned orders" on public.orders for select
using (
  public.current_role() = 'rider'
  and rider_id in (select id from public.riders where auth_user_id = auth.uid())
);

drop policy if exists "riders update assigned orders" on public.orders;
create policy "riders update assigned orders" on public.orders for update
using (
  public.current_role() = 'rider'
  and rider_id in (select id from public.riders where auth_user_id = auth.uid())
);

drop policy if exists "admins full access payments" on public.payments;
create policy "admins full access payments" on public.payments for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "riders insert payments" on public.payments;
create policy "riders insert payments" on public.payments for insert
with check (
  public.current_role() = 'rider'
  and rider_id in (select id from public.riders where auth_user_id = auth.uid())
);

drop policy if exists "riders read own payments" on public.payments;
create policy "riders read own payments" on public.payments for select
using (
  public.current_role() = 'rider'
  and rider_id in (select id from public.riders where auth_user_id = auth.uid())
);

drop policy if exists "admins full access ledger_entries" on public.ledger_entries;
create policy "admins full access ledger_entries" on public.ledger_entries for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "admins full access delivery_proofs" on public.delivery_proofs;
create policy "admins full access delivery_proofs" on public.delivery_proofs for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "riders insert delivery_proofs" on public.delivery_proofs;
create policy "riders insert delivery_proofs" on public.delivery_proofs for insert
with check (public.current_role() = 'rider');

drop policy if exists "admins full access audit_logs" on public.audit_logs;
create policy "admins full access audit_logs" on public.audit_logs for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');
