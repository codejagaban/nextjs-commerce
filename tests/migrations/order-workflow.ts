import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { createLocalReq, getPayload } from 'payload'
import { migrations } from '../../src/migrations'
import { testEnvironment } from '../environment.mjs'

// This rehearsal requires an empty, disposable loopback database. It never
// rewinds a database that contains an existing application's tables.
Object.assign(process.env, testEnvironment(), { PAYLOAD_MIGRATING: 'true' })
const { default: config } = await import('../../src/payload.config')
const payload = await getPayload({ config })

try {
  const db = payload.db.drizzle
  const existing = await db.execute(sql`SELECT to_regclass('public.orders') AS orders`)
  assert.equal(
    existing.rows[0].orders,
    null,
    'Migration rehearsal requires a fresh empty test database.',
  )
  const firstWorkflow = migrations.findIndex(({ name }) => name.endsWith('order_state_separation'))
  assert.ok(firstWorkflow > 0)
  // Payload's generic adapter accepts unknown args; these migrations use the
  // concrete Postgres adapter's transaction type.
  const adapterMigrations = migrations.map((migration) => ({
    name: migration.name,
    up: (args: unknown) => migration.up(args as MigrateUpArgs),
    down: (args: unknown) => migration.down(args as MigrateDownArgs),
  }))
  await payload.db.migrate({ migrations: adapterMigrations.slice(0, firstWorkflow) })

  const cases = [
    {
      legacy: 'processing',
      transaction: 'succeeded',
      refunds: 0,
      order: 'open',
      payment: 'paid',
      fulfillment: 'unfulfilled',
    },
    {
      legacy: 'completed',
      transaction: null,
      refunds: 0,
      order: 'completed',
      payment: 'not_recorded',
      fulfillment: 'fulfilled',
    },
    {
      legacy: 'cancelled',
      transaction: 'succeeded',
      refunds: 0,
      order: 'cancelled',
      payment: 'paid',
      fulfillment: 'unfulfilled',
    },
    {
      legacy: 'processing',
      transaction: 'succeeded',
      refunds: 500,
      order: 'open',
      payment: 'partially_refunded',
      fulfillment: 'unfulfilled',
    },
    {
      legacy: 'refunded',
      transaction: 'refunded',
      refunds: 2000,
      order: 'open',
      payment: 'refunded',
      fulfillment: 'unfulfilled',
    },
    {
      legacy: 'processing',
      transaction: 'pending',
      refunds: 0,
      order: 'open',
      payment: 'pending',
      fulfillment: 'unfulfilled',
    },
    {
      legacy: 'processing',
      transaction: 'failed',
      refunds: 0,
      order: 'open',
      payment: 'failed',
      fulfillment: 'unfulfilled',
    },
  ]
  const ids: number[] = []
  for (const fixture of cases) {
    const result = await db.execute(sql`
      INSERT INTO orders (status, amount, subtotal, currency, customer_email, product_refund_total)
      VALUES (${fixture.legacy}::enum_orders_status, 2000, 2000, 'USD', ${`migration-${randomUUID()}@example.com`}, ${fixture.refunds})
      RETURNING id
    `)
    const id = Number(result.rows[0].id)
    ids.push(id)
    await db.execute(
      sql`INSERT INTO orders_items (id, _parent_id, _order, quantity) VALUES (${randomUUID()}, ${id}, 1, 2)`,
    )
    if (fixture.transaction) {
      await db.execute(
        sql`INSERT INTO transactions (order_id, status, amount, currency) VALUES (${id}, ${fixture.transaction}::enum_transactions_status, 2000, 'USD')`,
      )
    }
  }
  await payload.db.migrate({ migrations: adapterMigrations })
  const verify = async () => {
    for (const [index, fixture] of cases.entries()) {
      const result = await db.execute(sql`SELECT * FROM orders WHERE id = ${ids[index]}`)
      const order = result.rows[0]
      assert.equal(order.order_status, fixture.order)
      assert.equal(order.payment_status, fixture.payment)
      assert.equal(order.fulfillment_status, fixture.fulfillment)
      assert.equal(order.return_status, 'none')
      assert.equal(Number(order.amount), 2000)
      assert.equal(Number(order.product_refund_total), fixture.refunds)
      const items = await db.execute(
        sql`SELECT quantity FROM orders_items WHERE _parent_id = ${ids[index]}`,
      )
      assert.equal(Number(items.rows[0].quantity), 2)
    }
  }
  await verify()
  const req = await createLocalReq({}, payload)
  const workflowMigrations = migrations.slice(firstWorkflow)
  await db.transaction(async (transaction) => {
    for (const migration of [...workflowMigrations].reverse())
      await migration.down({ db: transaction, payload, req })
    for (const migration of workflowMigrations)
      await migration.up({ db: transaction, payload, req })
  })
  await verify()
  for (const id of ids) {
    await db.execute(sql`DELETE FROM transactions WHERE order_id = ${id}`)
    await db.execute(sql`DELETE FROM orders WHERE id = ${id}`)
  }
  console.log(
    'Order migrations passed: historical state backfill, preserved totals/items, and rollback/reapply.',
  )
} finally {
  await payload.destroy()
}
process.exit(0)
