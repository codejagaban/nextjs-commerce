import type { APIRequestContext } from '@playwright/test'

export type Document = { id: number; [key: string]: unknown }

export async function listRecords(
  api: APIRequestContext,
  collection: string,
  field: string,
  value: string | number,
) {
  const query = new URLSearchParams({
    depth: '0',
    limit: '100',
    [`where[${field}][equals]`]: String(value),
  })
  const response = await api.get(`/api/${collection}?${query}`)
  if (!response.ok()) throw new Error(`Could not list ${collection}: HTTP ${response.status()}.`)
  const body = (await response.json()) as { docs: Document[]; hasNextPage?: boolean }
  if (body.hasNextPage)
    throw new Error(`Unexpectedly many smoke-test ${collection}; refusing partial cleanup.`)
  return body.docs
}

/** Exact run identifiers only. Never delete by a broad prefix, timestamp, or test domain. */
export async function cleanupRecords(
  api: APIRequestContext,
  run: { email: string; slug: string; mediaName: string },
) {
  const failures: string[] = []
  const attempt = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn()
    } catch {
      failures.push(label)
    }
  }
  const remove = async (collection: string, id: number) => {
    const response = await api.delete(`/api/${collection}/${id}`)
    if (!response.ok() && response.status() !== 404)
      throw new Error(`Delete ${collection}/${id} failed.`)
    const check = await api.get(`/api/${collection}/${id}?depth=0`)
    if (check.status() !== 404) throw new Error(`Deleted ${collection}/${id} is still present.`)
  }
  await attempt('Customer lookup', async () => {
    for (const user of await listRecords(api, 'users', 'email', run.email)) {
      if (user.email !== run.email) throw new Error('Customer lookup returned an unrelated record.')
      // Keep the customer as a cleanup anchor if any dependent deletion failed.
      const before = failures.length
      for (const collection of ['orders', 'transactions', 'carts', 'addresses']) {
        await attempt(`${collection} lookup for customer ${user.id}`, async () => {
          for (const doc of await listRecords(api, collection, 'customer', user.id)) {
            if (doc.customer !== user.id)
              throw new Error('Cleanup lookup returned an unrelated record.')
            await attempt(`${collection}/${doc.id}`, () => remove(collection, doc.id))
          }
        })
      }
      if (failures.length === before)
        await attempt(`users/${user.id}`, () => remove('users', user.id))
    }
  })
  for (const [collection, field, value] of [
    ['products', 'slug', run.slug],
    ['media', 'filename', run.mediaName],
  ]) {
    if (failures.length) break
    await attempt(`${collection} lookup`, async () => {
      for (const doc of await listRecords(api, collection, field, value)) {
        if (doc[field] !== value) throw new Error('Fixture lookup returned an unrelated record.')
        await attempt(`${collection}/${doc.id}`, () => remove(collection, doc.id))
      }
    })
  }
  if (failures.length)
    throw new Error(`Smoke cleanup incomplete (${run.slug}): ${failures.join(', ')}.`)
}
