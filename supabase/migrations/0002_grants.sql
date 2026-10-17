-- Newer Supabase projects do not auto-grant table privileges to the API roles.
-- RLS policies (0001) still decide which rows each role can actually touch.
grant usage on schema public to anon, authenticated;

grant select on public.store_settings, public.products to anon;

grant select on public.store_settings, public.products, public.profiles,
  public.orders, public.order_items, public.order_status_history, public.inventory_movements
  to authenticated;
grant insert, update on public.products to authenticated;
grant update on public.store_settings to authenticated;
