# Release checks

The standard integration and browser tests use a disposable local PostgreSQL database. They refuse to run without
`TEST_DATABASE_URL`, or against a remote database or a name without the `_test`
suffix. Never use a database containing real customers or orders.

Example with Docker:

```sh
docker run --name commerce-tests -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=commerce_test -p 55439:5432 -d postgres:16
export TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55439/commerce_test
pnpm exec playwright install chromium
pnpm lint
pnpm typecheck
pnpm test:unit
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

This API test does not establish browser card entry, receipts, or cloud uploads.
Use the commerce smoke test below for those checks.

## Hosted production smoke test

The smoke test creates one synthetic customer, product, and image. It checks:

- Browser signup, automatic login, logout, login, address creation and cart persistence.
- Real card entry through Stripe's Payment Element using `4242 4242 4242 4242`.
- Webhook-only settlement: the browser's confirmation request is held until the
  webhook creates the order, clears the cart, decrements stock, and sends a receipt.
- Browser confirmation and concurrent retries return the same order, with one
  inventory deduction and one receipt. Anonymous order access is rejected.
- Receipt delivery to the test inbox, including the product and correct order URL.
- Password reset using the link read from the delivered email; the old password
  and reused reset token are rejected, and the new password works in the browser.
- A fresh media upload, original delivery, generated thumbnail, and a 640px
  Next.js optimized image. Hosted runs require the expected public R2 origin.

No payment or application responses are mocked. The confirmation delay is a
browser network hold that proves the webhook can settle independently.

It is deliberately opt-in and refuses live Stripe keys. Use a dedicated mailbox
that supports `+` aliases, and a dedicated admin account with the normal admin
role. The deployed Stripe account must be in test mode and its webhook must point
to the deployed `/api/payments/stripe/webhooks` endpoint. The runner retrieves the
created intent with its test key and checks `livemode: false` before clicking Pay.
Do not run this against a store configured for live payments.

Provide read access to that dedicated mailbox using IMAP over TLS. Messages are
matched to a unique per-run `+smoke-...` address, fetched without marking them read,
and left in the mailbox. Configure the app to deliver to these aliases; an
`EMAIL_OVERRIDE_RECIPIENT` pointing elsewhere will correctly fail the check.

```sh
SMOKE_BASE_URL=https://your-store.example \
SMOKE_ADMIN_EMAIL=smoke-admin@your-store.example \
SMOKE_ADMIN_PASSWORD='...' \
SMOKE_CUSTOMER_EMAIL=smoke-mailbox@your-store.example \
SMOKE_STRIPE_SECRET_KEY='sk_test_...' \
SMOKE_MEDIA_ORIGIN=https://your-public-bucket.r2.dev \
SMOKE_IMAP_HOST=mail.your-store.example \
SMOKE_IMAP_USER=smoke-mailbox@your-store.example \
SMOKE_IMAP_PASSWORD='...' \
pnpm test:smoke
```

Optional `SMOKE_IMAP_PORT` defaults to 993 and `SMOKE_IMAP_FOLDER` to `INBOX`.
Keep credentials in the environment or a secret manager, never committed files.

Cleanup runs even after test failures, with its own timeout. It cancels unpaid
Stripe intents, deletes the synthetic Stripe customer, and removes exact-run
orders, transactions, carts, addresses, user, product, and media through Payload.
Deleting media also removes its stored derivatives. Successful test payments
remain in the Stripe sandbox as evidence; Stripe does not support deleting them.
No refund is issued during cleanup. Failed cleanup fails the test and records the
run identifier in the report for recovery; it never falls back to bulk deletion.
Interrupting or force-killing the process can bypass cleanup. Use a disposable
database for rehearsals.

Traces and video are disabled because they contain credentials, cookies and reset
tokens. Failure screenshots/reports contain synthetic data; keep them private.

### Local rehearsal with real Stripe and captured SMTP

With a disposable local database ending in `_test`, the Stripe CLI installed,
and port 3002 free:

```sh
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55439/commerce_test \
PLAYWRIGHT_CHANNEL=chrome \
pnpm test:smoke:local --use-local-test-keys --with-r2
```

The runner explicitly loads the test Stripe keys from `.env.local`, starts a
Stripe webhook listener, applies migrations, creates a temporary admin, builds
and starts the production app, and runs the browser smoke test. Email is sent
through the normal SMTP adapter into a temporary loopback capture inbox. No
external email is sent, and no existing customer or catalog is used. `--with-r2`
opts into the configured bucket for only the temporary image and its derivatives;
omit it to exercise local storage. Add `--dev` for faster debugging without the
production build. On normal completion or test failure, the runner stops its owned
services and deletes its temporary admin. It never replaces an already running server.

A local pass verifies the code and configured test services; it does not prove
the deployed HTTPS site, its webhook registration, or external email delivery.

### Manual hosted CI

The **Hosted commerce smoke** workflow is manual and serial. Configure a GitHub
environment named `commerce-smoke`: put `SMOKE_BASE_URL`, `SMOKE_MEDIA_ORIGIN`,
and optional IMAP port/folder in environment variables; put the admin credentials,
mailbox address, Stripe test secret, and IMAP connection credentials in environment
secrets with the names above. Run it only after the target deployment is ready.
Reports are retained for three days. No hosted payment or email is triggered on
ordinary pull requests.

Ordinary pull-request CI runs the isolated suite on Node 24 with a fresh Postgres
16 service, including the smoke harness's safety unit tests. Its browser checks
upload screenshots and traces on failure. The manual hosted workflow instead
targets the configured deployment and keeps payment/auth traces disabled.
