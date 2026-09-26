# Marisol — a Payload + Next.js commerce template

A production-ready, SEO-friendly e-commerce **template** you can clone to launch a new
store. It ships with a public storefront and a full admin for managing products **and**
editing the site itself, art-directed around a demo brand (**Marisol**, a single-estate
olive oil & Mediterranean pantry) so nothing looks like a generic starter.

- **Storefront** — Next.js 16 App Router, server-rendered, warm editorial design, cohesive
  light/dark themes, SEO metadata + JSON-LD + sitemap + robots.
- **Admin** — [Payload 3](https://payloadcms.com) running in the same app: products with
  variants, orders, media, users/roles, and a **block-based page builder** for editing
  pages, navigation, and the footer.
- **Commerce** — `@payloadcms/plugin-ecommerce` with **Stripe** payments and **guest
  checkout** (email + secure access token, no account required).
- **Database** — PostgreSQL (works with Neon, Supabase, RDS, or local Postgres).

## Stack

| Concern        | Choice                                             |
| -------------- | -------------------------------------------------- |
| Framework      | Next.js 16 (App Router) + React 19                 |
| CMS / Admin    | Payload 3 (`payload`, `@payloadcms/next`)          |
| Commerce       | `@payloadcms/plugin-ecommerce` + Stripe adapter    |
| Database       | Postgres via `@payloadcms/db-postgres`             |
| Styling        | Tailwind CSS v4 + a small set of shadcn/ui parts   |
| Display type   | Sentient (self-hosted from Fontshare)              |

## Quick start

```bash
pnpm install

# 1. Configure environment
cp .env.example .env
#    - set PAYLOAD_SECRET to a long random string
#    - set DATABASE_URL to your Postgres connection string

# 2. Start the app (Payload will push the schema on first run in dev)
pnpm dev

# 3. Seed the demo store (products, media, pages, nav) + an admin login
pnpm seed
```

Then open:

- Storefront → http://localhost:3000
- Admin → http://localhost:3000/admin

The seed creates an admin login:

```
email:    admin@marisol.store
password: marisol-admin
```

> Change this immediately for any real deployment (or edit `scripts` / the seed).

### Provisioning Postgres + Stripe on Vercel

If you deploy on Vercel, you can provision both as real integrations:

```bash
vercel link
vercel integration add neon      # Postgres → sets DATABASE_URL
vercel integration add stripe    # Stripe   → sets STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
vercel env pull                  # writes .env.local
```

### Stripe webhooks (local)

To mark orders paid after a test purchase, forward Stripe events to the app and copy the
signing secret into `STRIPE_WEBHOOKS_SIGNING_SECRET`:

```bash
pnpm stripe-webhooks   # runs: stripe listen --forward-to localhost:3000/api/payments/stripe/webhooks
```

Use Stripe test cards (e.g. `4242 4242 4242 4242`) at checkout.

## Making it your store

Everything below is designed to be swapped per project.

- **Name & metadata** — `SITE_NAME`, `COMPANY_NAME`, `TWITTER_*` in `.env`.
- **Colours & type** — brand tokens live in `src/app/(app)/globals.css` (`--olive`,
  `--amber`, `--terracotta`, `--bone`, `--ink`, plus the semantic `--primary` etc. for
  both light and dark). The display font is wired in `src/app/(app)/layout.tsx`.
- **Logo** — `src/components/Logo/MarisolMark.tsx` (a bespoke sun-over-horizon mark).
- **Products & catalog** — the admin, or edit `src/endpoints/seed/index.ts` and re-run
  `pnpm seed`. Demo photography lives in `src/endpoints/seed/assets/`.
- **Home page** — `src/app/(app)/page.tsx` (a bespoke, art-directed server component that
  pulls real products).
- **Editable pages / nav / footer** — created from **blocks** in the admin. The seed adds
  an editable `/about` page and the header/footer navigation as globals.

## Project structure

```
src/
  app/(app)/            storefront routes (home, shop, products, checkout, account, about)
  app/(payload)/        Payload admin + API
  blocks/               page-builder blocks (Content, MediaBlock, CTA, …)
  collections/          Products, Pages, Categories, Media, Users
  components/           storefront UI (Header, Footer, Cart, product, …)
  endpoints/seed/       demo seed data + committed demo assets
  globals/              Header & Footer globals (editable nav)
  heros/                hero variants used by CMS pages
scripts/                seed + screenshot/dev utilities
```

## Useful scripts

```bash
pnpm dev               # start the dev server; Payload pushes schema changes locally
pnpm seed              # (re)seed the demo store + admin user
pnpm build             # build without changing a database
pnpm build:production  # run pending migrations, then build for deployment
pnpm migrate:status    # show which production migrations have run
pnpm generate:types    # regenerate Payload types
```

## Database migrations

Development keeps Payload's schema-push workflow enabled so a new field appears locally without
extra steps. Production uses the committed migrations in `src/migrations` instead.

For a new production database, set its `DATABASE_URL` and run:

```bash
pnpm build:production
```

Use that command as the deployment build command. It applies each pending migration once and stops
the deployment if a migration fails.

After changing a Payload collection, global, or field, generate and commit the next migration:

```bash
pnpm payload migrate:create describe_the_schema_change
```

### Existing databases created by development push

An existing store may already have the complete schema but no migration history. Back it up, then
adopt the initial migration exactly once:

```bash
ADOPT_EXISTING_SCHEMA=true pnpm migrate:adopt
pnpm migrate:status
```

The adoption command checks every table column in the baseline before recording it and refuses an
empty or incomplete database. It does not create, delete, or rewrite store content. Never use it for
a fresh database; run `pnpm migrate` there instead.

---

Built on the Payload ecommerce template and art-directed as a clone-ready starter.
