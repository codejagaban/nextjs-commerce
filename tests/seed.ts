import { testEnvironment } from './environment.mjs'
import { readFile } from 'node:fs/promises'
import { getPayload } from 'payload'

Object.assign(process.env, testEnvironment())
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
console.log('Test database connected. Preparing browser fixtures.')
try {
  for (const [email, role] of [
    ['admin@commerce-test.example', 'admin'],
    ['customer@commerce-test.example', 'customer'],
  ] as const) {
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
    })
    if (!existing.docs.length)
      await payload.create({
        collection: 'users',
        data: {
          email,
          password: 'CommerceTest123!',
          name: 'Test Customer',
          roles: [role],
        },
      })
  }
  console.log('Test accounts ready.')
  await payload.updateGlobal({ slug: 'settings', data: { storeName: 'Marisol', currency: 'USD' } })
  const existing = await payload.find({
    collection: 'products',
    where: { slug: { equals: 'test-vitamin-c-serum' } },
  })
  if (!existing.docs.length) {
    const data = await readFile('src/endpoints/seed/assets/serum-01.jpg')
    const image = await payload.create({
      collection: 'media',
      data: { alt: 'Test serum bottle' },
      file: {
        name: 'commerce-test-serum.jpg',
        data,
        mimetype: 'image/jpeg',
        size: data.byteLength,
      },
    })
    const category = await payload.create({
      collection: 'categories',
      data: { title: 'Serums', slug: 'serums' },
    })
    const type = await payload.create({
      collection: 'variantTypes',
      data: { name: 'size', label: 'Size' },
    })
    const product = await payload.create({
      collection: 'products',
      data: {
        title: 'Test Vitamin C Serum',
        slug: 'test-vitamin-c-serum',
        _status: 'published',
        enableVariants: true,
        variantTypes: [type.id],
        categories: [category.id],
        gallery: [{ image: image.id }],
        priceInUSDEnabled: true,
        priceInUSD: 2500,
        meta: { description: 'Brightening skincare for the test catalogue.' },
      },
    })
    for (const [label, price] of [
      ['30ml', 2500],
      ['60ml', 4000],
    ] as const) {
      const option = await payload.create({
        collection: 'variantOptions',
        data: {
          label,
          value: label,
          variantType: type.id,
        },
      })
      await payload.create({
        collection: 'variants',
        data: {
          product: product.id,
          options: [option.id],
          inventory: 20,
          _status: 'published',
          priceInUSDEnabled: true,
          priceInUSD: price,
        },
      })
    }
    await payload.create({
      collection: 'products',
      data: {
        title: 'Test Sold Out Cream',
        slug: 'test-sold-out-cream',
        _status: 'published',
        gallery: [{ image: image.id }],
        priceInUSDEnabled: true,
        priceInUSD: 1800,
        inventory: 0,
      },
    })
  }
  console.log('Browser fixtures ready.')
} finally {
  await payload.destroy()
}
// Payload's Postgres adapter retains its reconnect listener and pool after destroy.
// This CLI exits only after every fixture write and teardown has completed.
process.exit(0)
