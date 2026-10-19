import { getPayload } from 'payload'
import { testEnvironment } from '../environment.mjs'

// Validate before loading Payload, which otherwise reads the developer's database.
testEnvironment()
if (process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL)
  throw new Error('Bootstrap database mismatch.')
const email = process.env.SMOKE_ADMIN_EMAIL!
if (!/^smoke-admin-[a-f0-9-]+@commerce-test\.example$/.test(email))
  throw new Error('Unexpected bootstrap email.')
const { default: config } = await import('../../src/payload.config')
const payload = await getPayload({ config })
try {
  if (process.argv.includes('--cleanup')) {
    for (const user of (
      await payload.find({ collection: 'users', where: { email: { equals: email } } })
    ).docs) {
      await payload.delete({ collection: 'users', id: user.id })
    }
  } else {
    await payload.create({
      collection: 'users',
      data: { email, password: process.env.SMOKE_ADMIN_PASSWORD!, roles: ['admin'] },
    })
  }
} finally {
  await payload.destroy()
}
process.exit(0)
