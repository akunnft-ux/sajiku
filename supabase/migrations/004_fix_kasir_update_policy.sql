-- Fix: Kasir UPDATE policy rejects status change to 'Dibayar'
-- The `with check` clause was missing, so PostgreSQL defaulted it to the
-- `using` expression which requires status = 'Siap' on the new row too.
-- Adding explicit `with check` that allows the new row to have status = 'Dibayar'.

drop policy if exists "Kasir can update orders to Dibayar" on orders;

create policy "Kasir can update orders to Dibayar"
  on orders for update
  using (public.is_kasir() and status = 'Siap')
  with check (public.is_kasir() and status = 'Dibayar');
