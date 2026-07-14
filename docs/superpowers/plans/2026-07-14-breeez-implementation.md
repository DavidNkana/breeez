# Breeez — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Breeez v1 — a cross-platform (web + iOS + Android) South African ecommerce app — through one Next.js codebase wrapped with Capacitor, backed by Supabase, deployable to Vercel free tier, with PayFast + Yoco + Ozow payments and Pargo + The Courier Guy + Dawn Wing shipping.

**Architecture:** Single Next.js 14 (App Router) frontend codebase, Capacitor-wrapped for native stores, Supabase (Postgres + Auth + Storage + Edge Functions) for backend, Tailwind for styling, Vercel free tier for web hosting, Expo EAS for cloud iOS/Android builds.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind 3, Supabase (Postgres + Auth + Storage + Edge Functions + Studio), Capacitor 6, Zustand (cart state), Resend (email), PostHog (analytics), PayFast + Yoco + Ozow (payments), Pargo + The Courier Guy + Dawn Wing (shipping).

**Spec:** `docs/superpowers/specs/2026-07-14-breeez-design.md` (canonical source of truth for all decisions).

---

## File Structure

```
/home/safai/breeez/
├── app/                                # Next.js App Router
│   ├── layout.tsx                      # root layout (DONE — scaffolding)
│   ├── page.tsx                        # home (DONE — scaffolding)
│   ├── globals.css                     # tailwind + base styles (DONE)
│   ├── c/[slug]/page.tsx               # PLP placeholder (DONE — Task 9 fleshes out)
│   ├── p/[slug]/page.tsx               # PDP placeholder (DONE — Task 10 fleshes out)
│   ├── search/page.tsx                 # search placeholder (DONE — Task 11 fleshes out)
│   ├── cart/page.tsx                   # cart page placeholder (DONE — Task 14 fleshes out)
│   ├── checkout/
│   │   ├── page.tsx                    # checkout placeholder (DONE — Task 17 fleshes out)
│   │   └── success/[order]/page.tsx    # post-checkout confirmation (Task 17)
│   ├── account/
│   │   ├── page.tsx                    # account dashboard placeholder (DONE — Task 13)
│   │   ├── orders/page.tsx             # order history (Task 13)
│   │   ├── orders/[id]/page.tsx        # order detail (Task 13)
│   │   ├── addresses/page.tsx          # address book (Task 13)
│   │   └── wishlist/page.tsx           # wishlist (Task 13)
│   ├── auth/
│   │   ├── login/page.tsx              # login placeholder (DONE — Task 12)
│   │   ├── register/page.tsx           # register placeholder (DONE — Task 12)
│   │   └── reset/page.tsx              # password reset (Task 12)
│   ├── admin/
│   │   ├── layout.tsx                  # admin layout + auth guard (Task 21)
│   │   ├── page.tsx                    # admin dashboard (Task 21)
│   │   ├── products/page.tsx           # product list (Task 21)
│   │   ├── products/new/page.tsx       # add product (Task 21)
│   │   ├── products/[id]/page.tsx      # edit product (Task 21)
│   │   ├── products/import/page.tsx    # CSV import (Task 21)
│   │   ├── categories/page.tsx         # category CRUD (Task 21)
│   │   ├── orders/page.tsx             # order list (Task 21)
│   │   ├── orders/[id]/page.tsx        # order detail (Task 21)
│   │   ├── discounts/page.tsx          # discount CRUD (Task 21)
│   │   └── returns/page.tsx            # returns processing (Task 21)
│   ├── legal/
│   │   ├── terms/page.tsx              # placeholder (DONE — Task 22 fleshes out)
│   │   ├── privacy/page.tsx            # placeholder (DONE — Task 22)
│   │   └── returns/page.tsx            # 7-day returns copy (DONE — Task 22)
│   └── api/
│       ├── auth/callback/route.ts      # Supabase auth code exchange (Task 12)
│       ├── checkout/quote/route.ts     # shipping quote (Task 17)
│       ├── checkout/place/route.ts     # place order RPC call (Task 17)
│       └── webhooks/
│           ├── payfast/route.ts        # PayFast ITN callback (Task 18)
│           ├── yoco/route.ts           # Yoco webhook (Task 18)
│           └── shipping/[provider]/route.ts  # courier status webhooks (Task 19)
├── components/
│   ├── layout/
│   │   ├── Header.tsx                  # DONE
│   │   └── Footer.tsx                  # DONE
│   ├── shop/
│   │   ├── CategoryGrid.tsx            # DONE
│   │   ├── ProductCard.tsx             # DONE
│   │   ├── CartButton.tsx              # DONE
│   │   ├── CartDrawer.tsx              # slide-out cart (Task 14)
│   │   ├── FilterSidebar.tsx           # PLP filters (Task 9)
│   │   ├── ProductGallery.tsx          # PDP image gallery (Task 10)
│   │   ├── VariantPicker.tsx           # PDP variant select (Task 10)
│   │   ├── AddToCartButton.tsx         # wired to cart store (Task 14)
│   │   ├── PriceDisplay.tsx            # R-currency + sale badge (Task 14)
│   │   ├── QuantityStepper.tsx         # +/- qty (Task 14)
│   │   ├── SearchBar.tsx               # header search (Task 11)
│   │   ├── SearchResults.tsx           # search results list (Task 11)
│   │   └── BottomNav.tsx               # mobile bottom nav (Task 16)
│   ├── ui/
│   │   ├── Button.tsx                  # primary/secondary/ghost (Task 4)
│   │   ├── Input.tsx                   # text input (Task 4)
│   │   ├── Select.tsx                  # dropdown (Task 4)
│   │   ├── Drawer.tsx                  # slide-over panel (Task 4)
│   │   ├── Modal.tsx                   # centred modal (Task 4)
│   │   ├── Toast.tsx                   # notifications (Task 4)
│   │   ├── Spinner.tsx                 # loading spinner (Task 4)
│   │   ├── Badge.tsx                   # SALE / NEW / OOS (Task 4)
│   │   ├── Skeleton.tsx                # loading placeholder (Task 4)
│   │   ├── EmptyState.tsx              # "no items" state (Task 4)
│   │   └── ErrorState.tsx              # error fallback (Task 4)
│   ├── admin/
│   │   ├── ProductForm.tsx             # product create/edit (Task 21)
│   │   ├── VariantEditor.tsx           # variant rows (Task 21)
│   │   ├── ImageUploader.tsx           # Supabase Storage upload (Task 21)
│   │   ├── OrderTable.tsx              # orders list (Task 21)
│   │   ├── OrderActions.tsx            # mark shipped, refund (Task 21)
│   │   ├── ReturnsTable.tsx            # returns queue (Task 21)
│   │   └── CsvImporter.tsx             # CSV upload + parse (Task 21)
│   └── checkout/
│       ├── EmailStep.tsx               # checkout step 1 (Task 17)
│       ├── AddressStep.tsx             # checkout step 2 (Task 17)
│       ├── ShippingStep.tsx            # checkout step 3 (Task 17)
│       ├── PaymentStep.tsx             # checkout step 4 (Task 17)
│       └── OrderSummary.tsx            # right-side cart summary (Task 17)
├── lib/
│   ├── format.ts                       # DONE — formatRand
│   ├── supabase/
│   │   ├── client.ts                   # browser client (Task 5)
│   │   ├── server.ts                   # server client (Task 5)
│   │   ├── admin.ts                    # service-role client (Task 5)
│   │   └── types.ts                    # generated DB types (Task 5)
│   ├── auth/
│   │   ├── session.ts                  # getSession() helper (Task 12)
│   │   └── guard.ts                    # requireAdmin() helper (Task 12)
│   ├── cart/
│   │   └── store.ts                    # DONE — Zustand store
│   ├── catalog/
│   │   ├── queries.ts                  # getProduct, listProducts, search (Task 8)
│   │   └── filters.ts                  # filter parsing (Task 9)
│   ├── checkout/
│   │   ├── pricing.ts                  # subtotal/total calc (Task 17)
│   │   └── order-number.ts             # BRZ-YYYY-NNNNN (Task 17)
│   ├── shipping/
│   │   ├── pargo.ts                    # Pargo adapter (Task 19)
│   │   ├── tcg.ts                      # The Courier Guy adapter (Task 19)
│   │   ├── dawn-wing.ts                # Dawn Wing adapter (Task 19)
│   │   └── quote.ts                    # unified quote() (Task 19)
│   ├── payments/
│   │   ├── payfast.ts                  # PayFast client (Task 18)
│   │   ├── yoco.ts                     # Yoco client (Task 18)
│   │   └── ozow.ts                     # Ozow client (Task 18)
│   └── email/
│       ├── resend.ts                   # Resend client (Task 20)
│       └── templates/                  # React Email templates (Task 20)
├── supabase/
│   ├── config.toml                     # DONE
│   └── migrations/
│       ├── 001_init.sql                # DONE — full schema + RLS + place_order RPC
│       └── 002_seed_categories.sql     # DONE — 10 categories
├── public/                             # static assets (favicon, OG image, etc.)
├── android/                            # Capacitor-generated (Task 23)
├── ios/                                # Capacitor-generated (Task 24)
├── tests/                              # Playwright E2E + Vitest unit (Task 6)
├── docs/                               # DONE — design spec
├── package.json                        # DONE
├── tsconfig.json                       # DONE
├── next.config.mjs                     # DONE
├── tailwind.config.ts                  # DONE
├── postcss.config.js                   # DONE
├── capacitor.config.ts                 # DONE
├── .env.example                        # DONE
├── .eslintrc.json                      # DONE
├── .gitignore                          # DONE
└── README.md                           # DONE — links to spec
```

---

## Phase 0 — Repo + Spec (DONE in initial scaffold)

- [x] Task 0.1: Git repo initialised, pushed to github.com/DavidNkana/breeez
- [x] Task 0.2: Design spec written + pushed
- [x] Task 0.3: Scaffolding (package.json, configs, layout, home, header, footer, category grid, product card, cart store, format util, env example, gitignore)
- [x] Task 0.4: Supabase migrations (001_init.sql + 002_seed_categories.sql) + config.toml

---

## Phase 1 — Foundation (the boring-but-critical setup)

### Task 1: Install dependencies and verify dev server boots

**Files:**
- Modify: `package.json` (DONE — list of deps already correct)
- Create: `next-env.d.ts` (auto-generated on first `next dev`)

- [ ] **Step 1: cd into the project and install**

```bash
cd /home/safai/breeez
npm install
```

Expected: `node_modules/` populated. No errors.

- [ ] **Step 2: Start the dev server**

```bash
cd /home/safai/breeez
npm run dev
```

Expected: `▲ Next.js 14.x.x` line printed. `- Local: http://localhost:3000` available.

- [ ] **Step 3: Curl the homepage to confirm it serves**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
```

Expected: `200`

- [ ] **Step 4: Typecheck**

```bash
cd /home/safai/breeez
npm run typecheck
```

Expected: no errors. (If errors, fix import paths.)

- [ ] **Step 5: Commit**

```bash
cd /home/safai/breeez
git add package-lock.json next-env.d.ts
git commit -m "chore: install deps + first typecheck baseline"
git push origin main
```

---

### Task 2: Set up Supabase project (manual Chris step)

**No code changes.** Chris creates a Supabase project + runs migrations.

- [ ] **Step 1: Create Supabase project**

Chris opens https://supabase.com/dashboard, creates new project:
- Name: `breeez`
- Database password: generate strong random (save it somewhere safe)
- Region: pick **closest to SA** → **eu-west-2 (London)** or **eu-west-1 (Ireland)**. Frankfurt (eu-central-1) is also good. Pick whichever is geographically nearest; SA has no Supabase region.

Expected: project ready in ~2 minutes.

- [ ] **Step 2: Copy connection details**

From Supabase dashboard → Project Settings → API:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY` (NEVER prefix with NEXT_PUBLIC_)

- [ ] **Step 3: Create local `.env.local`**

```bash
cd /home/safai/breeez
cp .env.example .env.local
# Edit .env.local with the 3 values above
```

- [ ] **Step 4: Run migrations via Supabase SQL Editor**

Open Supabase dashboard → SQL Editor → New query.

Paste the contents of `supabase/migrations/001_init.sql` → Run. Then `supabase/migrations/002_seed_categories.sql` → Run.

Expected: both complete with `Success. No rows returned`. Tables + RLS + categories visible in Table Editor.

- [ ] **Step 5: Create the public `product-images` storage bucket**

Supabase dashboard → Storage → New bucket:
- Name: `product-images`
- Public bucket: **ON** (so image URLs work without signed URLs)

- [ ] **Step 6: Commit the env example updates if anything was added**

```bash
cd /home/safai/breeez
git status
# If anything modified, commit and push
```

---

### Task 3: Connect Supabase CLI (optional but recommended)

**Files:**
- Modify: `package.json` (add supabase scripts)

- [ ] **Step 1: Install Supabase CLI as dev dep**

```bash
cd /home/safai/breeez
npm install --save-dev supabase
```

- [ ] **Step 2: Link to your remote project**

```bash
cd /home/safai/breeez
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF  # find in dashboard URL
```

- [ ] **Step 3: Add migration scripts to package.json**

Append to `scripts`:

```json
"db:push": "supabase db push",
"db:reset": "supabase db reset",
"gen:types": "supabase gen types typescript --linked > lib/supabase/types.ts"
```

- [ ] **Step 4: Generate TypeScript types from your live schema**

```bash
cd /home/safai/breeez
npm run gen:types
```

Expected: `lib/supabase/types.ts` created with full DB types.

- [ ] **Step 5: Commit**

```bash
cd /home/safai/breeez
git add package.json package-lock.json lib/supabase/types.ts
git commit -m "chore: supabase CLI + generated types"
git push origin main
```

---

### Task 4: Build the UI primitive library

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Input.tsx`
- Create: `components/ui/Select.tsx`
- Create: `components/ui/Drawer.tsx`
- Create: `components/ui/Modal.tsx`
- Create: `components/ui/Toast.tsx`
- Create: `components/ui/Spinner.tsx`
- Create: `components/ui/Badge.tsx`
- Create: `components/ui/Skeleton.tsx`
- Create: `components/ui/EmptyState.tsx`
- Create: `components/ui/ErrorState.tsx`

- [ ] **Step 1: Button** — supports `variant: 'primary' | 'secondary' | 'ghost' | 'danger'`, `size: 'sm' | 'md' | 'lg'`, loading state, full-width, disabled. Uses Tailwind classes from brand palette. Exports both server (default) and `forwardRef`.

- [ ] **Step 2: Input** — text, email, password, tel, number, search. Supports label, helper text, error message, left/right icons.

- [ ] **Step 3: Select** — native `<select>` wrapped with brand styling. Supports options array.

- [ ] **Step 4: Drawer** — slide-out panel from right (cart) or bottom (mobile). Uses `dialog` element + `[open]` attribute. Closes on backdrop click + Escape. Focus trap.

- [ ] **Step 5: Modal** — centred overlay. Same close behaviour as Drawer.

- [ ] **Step 6: Toast** — global toast queue via Zustand store at `lib/ui/toast-store.ts`. Variants: success, info, warning, error. Auto-dismiss after 4s.

- [ ] **Step 7: Spinner** — pure CSS spinner, sizes sm/md/lg, brand colour.

- [ ] **Step 8: Badge** — solid or outlined, colour: brand / accent / success / warning / danger / info.

- [ ] **Step 9: Skeleton** — pulsing grey rectangle. Accepts width/height/rounded.

- [ ] **Step 10: EmptyState** — icon + title + description + optional CTA button.

- [ ] **Step 11: ErrorState** — error icon + title + description + retry button.

- [ ] **Step 12: Test the library renders**

```bash
cd /home/safai/breeez
npm run typecheck
```

Expected: no errors.

- [ ] **Step 13: Commit**

```bash
cd /home/safai/breeez
git add components/ui/
git commit -m "feat(ui): primitive component library"
git push origin main
```

---

### Task 5: Supabase client helpers

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admin.ts`
- Create: `lib/supabase/types.ts` (generated in Task 3)

- [ ] **Step 1: Browser client** (`client.ts`)

```ts
'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';
export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
```

- [ ] **Step 2: Server client** (`server.ts`) — for RSC + route handlers, reads session from cookies.

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';
export const createClient = async () => {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => { try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} }
      }
    }
  );
};
```

- [ ] **Step 3: Admin client** (`admin.ts`) — uses service role, NEVER expose to browser.

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
export const createAdminClient = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
```

- [ ] **Step 4: Typecheck + commit**

```bash
cd /home/safai/breeez
npm run typecheck
git add lib/supabase/
git commit -m "feat(supabase): browser, server, and admin clients"
git push origin main
```

---

### Task 6: Set up testing infrastructure

**Files:**
- Create: `tests/setup.ts`
- Create: `tests/unit/format.test.ts` (smoke test for formatRand)
- Create: `playwright.config.ts`
- Create: `tests/e2e/home.spec.ts` (smoke E2E)

- [ ] **Step 1: Install Playwright + Vitest**

```bash
cd /home/safai/breeez
npm install --save-dev @playwright/test vitest @vitest/ui
npx playwright install chromium
```

- [ ] **Step 2: Vitest config + format test** — write `vitest.config.ts`, `tests/unit/format.test.ts` with one assertion `formatRand(12900) === 'R129.00'`. Verify: `npm test` passes.

- [ ] **Step 3: Playwright config + home smoke test** — `tests/e2e/home.spec.ts` that opens localhost:3000, asserts "Breeez" in title. Verify: `npx playwright test` passes (with `npm run dev` running).

- [ ] **Step 4: Add test scripts to package.json**

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [ ] **Step 5: Commit**

```bash
cd /home/safai/breeez
git add tests/ playwright.config.ts vitest.config.ts package.json package-lock.json
git commit -m "test: vitest + playwright scaffold with smoke tests"
git push origin main
```

---

### Task 7: Wire up Vercel deployment

**Files:**
- Create: `vercel.json` (optional, defaults usually fine)
- Vercel dashboard: import repo

- [ ] **Step 1: Chris signs into Vercel** at https://vercel.com with github.com/DavidNkana.

- [ ] **Step 2: New Project → Import `DavidNkana/breeez`**

- [ ] **Step 3: Configure**

- Framework preset: **Next.js** (auto-detected)
- Build command: default (`next build`)
- Output directory: default
- Install command: default

- [ ] **Step 4: Add environment variables** — copy from `.env.local`. All `NEXT_PUBLIC_*` go to Production, Preview, Development. Server-only vars (SUPABASE_SERVICE_ROLE_KEY, payment gateway keys, courier keys, RESEND_API_KEY) go to Production only initially.

- [ ] **Step 5: Deploy**

- [ ] **Step 6: Verify** — Vercel gives you a `https://breeez-xxx.vercel.app` URL. Open it, confirm the homepage loads. Check the build log for errors.

- [ ] **Step 7: Set up automatic GitHub deploys** — Vercel does this by default. Push to `main` → deploy. Open PR → preview deploy.

- [ ] **Step 8: Custom domain (later)** — skip for now.

- [ ] **Step 9: Commit any vercel config**

```bash
cd /home/safai/breeez
git add vercel.json  # only if you added it
git commit -m "chore: vercel config" || echo "nothing to commit"
```

---

## Phase 2 — Core commerce flows

### Task 8: Catalog queries + data hooks

**Files:**
- Create: `lib/catalog/queries.ts`
- Create: `lib/catalog/use-products.ts` (React Query hook)
- Create: `lib/catalog/use-product.ts` (single product)
- Modify: `package.json` (add @tanstack/react-query)

- [ ] **Step 1: Install React Query**

```bash
cd /home/safai/breeez
npm install @tanstack/react-query
```

- [ ] **Step 2: Add QueryClient provider to layout**

Modify `app/layout.tsx` to wrap children in `<QueryClientProvider>` (client component wrapper).

- [ ] **Step 3: Query functions** (`queries.ts`) — `listProducts({ category, sort, filters, page })`, `getProduct(slug)`, `searchProducts(query)`. All use the server-side Supabase client. Returns typed results.

- [ ] **Step 4: Hooks** — `useProducts(params)`, `useProduct(slug)`, `useSearch(query)`. Use `useQuery` from React Query.

- [ ] **Step 5: Test by hitting the dev server**

- [ ] **Step 6: Commit**

```bash
cd /home/safai/breeez
git add lib/catalog/ app/layout.tsx package.json package-lock.json
git commit -m "feat(catalog): typed queries + React Query hooks"
git push origin main
```

---

### Task 9: PLP — category page with filters

**Files:**
- Modify: `app/c/[slug]/page.tsx` (replace placeholder)
- Create: `components/shop/FilterSidebar.tsx`
- Create: `components/shop/ProductGrid.tsx`
- Create: `components/shop/SortControl.tsx`
- Create: `lib/catalog/filters.ts`

- [ ] **Step 1: Filter parser** — reads URL search params (`?price_min=`, `?sort=`, `?size=`) and converts to Supabase query.

- [ ] **Step 2: ProductGrid** — responsive grid, 2 cols mobile / 4 cols desktop. Loading skeletons. Empty state. Error state.

- [ ] **Step 3: FilterSidebar** — price range slider, size checkboxes (loaded from product variants), sort dropdown. Updates URL search params.

- [ ] **Step 4: SortControl** — "Sort by popularity / rating / latest / price low-high / price high-low".

- [ ] **Step 5: PLP page** — server component fetches initial products, hands off to client grid for filters/sort via URL.

- [ ] **Step 6: Test in dev** — navigate to `/c/kitchen`, filter by price, sort, verify URL updates and products change.

- [ ] **Step 7: E2E test** — `tests/e2e/plp.spec.ts` clicks a filter, asserts products re-render.

- [ ] **Step 8: Commit + push**

---

### Task 10: PDP — product detail page

**Files:**
- Modify: `app/p/[slug]/page.tsx`
- Create: `components/shop/ProductGallery.tsx`
- Create: `components/shop/VariantPicker.tsx`
- Create: `components/shop/AddToCartButton.tsx`
- Create: `components/shop/RelatedProducts.tsx`

- [ ] **Step 1: ProductGallery** — main image + thumbnail strip. Click thumbnail → main image. Mobile swipe (use Embla Carousel).

- [ ] **Step 2: VariantPicker** — for each option (size, colour), renders buttons. Disabled if out of stock. Selecting updates URL hash + selected state.

- [ ] **Step 3: AddToCartButton** — calls `useCart.add()`. Shows success toast. Opens cart drawer.

- [ ] **Step 4: PriceDisplay** — shows R-currency formatted price + sale price + compare-at.

- [ ] **Step 5: QuantityStepper** — +/- buttons, min 1, max = variant.stock.

- [ ] **Step 6: RelatedProducts** — same category, limit 4.

- [ ] **Step 7: PDP page** — fetch product by slug. 404 if not found. Render gallery + variants + price + add-to-cart + description + related.

- [ ] **Step 8: Test E2E** — add to cart from PDP, verify cart count badge updates.

- [ ] **Step 9: Commit + push**

---

### Task 11: Search

**Files:**
- Create: `components/shop/SearchBar.tsx`
- Create: `components/shop/SearchResults.tsx`
- Modify: `app/search/page.tsx`
- Create: `app/api/search/route.ts`

- [ ] **Step 1: SearchBar** — debounced input (300ms). Calls `/api/search?q=`. Shows dropdown of top 5 matches.

- [ ] **Step 2: API route** (`/api/search`) — calls `supabase.from('products').select('id, slug, name, base_price_cents').textSearch('search_tsv', query).limit(20)`.

- [ ] **Step 3: SearchResults page** — full results list. Empty state if no matches.

- [ ] **Step 4: Wire SearchBar into Header** (already has search icon — make it open a modal with the SearchBar).

- [ ] **Step 5: Commit + push**

---

### Task 12: Auth (Supabase email + password + magic link)

**Files:**
- Create: `lib/auth/session.ts`
- Create: `lib/auth/guard.ts`
- Create: `app/api/auth/callback/route.ts`
- Modify: `app/auth/login/page.tsx`
- Modify: `app/auth/register/page.tsx`
- Create: `app/auth/reset/page.tsx`

- [ ] **Step 1: Auth callback route** — exchanges Supabase auth code for session cookie. Redirects to `/account`.

- [ ] **Step 2: Login page** — form submits to Supabase `signInWithPassword`. On success, redirect to `/account`. "Sign in with magic link" alternative button.

- [ ] **Step 3: Register page** — `signUp` with email + password. Supabase sends verification email via Resend SMTP.

- [ ] **Step 4: Reset page** — email input → `resetPasswordForEmail` → magic link sent.

- [ ] **Step 5: session helper** — `getSession()` for RSC, `requireAdmin()` for admin routes.

- [ ] **Step 6: Configure Supabase email templates** in dashboard (use Resend SMTP — see Task 20).

- [ ] **Step 7: Test E2E** — register → verify email → log in → access /account.

- [ ] **Step 8: Commit + push**

---

### Task 13: Account pages

**Files:**
- Modify: `app/account/page.tsx`
- Create: `app/account/orders/page.tsx`
- Create: `app/account/orders/[id]/page.tsx`
- Create: `app/account/addresses/page.tsx`
- Create: `app/account/wishlist/page.tsx`

- [ ] **Step 1: Account dashboard** — fetch customer data, show name + email + navigation cards (orders / addresses / wishlist / logout).

- [ ] **Step 2: Order history** — list of customer's orders. Status badge. Order # link.

- [ ] **Step 3: Order detail** — line items, status timeline (paid → shipped → delivered), tracking # if available, "Request return" button.

- [ ] **Step 4: Address book** — list + add/edit/delete form. Set default.

- [ ] **Step 5: Wishlist** — list of wishlist items. "Add to cart" + "Remove" buttons.

- [ ] **Step 6: Test E2E** — log in, navigate to /account/orders, see orders.

- [ ] **Step 7: Commit + push**

---

### Task 14: Cart (drawer + page)

**Files:**
- Create: `components/shop/CartDrawer.tsx`
- Create: `components/shop/CartLineItem.tsx`
- Create: `components/shop/CartSummary.tsx`
- Modify: `components/shop/CartButton.tsx` (already wired to `useCart`)
- Modify: `app/cart/page.tsx`
- Modify: `app/layout.tsx` (mount cart drawer globally)

- [ ] **Step 1: CartDrawer** — listens for `breeez:open-cart` event, opens Drawer component, shows line items + subtotal + checkout button.

- [ ] **Step 2: CartLineItem** — image + name + price + qty stepper + remove button.

- [ ] **Step 3: CartSummary** — subtotal, shipping estimate, total, checkout CTA.

- [ ] **Step 4: Cart page** — same content as drawer but full page. Useful for desktop users.

- [ ] **Step 5: Mount CartDrawer globally** in `app/layout.tsx` so it's available on every page.

- [ ] **Step 6: Test E2E** — add to cart from PDP, open drawer, verify contents, update qty, verify subtotal updates.

- [ ] **Step 7: Commit + push**

---

### Task 15: Cart → server sync (anonymous → logged-in)

**Files:**
- Create: `lib/cart/sync.ts`
- Create: `app/api/cart/sync/route.ts`

- [ ] **Step 1: API route** — accepts anonymous cart from localStorage, creates server cart for logged-in user, merges.

- [ ] **Step 2: Trigger sync** — call after login (from useAuth hook) and after add-to-cart (debounced).

- [ ] **Step 3: Test E2E** — add items anonymously → log in → verify cart persists.

- [ ] **Step 4: Commit + push**

---

### Task 16: Mobile bottom nav (native shell)

**Files:**
- Create: `components/shop/BottomNav.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: BottomNav** — 5 items: Home, Categories, Search, Cart, Account. Visible only on mobile (md:hidden). Highlights active route.

- [ ] **Step 2: Mount globally** below main content. Adds bottom padding to main on mobile so content doesn't get hidden behind nav.

- [ ] **Step 3: Test** — open in mobile viewport, verify nav shows + works.

- [ ] **Step 4: Commit + push**

---

### Task 17: Checkout (4-step flow + place order RPC)

**Files:**
- Modify: `app/checkout/page.tsx`
- Create: `app/checkout/success/[order]/page.tsx`
- Create: `components/checkout/EmailStep.tsx`
- Create: `components/checkout/AddressStep.tsx`
- Create: `components/checkout/ShippingStep.tsx`
- Create: `components/checkout/PaymentStep.tsx`
- Create: `components/checkout/OrderSummary.tsx`
- Create: `app/api/checkout/quote/route.ts`
- Create: `app/api/checkout/place/route.ts`
- Create: `lib/checkout/pricing.ts`
- Create: `lib/checkout/order-number.ts`

- [ ] **Step 1: Pricing utils** — `subtotalCents(items)`, `shippingCents(method, subtotal)`, `totalCents(...)`. Hardcode shipping costs: pargo R49, tcg R89, dawn_wing R149, free over R500.

- [ ] **Step 2: EmailStep** — email input (pre-fill if logged in).

- [ ] **Step 3: AddressStep** — inline address form OR pick from address book.

- [ ] **Step 4: ShippingStep** — radio buttons for the 3 options with prices. Shows Pargo pickup point picker (modal with map + search).

- [ ] **Step 5: PaymentStep** — radio for PayFast / Yoco / Ozow.

- [ ] **Step 6: OrderSummary** — sticky right column on desktop, bottom sheet on mobile. Always shows current totals.

- [ ] **Step 7: Quote API** — POST `/api/checkout/quote` returns shipping cost for address + method + subtotal.

- [ ] **Step 8: Place order API** — POST `/api/checkout/place` calls `public.place_order` RPC, returns order # + redirect URL.

- [ ] **Step 9: Checkout page** — stepper UI (1/2/3/4), back/next buttons, validation between steps.

- [ ] **Step 10: Success page** — order #, summary, "what's next", link to track order.

- [ ] **Step 11: Test E2E** — complete checkout with mock payment, verify order in Supabase, verify success page.

- [ ] **Step 12: Commit + push**

---

### Task 18: Payment gateways (PayFast + Yoco + Ozow)

**Files:**
- Create: `lib/payments/payfast.ts`
- Create: `lib/payments/yoco.ts`
- Create: `lib/payments/ozow.ts`
- Create: `app/api/webhooks/payfast/route.ts`
- Create: `app/api/webhooks/yoco/route.ts`
- Create: `app/api/webhooks/ozow/route.ts`
- Create: `supabase/functions/payfast-create/index.ts` (or inline in API route)

- [ ] **Step 1: Sign up for PayFast sandbox** at https://www.payfast.co.za/ (sandbox account free). Get merchant_id + key + passphrase.

- [ ] **Step 2: PayFast client** — `createPayment({ amount, returnUrl, cancelUrl, notifyUrl })` returns hosted payment URL. Signature generation per PayFast spec.

- [ ] **Step 3: PayFast webhook** — verifies signature, updates `orders.status = 'paid'`, fires confirmation email + receipt.

- [ ] **Step 4: Yoco** — Yoco Online Payments API. In-page modal via Yoco SDK. Webhook handles async success.

- [ ] **Step 5: Ozow** — Instant EFT. Redirect to Ozow, return with token, verify via Ozow API.

- [ ] **Step 6: MOCK_PAYMENTS env var** — when `MOCK_PAYMENTS=true`, skip real gateway calls and just mark order paid (for dev/test).

- [ ] **Step 7: Test E2E** — PayFast sandbox end-to-end with R10 test order.

- [ ] **Step 8: Commit + push**

---

### Task 19: Shipping (Pargo + The Courier Guy + Dawn Wing)

**Files:**
- Create: `lib/shipping/pargo.ts`
- Create: `lib/shipping/tcg.ts`
- Create: `lib/shipping/dawn-wing.ts`
- Create: `lib/shipping/quote.ts`
- Create: `app/api/webhooks/shipping/[provider]/route.ts`

- [ ] **Step 1: Pargo adapter** — `getPickupPoints(postalCode)` returns list. `createShipment(order)` returns waybill. Webhook handler for tracking events.

- [ ] **Step 2: The Courier Guy adapter** — `quoteAddress(address)`, `createShipment(order)`, status webhook.

- [ ] **Step 3: Dawn Wing adapter** — same shape. Restrict to metros (JHB, CPT, DBN, PTA postal codes).

- [ ] **Step 4: Unified quote()** — given address + method + subtotal, returns cost.

- [ ] **Step 5: Booking flow** — when admin marks order shipped, call appropriate adapter, store waybill # on order.

- [ ] **Step 6: Tracking webhooks** — update `orders.shipping_tracking` + status on incoming events.

- [ ] **Step 7: Test E2E** — sandbox/test booking with each courier.

- [ ] **Step 8: Commit + push**

---

### Task 20: Email (Resend + React Email templates)

**Files:**
- Create: `lib/email/resend.ts`
- Create: `lib/email/templates/OrderConfirmation.tsx`
- Create: `lib/email/templates/ShippedNotification.tsx`
- Create: `lib/email/templates/DeliveredNotification.tsx`
- Create: `lib/email/templates/ReturnApproved.tsx`
- Create: `lib/email/templates/ReturnRejected.tsx`

- [ ] **Step 1: Sign up for Resend** at https://resend.com (free tier).

- [ ] **Step 2: Configure Supabase SMTP** to use Resend (Settings → Auth → SMTP).

- [ ] **Step 3: Resend client** — `send({ to, subject, react })` helper.

- [ ] **Step 4: Templates** — React Email components, branded with Breeez colours.

- [ ] **Step 5: Wire triggers** — order placed → confirmation; payment webhook → receipt; admin marks shipped → shipped notification (with tracking); admin marks delivered → delivered; admin approves return → approval email.

- [ ] **Step 6: Test** — place test order, verify emails arrive.

- [ ] **Step 7: Commit + push**

---

### Task 21: Admin (custom /admin/* routes + Supabase Studio)

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx` (dashboard)
- Create: `app/admin/products/page.tsx`
- Create: `app/admin/products/new/page.tsx`
- Create: `app/admin/products/[id]/page.tsx`
- Create: `app/admin/products/import/page.tsx`
- Create: `app/admin/categories/page.tsx`
- Create: `app/admin/orders/page.tsx`
- Create: `app/admin/orders/[id]/page.tsx`
- Create: `app/admin/discounts/page.tsx`
- Create: `app/admin/returns/page.tsx`
- Create: `components/admin/ProductForm.tsx`
- Create: `components/admin/VariantEditor.tsx`
- Create: `components/admin/ImageUploader.tsx`
- Create: `components/admin/OrderTable.tsx`
- Create: `components/admin/OrderActions.tsx`
- Create: `components/admin/ReturnsTable.tsx`
- Create: `components/admin/CsvImporter.tsx`

- [ ] **Step 1: Admin layout** — auth guard (`requireAdmin()`), sidebar nav, top bar with admin name + logout.

- [ ] **Step 2: Dashboard** — orders today, revenue this week, low-stock alerts (variants with stock < 5).

- [ ] **Step 3: Product list** — searchable, filterable table. Edit button per row.

- [ ] **Step 4: Product form** — name, description (markdown), category, base price, images (upload to Supabase Storage), variants editor (rows: SKU, name, options, price, stock).

- [ ] **Step 5: CSV import** — drag-and-drop CSV, parse client-side, preview, bulk insert via API.

- [ ] **Step 6: Category CRUD** — list, add, edit, delete (soft delete via is_active).

- [ ] **Step 7: Order list** — searchable, filterable. Order detail page with mark-shipped + refund buttons.

- [ ] **Step 8: Returns queue** — list of returns, approve/reject buttons.

- [ ] **Step 9: Discount CRUD** — code, kind, value, dates, max uses, is_active toggle.

- [ ] **Step 10: Test E2E** — log in as admin (add user_id to `admins` table first), create a product, see it on the storefront.

- [ ] **Step 11: Commit + push**

---

### Task 22: Legal pages (full text)

**Files:**
- Modify: `app/legal/terms/page.tsx`
- Modify: `app/legal/privacy/page.tsx`
- Modify: `app/legal/returns/page.tsx`

- [ ] **Step 1: Terms** — actual T&Cs (use a template + Chris's specific business details). Cover orders, payment, delivery, liability, POPIA reference, governing law (RSA).

- [ ] **Step 2: Privacy (POPIA)** — list every piece of data collected, why, how long kept, who it's shared with, customer's rights (access, correction, deletion, complaint to Info Regulator), contact for POPI officer.

- [ ] **Step 3: Returns** — flesh out: 7-day window, item condition requirements, return shipping cost, refund timeline, defective item procedure, contact info.

- [ ] **Step 4: Add Chris to POPI registry** at https://www.justice.gov.za/inforeg/ (once-off, business-level).

- [ ] **Step 5: Commit + push**

---

## Phase 3 — Native app packaging (Capacitor + App Stores)

### Task 23: Capacitor — Android shell

**Files:**
- Create: `android/` (generated by Capacitor)

- [ ] **Step 1: Add Capacitor Android platform**

```bash
cd /home/safai/breeez
npm run build
npx cap add android
npx cap sync android
```

- [ ] **Step 2: Configure native Android**

- Open `android/app/build.gradle`, set `applicationId "co.za.breeez.app"`, `minSdkVersion 23`, `targetSdkVersion 34`.
- Open `android/app/src/main/AndroidManifest.xml`, set app label "Breeez", icon, theme.
- Open `android/app/src/main/res/values/strings.xml`, set `app_name = "Breeez"`.

- [ ] **Step 3: Add Firebase for push notifications**

- Create Firebase project at https://console.firebase.google.com
- Add Android app with package `co.za.breeez.app`
- Download `google-services.json`, place in `android/app/`
- Add to `android/build.gradle` classpath + `android/app/build.gradle` apply plugin
- Add `@capacitor/push-notifications` to MainActivity (or use the Capacitor auto-init)

- [ ] **Step 4: Configure splash + status bar**

Already done in `capacitor.config.ts`. Verify on Android by `npx cap open android` and run on emulator.

- [ ] **Step 5: Test build**

```bash
cd /home/safai/breeez/android
./gradlew assembleDebug
```

Expected: `BUILD SUCCESSFUL`. APK at `android/app/build/outputs/apk/debug/app-debug.apk`.

- [ ] **Step 6: Commit**

```bash
cd /home/safai/breeez
git add android/
git commit -m "feat(capacitor): add Android shell"
git push origin main
```

---

### Task 24: Capacitor — iOS shell

**Files:**
- Create: `ios/` (generated by Capacitor)

- [ ] **Step 1: Add iOS platform** (requires macOS or EAS cloud build)

```bash
cd /home/safai/breeez
npm run build
npx cap add ios
npx cap sync ios
```

- [ ] **Step 2: Configure Xcode project**

- Open in Xcode: `npx cap open ios`
- Set Bundle Identifier: `co.za.breeez.app`
- Set Version + Build number
- Set Display Name: `Breeez`
- Set Deployment Target: iOS 14.0+
- Add app icons (all required sizes via Capacitor assets)
- Add launch screen

- [ ] **Step 3: Configure push notifications**

- Enable Push Notifications capability in Xcode
- Create APNs key in Apple Developer portal
- Upload to Firebase project

- [ ] **Step 4: Test build**

In Xcode: Product → Build (or `npx cap run ios` on simulator).

- [ ] **Step 5: Commit**

```bash
cd /home/safai/breeez
git add ios/
git commit -m "feat(capacitor): add iOS shell"
git push origin main
```

---

### Task 25: App icon + splash screens

**Files:**
- `resources/icon-only.png` (1024×1024)
- `resources/icon-foreground.png` (432×432)
- `resources/icon-background.png` (432×432)
- `resources/splash.png` (2732×2732)
- `capacitor.config.ts` (already references)

- [ ] **Step 1: Generate base assets**

Chris designs (or pays a designer for) a simple Breeez logo + brand colour. Save as PNG.

- [ ] **Step 2: Use Capacitor assets tool**

```bash
cd /home/safai/breeez
npm install --save-dev @capacitor/assets
npx capacitor-assets generate --android --ios
```

Expected: all required icon + splash sizes generated.

- [ ] **Step 3: Verify**

Open in Android Studio / Xcode and visually inspect.

- [ ] **Step 4: Commit**

```bash
cd /home/safai/breeez
git add resources/
git commit -m "feat(assets): app icons and splash screens"
git push origin main
```

---

### Task 26: EAS cloud build setup (no Mac needed for iOS)

**Files:**
- Create: `eas.json`

- [ ] **Step 1: Install EAS CLI**

```bash
cd /home/safai/breeez
npm install --save-dev eas-cli
```

- [ ] **Step 2: Configure eas.json**

```json
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview":     { "distribution": "internal" },
    "production":  {}
  }
}
```

- [ ] **Step 3: Log in to Expo**

```bash
cd /home/safai/breeez
npx eas login
```

- [ ] **Step 4: Configure iOS build for EAS**

Requires Apple Developer Team ID. Add to eas.json. Set up credentials in EAS dashboard.

- [ ] **Step 5: Trigger first iOS cloud build**

```bash
cd /home/safai/breeez
eas build --platform ios --profile preview
```

Expected: build completes in ~15 min. Download `.ipa`.

- [ ] **Step 6: Commit eas.json**

```bash
cd /home/safai/breeez
git add eas.json package.json package-lock.json
git commit -m "chore: eas build config"
git push origin main
```

---

### Task 27: Apple App Store submission

- [ ] **Step 1: Create App Store Connect entry**

- Sign in to https://appstoreconnect.apple.com
- My Apps → + → New App
- Name: Breeez, Bundle ID: co.za.breeez.app, SKU: breeez

- [ ] **Step 2: Fill in app metadata**

- [ ] Subtitle, category, content rights, age rating
- [ ] Privacy policy URL (Vercel-deployed `/legal/privacy`)
- [ ] Support URL (mailto:support@breeez.app)
- [ ] Screenshots (6.7", 6.5", 5.5" iPhone + 12.9" iPad, at least 3 each)
- [ ] Description, keywords, what's new
- [ ] Copyright

- [ ] **Step 3: Build and upload**

```bash
cd /home/safai/breeez
eas build --platform ios --profile production
eas submit --platform ios --latest
```

- [ ] **Step 4: Submit for review**

In App Store Connect → the build → Submit for Review.

- [ ] **Step 5: Monitor** — respond to any reviewer questions within 24h.

- [ ] **Step 6: Once approved** — app goes live. Verify install + smoke test all flows.

---

### Task 28: Google Play Store submission

- [ ] **Step 1: Create Play Console entry**

- Sign in to https://play.google.com/console
- Create app → Breeez

- [ ] **Step 2: Fill in store listing**

- Short + full description
- Screenshots (phone, 7" tablet, 10" tablet)
- Feature graphic 1024×500
- App icon 512×512
- Content rating (IARC)
- Privacy policy URL
- Data safety form
- Ads declaration

- [ ] **Step 3: Build + upload**

```bash
cd /home/safai/breeez
eas build --platform android --profile production
eas submit --platform android --latest
```

- [ ] **Step 4: Submit for review**

- [ ] **Step 5: Monitor**

- [ ] **Step 6: Once approved** — verify install + smoke test.

---

## Phase 4 — Polish + Ship

### Task 29: Lighthouse + performance

- [ ] **Step 1: Run Lighthouse on the deployed site** (https://breeez.vercel.app)
- [ ] **Step 2: Optimise images** — convert to WebP, lazy load, set sizes
- [ ] **Step 3: Add Service Worker for offline PWA support** (optional)
- [ ] **Step 4: Verify Lighthouse score > 80** on Performance, Accessibility, Best Practices, SEO
- [ ] **Step 5: Commit any optimisations**

### Task 30: Analytics (PostHog)

- [ ] **Step 1: Sign up for PostHog** at https://posthog.com (free cloud tier)
- [ ] **Step 2: Add to app** — `posthog-js` in client provider, `posthog-node` in server routes
- [ ] **Step 3: Wire key events** — product_viewed, variant_selected, added_to_cart, checkout_started, payment_initiated, purchase_completed
- [ ] **Step 4: Verify events arrive** in PostHog dashboard
- [ ] **Step 5: Commit**

### Task 31: End-to-end success criteria verification

Re-run through all 9 success criteria from spec §17:

1. ✅ Web live at breeez.vercel.app, Lighthouse > 80
2. ✅ iOS app on App Store
3. ✅ Android app on Play Store
4. ✅ ≥50 SKUs loaded
5. ✅ End-to-end test order works
6. ✅ Returns flow works
7. ✅ CSV import loads 200 SKUs
8. ✅ No console errors
9. ✅ Legal pages live

- [ ] **Step 1: Document any failures** as GitHub issues
- [ ] **Step 2: Fix and re-test** until all green
- [ ] **Step 3: Final commit + tag v1.0.0**

```bash
cd /home/safai/breeez
git tag v1.0.0
git push origin v1.0.0
```

- [ ] **Step 4: Celebrate.**

---

## Acceptance

This plan is approved when Chris signs off on the design spec AND says "approved" on this plan. After approval, execute top-to-bottom, marking each task's checkboxes as you complete them.

*Estimated timeline at solo-builder pace (with Claude + agent team): 2-4 weeks to v1 web live, 6-8 weeks to both apps live on stores.*