/**
 * Seed the Marisol demo store.
 *
 *   pnpm seed
 *
 * Wipes the demo collections and repopulates products, media, pages and globals,
 * and creates an admin login (admin@marisol.store / marisol-admin).
 *
 * Uses top-level await so `payload run` keeps the process alive until seeding
 * finishes (a plain un-awaited call would be cut off during init).
 */
import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'

import { seed } from '@/endpoints/seed'

const payload = await getPayload({ config })
const req = await createLocalReq({}, payload)
await seed({ payload, req })
payload.logger.info('Seed complete.')
process.exit(0)
