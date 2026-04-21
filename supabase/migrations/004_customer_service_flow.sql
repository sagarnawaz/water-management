alter table public.customers
  add column if not exists daily_bottle_qty integer not null default 1,
  add column if not exists price_per_bottle numeric(12,2) not null default 180,
  add column if not exists default_payment_method payment_method not null default 'cash',
  add column if not exists assigned_rider_id uuid references public.riders(id) on delete set null,
  add column if not exists billing_month date not null default current_date,
  add column if not exists service_start_date date not null default current_date,
  add column if not exists service_end_date date not null default current_date,
  add column if not exists activated_at timestamptz;

alter table public.orders
  add column if not exists service_day date,
  add column if not exists is_subscription_order boolean not null default false;

create index if not exists idx_customers_assigned_rider_id on public.customers(assigned_rider_id);
create index if not exists idx_orders_service_day on public.orders(service_day);
create unique index if not exists idx_orders_customer_service_day_unique
  on public.orders(customer_id, service_day);
