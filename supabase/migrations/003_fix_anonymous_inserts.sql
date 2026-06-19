-- Fix: anonymous users cannot INSERT into orders/order_items
-- The `anon` role lacks base INSERT privilege on these tables.
-- Even though RLS policies with `with check (true)` exist,
-- PostgREST still requires table-level INSERT grant for the role.

grant insert on public.orders to anon;
grant insert on public.order_items to anon;
