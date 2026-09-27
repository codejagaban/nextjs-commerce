# Release checks

Tests use a disposable local PostgreSQL database. They refuse to run without
`TEST_DATABASE_URL`, or against a remote database or a name without the `_test`
suffix. Never use a database containing real customers or orders.

Example with Docker:

```sh
docker run --name commerce-tests -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=commerce_test -p 55439:5432 -d postgres:16
export TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55439/commerce_test
pnpm exec playwright install chromium
pnpm lint
pnpm typecheck
pnpm audit --prod
pnpm test:int
pnpm test:e2e
```

`pnpm test:e2e` seeds its own catalogue and accounts, builds the application, and
starts the production server on port **3002**. It refuses to reuse an existing
server, so stop any commerce server on that port before running it. This guards
against accidentally exercising an unrelated application or a real database.
To use installed Chrome locally, set `PLAYWRIGHT_CHANNEL=chrome`.

The runner overrides database, auth, payment, email and bucket configuration
before Payload or Next loads `.env` files. Real Stripe calls are unavailable and
SMTP points to an unreachable local port. No test sends email or charges a card.
The media fixture is named `commerce-test-serum.jpg` and writes its derivatives
to the ignored local media directory. Test signup accounts stay only in the
disposable database; recreate that database to reset them.

Integration checks cover authentication, user permissions, draft visibility and
payment transaction retry persistence. Browser checks exercise the current
storefront, cart, account forms and Payload dashboard against real APIs.

The normal suite uses a stubbed Stripe transport to check customer and guest
settlement, concurrent and repeated notifications, rejected signatures, ownership,
inventory updates, and confirmation recovery without a second payment.

## Real Stripe test-mode acceptance

Install the Stripe CLI and configure matching `sk_test_` / `pk_test_` keys in
`.env.local`. With an isolated local database named `commerce_test` and port 3002
free, explicitly opt in:

```sh
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55439/commerce_test pnpm verify:stripe --use-local-test-keys
```

This creates a real Stripe **test-mode** payment, forwards its success event using
the CLI, and verifies webhook-only order creation, cart clearing, stock deduction,
and idempotent event replay and browser-API confirmation. It does not enter card
details through the browser. No real money is charged or email sent. Fixtures stay
in the disposable database and Stripe sandbox for inspection. `--keep-open` keeps
the isolated store running for manual checks; Ctrl+C stops its owned processes.
The temporary webhook secret stays in memory and does not modify `.env.local`.

For production, register the HTTPS `/api/payments/stripe/webhooks` endpoint for
`payment_intent.succeeded` and set `STRIPE_WEBHOOKS_SIGNING_SECRET` to that
endpoint's signing secret, not the CLI secret. Use matching keys for the intended
Stripe account and mode. Missing configuration fails closed.

Browser card entry, receipts, cloud uploads and production HTTPS remain separate
acceptance checks. Successful API payment tests do not establish those flows work.

## Hosted production smoke test

The hosted smoke test uses one synthetic customer and one temporary product to
exercise the deployed storefront, address book, Stripe test-mode payment,
webhook settlement, order access, confirmation email acceptance, password-reset
email acceptance, R2 delivery, and Next.js image optimization. It removes only
the records it creates, identified by their returned IDs.

It is deliberately opt-in and refuses live Stripe keys. Use a dedicated mailbox
that supports `+` aliases, and a dedicated admin account with the normal admin
role. The deployed Stripe account must be in test mode and its webhook must point
to the deployed `/api/payments/stripe/webhooks` endpoint.

```sh
SMOKE_BASE_URL=https://your-store.example \
SMOKE_ADMIN_EMAIL=smoke-admin@your-store.example \
SMOKE_ADMIN_PASSWORD='...' \
SMOKE_CUSTOMER_EMAIL=smoke-mailbox@your-store.example \
SMOKE_STRIPE_SECRET_KEY='sk_test_...' \
pnpm test:smoke
```

For a local rehearsal only, also set `SMOKE_ALLOW_LOCALHOST=1`. The test confirms
that the configured mail transport accepted each message; mailbox placement and
spam-folder behavior remain a provider-level deliverability check.

CI runs the same checks on Node 24 with a fresh Postgres 16 service for each run.
Failing browser checks upload screenshots and traces as GitHub Actions artifacts.
