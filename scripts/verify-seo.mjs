import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'

const origin = new URL(process.argv[2] || process.env.SITE_URL || 'http://localhost:3000').origin

async function request(path) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30000) })
  assert.equal(response.status, 200, `${path} returned ${response.status}`)
  return response
}

async function document(path) {
  const response = await request(path)
  const dom = new JSDOM(await response.text())
  return dom.window.document
}

function meta(doc, selector) {
  return doc.querySelector(selector)?.getAttribute('content')
}

function jsonLd(doc, type) {
  return [...doc.querySelectorAll('script[type="application/ld+json"]')]
    .map((script) => JSON.parse(script.textContent))
    .find((item) => item['@type'] === type)
}

async function image(url) {
  assert.ok(url, 'Open Graph image is missing')
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
  assert.equal(response.status, 200, `${url} returned ${response.status}`)
  assert.match(response.headers.get('content-type') || '', /^image\//, `${url} is not an image`)
}

async function main() {
  const robots = await (await request('/robots.txt')).text()
  assert.match(
    robots,
    new RegExp(`Sitemap: ${origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/sitemap\\.xml`),
  )

  const sitemap = new JSDOM(await (await request('/sitemap.xml')).text(), {
    contentType: 'text/xml',
  }).window.document
  const urls = [...sitemap.querySelectorAll('url > loc')].map((node) => node.textContent)
  assert.equal(urls.length, new Set(urls).size, 'Sitemap contains duplicate URLs')
  assert.ok(
    urls.some((url) => new URL(url).pathname === '/'),
    'Home is missing from sitemap',
  )
  assert.ok(
    urls.some((url) => new URL(url).pathname === '/shop'),
    'Shop is missing from sitemap',
  )
  assert.ok(
    urls.every((url) => new URL(url).origin === origin),
    'Sitemap uses another origin',
  )
  assert.ok(
    urls.every(
      (url) =>
        !/^\/(account|orders|checkout|login|create-account|forgot-password|reset-password|admin)(\/|$)/.test(
          new URL(url).pathname,
        ),
    ),
    'A private route appears in the sitemap',
  )

  const publicPaths = urls.map((url) => new URL(url).pathname)
  assert.ok(
    publicPaths.some((path) => path.startsWith('/products/')),
    'No product is listed in the sitemap',
  )
  for (const path of publicPaths) {
    const doc = await document(path)
    const canonical = doc.querySelector('link[rel="canonical"]')?.href
    assert.equal(new URL(canonical).origin, origin, `${path} has the wrong canonical origin`)
    assert.equal(new URL(canonical).pathname, path, `${path} has the wrong canonical path`)
    assert.equal(
      new URL(meta(doc, 'meta[property="og:url"]')).pathname,
      path,
      `${path} has the wrong Open Graph URL`,
    )
    await image(meta(doc, 'meta[property="og:image"]'))
    assert.doesNotMatch(
      meta(doc, 'meta[name="robots"]') || '',
      /noindex/,
      `${path} is blocked from indexing`,
    )

    if (path === '/') {
      const store = jsonLd(doc, 'OnlineStore')
      assert.ok(store?.name && store.url === `${origin}/`, 'Store JSON-LD is missing or invalid')
    }
    if (path.startsWith('/products/')) {
      const product = jsonLd(doc, 'Product')
      assert.ok(product?.name && product.url === canonical, 'Product JSON-LD is missing or invalid')
      assert.ok(
        product.offers?.price && /^[A-Z]{3}$/.test(product.offers.priceCurrency),
        'Product offer price or currency is invalid',
      )
      assert.ok(
        product.offers.availability?.startsWith('https://schema.org/'),
        'Product availability is invalid',
      )
      assert.ok(product.image?.length, 'Product JSON-LD image is missing')
      await image(product.image[0])
    }
  }

  for (const path of [
    '/login',
    '/create-account',
    '/forgot-password',
    '/reset-password',
    '/account',
    '/orders',
    '/checkout',
    '/checkout/confirm-order',
    '/admin',
  ]) {
    const doc = await document(path)
    assert.match(meta(doc, 'meta[name="robots"]') || '', /noindex/, `${path} is indexable`)
  }

  console.log(
    `SEO checks passed for ${origin}: ${urls.length} sitemap URLs, public metadata, images, structured data and private routes.`,
  )
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
