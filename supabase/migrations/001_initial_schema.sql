-- Migration: 001_initial_schema
-- Sajiku UMKM Ordering System

-- 1. Menu Items
create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  price integer not null check (price > 0),
  category varchar(50),
  image_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_menu_items_name on menu_items(name);

-- 2. Users
create table if not exists users (
  id uuid primary key references auth.users(id),
  username varchar(50) not null unique,
  password_hash varchar(255) not null default '',
  role varchar(20) not null check (role in ('penjual', 'kasir')),
  is_active boolean not null default true,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- 3. Orders
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  table_no integer not null check (table_no > 0),
  customer_name varchar(50) not null,
  status varchar(20) not null default 'Baru'
    check (status in ('Baru', 'Diproses', 'Siap', 'Dibayar', 'Dibatalkan')),
  payment_code varchar(10) not null,
  total integer not null check (total >= 0),
  notes text,
  cancelled_at timestamptz,
  cancelled_by uuid references users(id),
  cancel_reason varchar(200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_orders_payment_code on orders(payment_code);
create index if not exists idx_orders_status_created on orders(status, created_at desc);
create index if not exists idx_orders_table on orders(table_no, created_at desc);

-- 4. Order Items
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_id uuid references menu_items(id) on delete set null,
  menu_name varchar(100) not null,
  price integer not null,
  qty integer not null check (qty >= 1),
  subtotal integer not null check (subtotal >= 0)
);

create index if not exists idx_order_items_order on order_items(order_id);

-- 5. Payments (immutable — insert only)
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references orders(id),
  amount integer not null check (amount >= 0),
  paid_at timestamptz not null default now(),
  kasir_id uuid not null references users(id)
);

create index if not exists idx_payments_paid_at on payments(paid_at desc);

-- 6. Enable Row Level Security
alter table menu_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table users enable row level security;

-- 7. RLS Policies

-- Menu Items: public can read available, penjual full access
create policy "Public can view active menu items"
  on menu_items for select
  using (is_available = true);

create policy "Penjual can manage menu items"
  on menu_items for all
  using (
    exists (select 1 from users where users.id = auth.uid() and users.role = 'penjual' and users.is_active = true)
  );

-- Orders: role-based visibility
create policy "Penjual can view all orders"
  on orders for select
  using (
    exists (select 1 from users where users.id = auth.uid() and users.role = 'penjual' and users.is_active = true)
  );

create policy "Kasir can view Siap orders"
  on orders for select
  using (
    exists (select 1 from users where users.id = auth.uid() and users.role = 'kasir' and users.is_active = true)
    and status = 'Siap'
  );

create policy "Public can create orders"
  on orders for insert
  with check (true);

create policy "Penjual can update orders"
  on orders for update
  using (
    exists (select 1 from users where users.id = auth.uid() and users.role = 'penjual' and users.is_active = true)
  );

create policy "Kasir can update orders to Dibayar"
  on orders for update
  using (
    exists (select 1 from users where users.id = auth.uid() and users.role = 'kasir' and users.is_active = true)
    and status = 'Siap'
  );

-- Order Items
create policy "Penjual can view all order items"
  on order_items for select
  using (
    exists (select 1 from users where users.id = auth.uid() and users.role = 'penjual' and users.is_active = true)
  );

create policy "Kasir can view order items for Siap orders"
  on order_items for select
  using (
    exists (select 1 from users where users.id = auth.uid() and users.role = 'kasir' and users.is_active = true)
    and exists (select 1 from orders where orders.id = order_items.order_id and orders.status = 'Siap')
  );

create policy "Public can insert order items"
  on order_items for insert
  with check (true);

-- Payments: kasir can insert, penjual can read
create policy "Kasir can insert payments"
  on payments for insert
  with check (
    exists (select 1 from users where users.id = auth.uid() and users.role = 'kasir' and users.is_active = true)
  );

create policy "Penjual can view payments"
  on payments for select
  using (
    exists (select 1 from users where users.id = auth.uid() and users.role = 'penjual' and users.is_active = true)
  );

-- Users: penjual can manage
create policy "Penjual can manage users"
  on users for all
  using (
    exists (select 1 from users where users.id = auth.uid() and users.role = 'penjual' and users.is_active = true)
  );

-- 8. Enable Realtime for orders
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table payments;
