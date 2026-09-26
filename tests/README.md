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

Stripe payment success, webhooks, receipts, cloud uploads and production HTTPS
remain separate integration acceptance checks requiring configured services.
These tests do not claim to validate those external flows.

CI runs the same checks on Node 24 with a fresh Postgres 16 service for each run.
Failing browser checks upload screenshots and traces as GitHub Actions artifacts.
