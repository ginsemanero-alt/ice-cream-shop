# Ice Cream Shop

Mobile-first storefront + protected admin dashboard for a small Philippine ice cream seller.
React + Vite + TypeScript · Tailwind CSS · Framer Motion · Lucide · React Router · Recharts · Supabase (auth, Postgres, storage).

No products, prices, flavors, reviews, contact details or sales are pre-filled. The owner enters everything through the admin dashboard. Until then the site shows clean empty states and a "Backend not configured" notice when Supabase is missing.

## Quick start

```bash
npm install
cp .env.example .env      # then fill in the two values (see below)
npm run dev
```

Other scripts: `npm run build` (typecheck + production build), `npm run lint`, `npm run preview`.

## Supabase setup (required for products, orders, admin)

1. Create a project at https://supabase.com.
2. **SQL editor** → paste and run [0001_schema.sql](supabase/migrations/0001_schema.sql), then [0002_grants.sql](supabase/migrations/0002_grants.sql) (table privileges for the API roles). Together they create the tables, RLS policies, order/stock functions and the `store-assets` storage bucket.
3. **Project Settings → API**: copy the *Project URL* and the *anon public* key into `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   **Never** put the `service_role` key in this project or in any `VITE_*` variable.
4. **Authentication → Providers**: keep Email enabled. Recommended: turn **off** "Allow new users to sign up" once your admin account exists (customers do not need accounts).
5. Restart `npm run dev`.

### Create the first admin (no default account exists)

1. Open the Supabase dashboard → **Authentication → Users → Add user**, create your email + a strong password (or sign up once, then confirm the email).
2. In the SQL editor, promote that user:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

3. Go to `/admin/login` and sign in.

### First-time shop setup (in the admin)

Settings → set business name, contact info, enable **pickup and/or delivery**, enable at least one **payment method** (none are enabled by default; customers cannot check out until you do), then add products. Optionally switch on inventory tracking.

## Features implemented

**Storefront:** editable hero/about/instructions/contact (all from Store Settings), featured + all products, product detail modal, quantity selector, search (when the catalog is larger than 6 items), cart drawer with stock validation, checkout with validation, order confirmation, order tracking (reference **and** phone number required), About, Contact, mobile nav, toasts, empty/loading/error states.

**Admin (`/admin`):** overview with real counts and a setup checklist, products (add/edit/archive/restore, image upload, availability, featured), orders (search, status filter, detail, valid status transitions only, payment marked paid only by an admin, status history), inventory (adjust/restock, stock history, low-stock warnings), reports (date range, day/week/month grouping, chart, top products, CSV export), store settings (brand, logo, hero + gallery images, contact, hours, payment/fulfilment methods, delivery fee, currency, inventory toggle).

**Database/security:**
- Orders are created only by the `place_order` function (single transaction): it re-reads prices from `products`, checks that the chosen fulfilment/payment method is enabled, locks rows, validates and deducts stock when tracking is on, snapshots name/price into `order_items`. Browser-sent prices/totals are never trusted.
- `update_order_status`, `set_order_payment`, `adjust_stock` check `is_admin()` inside the database. Cancelling returns deducted stock. `stock_quantity` cannot be edited directly (trigger-guarded), so every change has an `inventory_movements` row.
- RLS: public can read store settings and non-archived products; orders, items, history, movements and profiles are admin-only (users can read their own profile). Users cannot change their own role. Products are archived, never hard-deleted. Storage writes are admin-only.
- Revenue is labelled "Sales" (ordered value) and "Revenue received" (marked paid). Profit is never shown because costs aren't recorded.

**Design/UX:** cream/caramel/milk-chocolate/dusty-pink palette as Tailwind tokens, large rounded cards, cup-shaped SVG motifs, Framer Motion entrances/hover/drawer/page transitions/scroll reveals, `prefers-reduced-motion` respected, labels/focus rings/skip link/alt text.

The reference photo is at `public/assets/reference-photo.jpg`, used only as a brightened "From our kitchen" hero image until you upload a hero image in Settings. No flavor/size/price is attached to it.

## What still needs configuring

- Supabase project, migration, `.env`, first admin (above).
- All shop content in Admin → Settings (name, logo, about, contact, hours, payment instructions, hero/gallery photos).
- Products with real photos, prices, and (optionally) stock.
- Not built (out of scope / not needed yet): product variants/sizes, online payment gateways (payments are manual; orders stay "unpaid" until you verify), customer accounts, email/SMS notifications, production hosting config (deploy `dist/` to any static host with an SPA fallback to `index.html`).

## Project layout

```
src/components  shared UI, layout, cart drawer, product card/modal
src/pages       storefront pages
src/admin       admin shell + pages (lazy-loaded)
src/hooks       settings, catalog, cart, auth, toast contexts
src/lib         supabase client, API calls, formatting, validation
src/types       shared types
supabase/migrations  SQL schema, functions, RLS, storage
```
