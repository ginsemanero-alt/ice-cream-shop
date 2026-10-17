-- =====================================================================
-- Ice Cream Shop: schema, business rules (RPC), and Row Level Security
-- Run in the Supabase SQL editor (or `supabase db push`).
-- =====================================================================

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Everyone starts as a customer. Admins are promoted manually (see README).
  insert into public.profiles (id, email, role) values (new.id, new.email, 'customer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- store_settings (single row) ----------
create table public.store_settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default '',
  tagline text not null default '',
  logo_url text,
  hero_title text not null default '',
  hero_subtitle text not null default '',
  hero_image_url text,
  gallery_urls text[] not null default '{}',
  about text not null default '',
  ordering_instructions text not null default '',
  contact_phone text not null default '',
  contact_email text not null default '',
  address text not null default '',
  facebook_url text not null default '',
  messenger_url text not null default '',
  instagram_url text not null default '',
  operating_hours text not null default '',
  currency_code text not null default 'PHP',
  currency_symbol text not null default '₱',
  inventory_tracking boolean not null default false,
  low_stock_threshold int not null default 5 check (low_stock_threshold >= 0),
  pickup_enabled boolean not null default false,
  delivery_enabled boolean not null default false,
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  -- array of {id, label, enabled, instructions}; none enabled by default
  payment_methods jsonb not null default '[
    {"id":"cash","label":"Cash on pickup / delivery","enabled":false,"instructions":""},
    {"id":"gcash","label":"GCash","enabled":false,"instructions":""},
    {"id":"bank_transfer","label":"Bank transfer","enabled":false,"instructions":""}
  ]'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.store_settings (id) values (1);

-- ---------- products ----------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  price numeric(12,2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  is_featured boolean not null default false,
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_active_idx on public.products (archived_at, created_at desc);

-- stock_quantity may only change through the stock RPCs (so every change is recorded)
create or replace function public.guard_product_stock()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.stock_rpc', true), '') <> 'on' then
    if tg_op = 'INSERT' then
      new.stock_quantity := 0;
    elsif new.stock_quantity is distinct from old.stock_quantity then
      raise exception 'Stock can only be changed through adjust_stock()';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_guard_stock
  before insert or update on public.products
  for each row execute function public.guard_product_stock();

-- ---------- orders ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    default ('IC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  status text not null default 'pending'
    check (status in ('pending','confirmed','preparing','ready','completed','cancelled')),
  fulfillment_method text not null check (fulfillment_method in ('pickup','delivery')),
  payment_method text not null,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid')),
  customer_name text not null check (char_length(btrim(customer_name)) between 1 and 100),
  customer_phone text not null check (customer_phone ~ '^[0-9+() -]{7,20}$'),
  delivery_address text check (delivery_address is null or char_length(delivery_address) <= 300),
  notes text check (notes is null or char_length(notes) <= 500),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  total numeric(12,2) not null check (total >= 0),
  stock_deducted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fulfillment_method <> 'delivery' or (delivery_address is not null and btrim(delivery_address) <> ''))
);
create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,          -- snapshot
  unit_price numeric(12,2) not null check (unit_price >= 0),  -- snapshot
  quantity int not null check (quantity between 1 and 99),
  line_total numeric(12,2) not null check (line_total >= 0)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_history_order_idx on public.order_status_history (order_id, created_at);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  change int not null check (change <> 0),
  resulting_stock int not null check (resulting_stock >= 0),
  reason text not null check (reason in ('order','cancellation','restock','adjustment')),
  note text check (note is null or char_length(note) <= 300),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index inv_mov_product_idx on public.inventory_movements (product_id, created_at desc);

-- =====================================================================
-- RPC: place_order  (the ONLY way customers create orders)
-- Prices, totals, stock and enabled methods are all checked server-side.
-- =====================================================================
create or replace function public.place_order(
  p_customer_name text,
  p_customer_phone text,
  p_fulfillment_method text,
  p_payment_method text,
  p_delivery_address text,
  p_notes text,
  p_items jsonb
)
returns table (order_reference text, order_status text, order_total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.store_settings%rowtype;
  v_order public.orders%rowtype;
  v_item record;
  v_prod public.products%rowtype;
  v_subtotal numeric(12,2) := 0;
  v_fee numeric(12,2) := 0;
  v_pay_ok boolean;
begin
  select * into s from public.store_settings where id = 1;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty.';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Too many items in one order.';
  end if;
  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'Name is required.';
  end if;
  if p_customer_phone is null or p_customer_phone !~ '^[0-9+() -]{7,20}$' then
    raise exception 'Please enter a valid phone number.';
  end if;

  if p_fulfillment_method = 'pickup' then
    if not s.pickup_enabled then raise exception 'Pickup is not available.'; end if;
  elsif p_fulfillment_method = 'delivery' then
    if not s.delivery_enabled then raise exception 'Delivery is not available.'; end if;
    if p_delivery_address is null or btrim(p_delivery_address) = '' then
      raise exception 'Delivery address is required.';
    end if;
    v_fee := s.delivery_fee;
  else
    raise exception 'Invalid ordering method.';
  end if;

  select exists (
    select 1 from jsonb_array_elements(s.payment_methods) m
    where m->>'id' = p_payment_method and coalesce((m->>'enabled')::boolean, false)
  ) into v_pay_ok;
  if not v_pay_ok then raise exception 'That payment method is not available.'; end if;

  insert into public.orders (fulfillment_method, payment_method, customer_name, customer_phone,
                             delivery_address, notes, subtotal, delivery_fee, total)
  values (p_fulfillment_method, p_payment_method, btrim(p_customer_name), btrim(p_customer_phone),
          nullif(btrim(coalesce(p_delivery_address, '')), ''),
          nullif(btrim(coalesce(p_notes, '')), ''), 0, v_fee, 0)
  returning * into v_order;

  for v_item in
    select (e->>'product_id')::uuid as product_id, sum((e->>'quantity')::int)::int as qty
      from jsonb_array_elements(p_items) e
     group by 1 order by 1
  loop
    if v_item.product_id is null or v_item.qty < 1 or v_item.qty > 99 then
      raise exception 'Invalid quantity.';
    end if;
    select * into v_prod from public.products where id = v_item.product_id for update;
    if not found or v_prod.archived_at is not null then
      raise exception 'A product in your cart is no longer available.';
    end if;
    if not v_prod.is_available then
      raise exception '% is currently unavailable.', v_prod.name;
    end if;
    if s.inventory_tracking then
      if v_prod.stock_quantity < v_item.qty then
        raise exception 'Not enough stock for % (only % left).', v_prod.name, v_prod.stock_quantity;
      end if;
      perform set_config('app.stock_rpc', 'on', true);
      update public.products set stock_quantity = stock_quantity - v_item.qty where id = v_prod.id;
      insert into public.inventory_movements (product_id, order_id, change, resulting_stock, reason)
      values (v_prod.id, v_order.id, -v_item.qty, v_prod.stock_quantity - v_item.qty, 'order');
    end if;

    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
    values (v_order.id, v_prod.id, v_prod.name, v_prod.price, v_item.qty, v_prod.price * v_item.qty);
    v_subtotal := v_subtotal + v_prod.price * v_item.qty;
  end loop;

  update public.orders
     set subtotal = v_subtotal, total = v_subtotal + v_fee, stock_deducted = s.inventory_tracking
   where id = v_order.id
   returning * into v_order;

  insert into public.order_status_history (order_id, from_status, to_status)
  values (v_order.id, null, 'pending');

  return query select v_order.reference, v_order.status, v_order.total;
end;
$$;

-- =====================================================================
-- RPC: get_order_status (customer lookup by reference + phone)
-- =====================================================================
create or replace function public.get_order_status(p_reference text, p_phone text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders
   where reference = upper(btrim(p_reference))
     and regexp_replace(customer_phone, '[^0-9]', '', 'g') = regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if not found then return null; end if;
  return jsonb_build_object(
    'reference', o.reference,
    'status', o.status,
    'payment_status', o.payment_status,
    'fulfillment_method', o.fulfillment_method,
    'payment_method', o.payment_method,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'total', o.total,
    'created_at', o.created_at,
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
        'product_name', i.product_name, 'unit_price', i.unit_price,
        'quantity', i.quantity, 'line_total', i.line_total)), '[]'::jsonb)
      from public.order_items i where i.order_id = o.id)
  );
end;
$$;

-- =====================================================================
-- Admin RPCs
-- =====================================================================
create or replace function public.update_order_status(p_order_id uuid, p_new_status text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  m record;
  v_stock int;
begin
  if not public.is_admin() then raise exception 'Not authorized.'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found.'; end if;

  if not (
    (o.status = 'pending'   and p_new_status in ('confirmed','cancelled')) or
    (o.status = 'confirmed' and p_new_status in ('preparing','ready','cancelled')) or
    (o.status = 'preparing' and p_new_status in ('ready','cancelled')) or
    (o.status = 'ready'     and p_new_status in ('completed','cancelled'))
  ) then
    raise exception 'Cannot change an order from % to %.', o.status, p_new_status;
  end if;

  if p_new_status = 'cancelled' and o.stock_deducted then
    perform set_config('app.stock_rpc', 'on', true);
    for m in select product_id, sum(-change)::int as qty from public.inventory_movements
             where order_id = o.id and reason = 'order' group by product_id loop
      if m.product_id is not null then
        update public.products set stock_quantity = stock_quantity + m.qty
         where id = m.product_id returning stock_quantity into v_stock;
        insert into public.inventory_movements (product_id, order_id, change, resulting_stock, reason, created_by)
        values (m.product_id, o.id, m.qty, v_stock, 'cancellation', auth.uid());
      end if;
    end loop;
    o.stock_deducted := false;
  end if;

  update public.orders set status = p_new_status, stock_deducted = o.stock_deducted, updated_at = now()
   where id = o.id returning * into o;
  insert into public.order_status_history (order_id, from_status, to_status, changed_by)
  values (o.id, (select status from public.order_status_history where order_id = o.id order by created_at desc limit 1), p_new_status, auth.uid());
  return o;
end;
$$;

-- Payment is only ever marked paid by an admin who has verified it.
create or replace function public.set_order_payment(p_order_id uuid, p_paid boolean)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare o public.orders%rowtype;
begin
  if not public.is_admin() then raise exception 'Not authorized.'; end if;
  update public.orders
     set payment_status = case when p_paid then 'paid' else 'unpaid' end, updated_at = now()
   where id = p_order_id returning * into o;
  if not found then raise exception 'Order not found.'; end if;
  return o;
end;
$$;

create or replace function public.adjust_stock(
  p_product_id uuid, p_change int, p_reason text, p_note text default null
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare p public.products%rowtype;
begin
  if not public.is_admin() then raise exception 'Not authorized.'; end if;
  if p_reason not in ('restock','adjustment') then raise exception 'Invalid reason.'; end if;
  if p_change is null or p_change = 0 then raise exception 'Change must not be zero.'; end if;
  select * into p from public.products where id = p_product_id for update;
  if not found then raise exception 'Product not found.'; end if;
  if p.stock_quantity + p_change < 0 then
    raise exception 'Stock cannot go below zero (currently %).', p.stock_quantity;
  end if;
  perform set_config('app.stock_rpc', 'on', true);
  update public.products set stock_quantity = stock_quantity + p_change where id = p.id returning * into p;
  insert into public.inventory_movements (product_id, change, resulting_stock, reason, note, created_by)
  values (p.id, p_change, p.stock_quantity, p_reason, nullif(btrim(coalesce(p_note, '')), ''), auth.uid());
  return p;
end;
$$;

-- keep settings.updated_at fresh
create or replace function public.touch_settings()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger store_settings_touch before update on public.store_settings
  for each row execute function public.touch_settings();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.store_settings enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.inventory_movements enable row level security;

-- profiles: read own; admins read all. No client updates (role can't be self-promoted).
create policy "profiles read own" on public.profiles for select using (id = auth.uid());
create policy "profiles admin read" on public.profiles for select using (public.is_admin());

-- store settings: public read (contains only public shop info), admin write
create policy "settings public read" on public.store_settings for select using (true);
create policy "settings admin update" on public.store_settings for update
  using (public.is_admin()) with check (public.is_admin());

-- products: public sees active only; admins manage everything
create policy "products public read" on public.products for select
  using (archived_at is null or public.is_admin());
create policy "products admin insert" on public.products for insert with check (public.is_admin());
create policy "products admin update" on public.products for update
  using (public.is_admin()) with check (public.is_admin());
-- no delete policy: products are archived, never hard-deleted (keeps order history intact)

-- orders & related: admin only. Customers use place_order / get_order_status RPCs.
create policy "orders admin read" on public.orders for select using (public.is_admin());
create policy "order_items admin read" on public.order_items for select using (public.is_admin());
create policy "order_history admin read" on public.order_status_history for select using (public.is_admin());
create policy "inventory admin read" on public.inventory_movements for select using (public.is_admin());

-- Function privileges
revoke all on function public.place_order(text,text,text,text,text,text,jsonb) from public;
revoke all on function public.get_order_status(text,text) from public;
revoke all on function public.update_order_status(uuid,text) from public;
revoke all on function public.set_order_payment(uuid,boolean) from public;
revoke all on function public.adjust_stock(uuid,int,text,text) from public;
grant execute on function public.place_order(text,text,text,text,text,text,jsonb) to anon, authenticated;
grant execute on function public.get_order_status(text,text) to anon, authenticated;
grant execute on function public.update_order_status(uuid,text) to authenticated;
grant execute on function public.set_order_payment(uuid,boolean) to authenticated;
grant execute on function public.adjust_stock(uuid,int,text,text) to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- =====================================================================
-- Storage: public bucket for shop images, admin-only writes
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-assets', 'store-assets', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "store assets public read" on storage.objects for select
  using (bucket_id = 'store-assets');
create policy "store assets admin insert" on storage.objects for insert
  with check (bucket_id = 'store-assets' and public.is_admin());
create policy "store assets admin update" on storage.objects for update
  using (bucket_id = 'store-assets' and public.is_admin());
create policy "store assets admin delete" on storage.objects for delete
  using (bucket_id = 'store-assets' and public.is_admin());
