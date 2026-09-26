import configPromise from '@payload-config'
import { getPayload } from 'payload'

import snapshot from '../src/migrations/20260926_225747_initial_schema.json'

const BASELINE = '20260926_225747_initial_schema'

if (process.env.ADOPT_EXISTING_SCHEMA !== 'true') {
  throw new Error(
    'Refusing to modify migration history. Re-run with ADOPT_EXISTING_SCHEMA=true after backing up the existing database.',
  )
}

const payload = await getPayload({ config: configPromise })
const client = await payload.db.pool.connect()

try {
  const expected = Object.values(snapshot.tables).flatMap((table) =>
    Object.values(table.columns).map((column) => `${table.name}.${column.name}`),
  )
  const { rows } = await client.query<{ column: string }>(`
    select table_name || '.' || column_name as column
    from information_schema.columns
    where table_schema = 'public'
  `)
  const actual = new Set(rows.map(({ column }) => column))
  const missing = expected.filter((column) => !actual.has(column))

  if (missing.length) {
    throw new Error(
      `The existing database does not match the baseline migration. Missing columns: ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ` and ${missing.length - 12} more` : ''}.`,
    )
  }

  await client.query('begin')
  const existing = await client.query<{ id: number }>(
    'select id from payload_migrations where name = $1 limit 1',
    [BASELINE],
  )

  if (existing.rowCount) {
    payload.logger.info(`Baseline migration ${BASELINE} is already recorded.`)
  } else {
    await client.query(
      `insert into payload_migrations (name, batch, updated_at, created_at)
       values ($1, 1, now(), now())`,
      [BASELINE],
    )
    payload.logger.info(`Recorded baseline migration ${BASELINE} without changing store data.`)
  }

  // Payload records this sentinel whenever development push mode runs. It
  // intentionally makes production migrations interactive, so an adopted
  // production database must drop the sentinel after the full schema check.
  await client.query("delete from payload_migrations where name = 'dev'")
  await client.query('commit')
} catch (error) {
  await client.query('rollback').catch(() => undefined)
  throw error
} finally {
  client.release()
  await payload.destroy()
}
