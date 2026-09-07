/**
 * Seed demo sales history.
 *
 *   pnpm seed:orders            # replaces existing orders with 90 days of demo sales
 *   pnpm seed:orders -- --keep  # adds to whatever is already there
 *
 * Additive by design: it touches the `orders` collection and nothing else, so it
 * is safe to run against a working store without losing products, pages or media
 * the way a full `pnpm seed` would.
 *
 * These are clearly demo orders — customerEmail is @example.com throughout — so a
 * real store can delete them in one filtered selection.
 */
import { getPayload } from 'payload'
import config from '@payload-config'

const DAYS = 90
const KEEP = process.argv.includes('--keep')

/** Deterministic so repeat runs produce the same history. */
let seedState = 20260907
const rand = () => {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296
  return seedState / 4294967296
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))

const NAMES = [
  ['Ada', 'Mensah'], ['Ines', 'Vargas'], ['Tom', 'Oyelaran'], ['Sofia', 'Almeida'],
  ['Ruth', 'Kimani'], ['Noor', 'Haddad'], ['Elena', 'Fischer'], ['Kai', 'Nakamura'],
  ['Yara', 'Costa'], ['Jonas', 'Berg'],
]
const CITIES: Array<[string, string, string, string]> = [
  ['Lisbon', 'Lisboa', '1100-148', 'PT'],
  ['Portland', 'OR', '97201', 'US'],
  ['Manchester', 'Greater Manchester', 'M1 4BT', 'GB'],
  ['Copenhagen', 'Hovedstaden', '1050', 'DK'],
  ['Austin', 'TX', '78701', 'US'],
]

const payload = await getPayload({ config })

if (!KEEP) {
  const existing = await payload.count({ collection: 'orders' })
  if (existing.totalDocs > 0) {
    await payload.delete({ collection: 'orders', where: { id: { exists: true } } })
    payload.logger.info(`Removed ${existing.totalDocs} existing order(s).`)
  }
}

const products = await payload.find({
  collection: 'products',
  depth: 0,
  limit: 100,
  where: { _status: { equals: 'published' } },
})
const variants = await payload.find({ collection: 'variants', depth: 0, limit: 100 })

if (products.docs.length === 0) {
  payload.logger.error('No published products found. Run `pnpm seed` first.')
  process.exit(1)
}

const priceOf = (productID: number | string, variantID?: number | string) => {
  if (variantID) {
    const v = variants.docs.find((x) => x.id === variantID)
    if (v && typeof v.priceInUSD === 'number') return v.priceInUSD
  }
  const p = products.docs.find((x) => x.id === productID)
  return typeof p?.priceInUSD === 'number' ? p.priceInUSD : 2500
}

/** Variant products must carry a variant, so the line resolves to a real price. */
const lineFor = () => {
  const product = pick(products.docs)
  const forThis = variants.docs.filter((v) => {
    const rel = (v as { product?: unknown }).product
    const relID = typeof rel === 'object' && rel ? (rel as { id?: unknown }).id : rel
    return relID === product.id
  })
  const variant = product.enableVariants && forThis.length ? pick(forThis) : undefined
  return { product: product.id, ...(variant ? { variant: variant.id } : {}), quantity: between(1, 2) }
}

let created = 0
let revenue = 0

for (let dayOffset = DAYS - 1; dayOffset >= 0; dayOffset--) {
  const day = new Date()
  day.setUTCHours(0, 0, 0, 0)
  day.setUTCDate(day.getUTCDate() - dayOffset)

  const weekday = day.getUTCDay()
  const isWeekend = weekday === 0 || weekday === 6
  // A gentle upward trend so the chart reads as a store finding its feet.
  const growth = 1 + ((DAYS - dayOffset) / DAYS) * 0.8
  const base = (isWeekend ? 1.5 : 3) * growth
  const count = Math.max(0, Math.round(base + (rand() * 2 - 1)))

  for (let i = 0; i < count; i++) {
    const items = Array.from({ length: between(1, 3) }, lineFor)
    const amount = items.reduce(
      (sum, it) => sum + priceOf(it.product, (it as { variant?: number }).variant) * it.quantity,
      0,
    )

    const roll = rand()
    const status = roll > 0.94 ? 'cancelled' : roll > 0.88 ? 'processing' : 'completed'

    const [first, last] = pick(NAMES)
    const [city, state, postalCode, country] = pick(CITIES)
    const placedAt = new Date(day)
    placedAt.setUTCHours(between(7, 21), between(0, 59), 0, 0)

    await payload.create({
      collection: 'orders',
      data: {
        amount,
        currency: 'USD',
        customerEmail: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
        items,
        status,
        shippingAddress: {
          firstName: first,
          lastName: last,
          addressLine1: `${between(1, 240)} ${pick(['Rua das Flores', 'Alder Street', 'Oak Lane', 'Nørregade', 'Congress Ave'])}`,
          city,
          state,
          postalCode,
          country,
        },
        createdAt: placedAt.toISOString(),
        updatedAt: placedAt.toISOString(),
      },
    })

    created += 1
    if (status !== 'cancelled') revenue += amount
  }
}

payload.logger.info(
  `Seeded ${created} demo orders across ${DAYS} days — $${(revenue / 100).toFixed(2)} in non-cancelled revenue.`,
)
process.exit(0)
