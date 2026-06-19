-- Fix: infinite recursion in RLS policies
-- The issue was that subqueries on `users` table triggered RLS on `users`,
-- which itself referenced `users`, causing infinite recursion.
-- Fix: use auth.jwt() to read role directly from JWT metadata

-- Helper function to get current user's role from JWT metadata
create or replace function public.user_role() returns text
language sql stable
as $$
  select coalesce(
    current_setting('request.jwt.claims', true)::jsonb #>> '{user_metadata,role}',
    ''
  );
$$;

create or replace function public.is_penjual() returns boolean
language sql stable
as $$
  select public.user_role() = 'penjual';
$$;

create or replace function public.is_kasir() returns boolean
language sql stable
as $$
  select public.user_role() = 'kasir';
$$;

-- Drop all existing policies that cause recursion
drop policy if exists "Public can view active menu items" on menu_items;
drop policy if exists "Penjual can manage menu items" on menu_items;
drop policy if exists "Penjual can view all orders" on orders;
drop policy if exists "Kasir can view Siap orders" on orders;
drop policy if exists "Public can create orders" on orders;
drop policy if exists "Penjual can update orders" on orders;
drop policy if exists "Kasir can update orders to Dibayar" on orders;
drop policy if exists "Penjual can view all order items" on order_items;
drop policy if exists "Kasir can view order items for Siap orders" on order_items;
drop policy if exists "Public can insert order items" on order_items;
drop policy if exists "Kasir can insert payments" on payments;
drop policy if exists "Penjual can view payments" on payments;
drop policy if exists "Penjual can manage users" on users;

-- Recreate all policies using JWT metadata instead of users table subquery

-- Menu Items: public can read available, penjual full access
create policy "Public can view active menu items"
  on menu_items for select
  using (is_available = true);

create policy "Penjual can manage menu items"
  on menu_items for all
  using (public.is_penjual());

-- Orders: role-based visibility
create policy "Penjual can view all orders"
  on orders for select
  using (public.is_penjual());

create policy "Kasir can view Siap orders"
  on orders for select
  using (public.is_kasir() and status = 'Siap');

create policy "Public can create orders"
  on orders for insert
  with check (true);

create policy "Penjual can update orders"
  on orders for update
  using (public.is_penjual());

create policy "Kasir can update orders to Dibayar"
  on orders for update
  using (public.is_kasir() and status = 'Siap');

-- Order Items
create policy "Penjual can view all order items"
  on order_items for select
  using (public.is_penjual());

create policy "Kasir can view order items for Siap orders"
  on order_items for select
  using (public.is_kasir()
    and exists (select 1 from orders where orders.id = order_items.order_id and orders.status = 'Siap'));

create policy "Public can insert order items"
  on order_items for insert
  with check (true);

-- Payments: kasir can insert, penjual can read
create policy "Kasir can insert payments"
  on payments for insert
  with check (public.is_kasir());

create policy "Penjual can view payments"
  on payments for select
  using (public.is_penjual());

-- Users: penjual can manage
create policy "Penjual can manage users"
  on users for all
  using (public.is_penjual());
