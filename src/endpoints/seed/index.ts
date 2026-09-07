import type { CollectionSlug, File, GlobalSlug, Payload, PayloadRequest } from 'payload'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/* -------------------------------------------------------------------------- */
/*  Lexical rich-text helpers (keeps the seed readable instead of 1000 lines)  */
/* -------------------------------------------------------------------------- */

const txt = (text: string, format = 0) => ({
  type: 'text',
  detail: 0,
  format,
  mode: 'normal',
  style: '',
  text,
  version: 1,
})

const para = (children: any) => ({
  type: 'paragraph',
  direction: 'ltr',
  format: '',
  indent: 0,
  textFormat: 0,
  version: 1,
  children: typeof children === 'string' ? [txt(children)] : children,
})

const heading = (tag: 'h1' | 'h2' | 'h3' | 'h4', text: string) => ({
  type: 'heading',
  tag,
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 1,
  children: [txt(text)],
})

const link = (text: string, url: string, newTab = false) => ({
  type: 'link',
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 3,
  fields: { linkType: 'custom', newTab, url },
  children: [txt(text)],
})

const root = (children: any[]): any => ({
  root: { type: 'root', direction: 'ltr', format: '', indent: 0, version: 1, children },
})

const credit = (name: string): any =>
  root([para(`Photograph by ${name} on Unsplash.`)])

/* -------------------------------------------------------------------------- */
/*  Data definitions                                                           */
/* -------------------------------------------------------------------------- */

const usd = (dollars: number) => Math.round(dollars * 100)

/**
 * Demo prices in the other supported currencies.
 *
 * Nothing is converted at runtime — each currency holds its own amount — so the
 * demo needs a real figure per currency. These are the kind of round retail
 * prices a shop actually sets, derived from the dollar price and rounded to a
 * tidy ending rather than a spot exchange rate.
 */
const retail = (dollars: number, factor: number) => {
  const raw = dollars * factor
  return Math.round(raw) * 100 - 5 // e.g. 26.7 -> 26.95
}

const prices = (dollars: number) => ({
  priceInUSDEnabled: true,
  priceInUSD: usd(dollars),
  priceInEUREnabled: true,
  priceInEUR: retail(dollars, 0.94),
  priceInGBPEnabled: true,
  priceInGBP: retail(dollars, 0.81),
})

const collections: CollectionSlug[] = [
  'categories',
  'tags',
  'media',
  'pages',
  'products',
  'forms',
  'form-submissions',
  'variants',
  'variantOptions',
  'variantTypes',
  'carts',
  'transactions',
  'addresses',
  'orders',
]

const globals: GlobalSlug[] = ['header', 'footer']

type MediaDef = { file: string; alt: string; by: string }

const mediaDefs: MediaDef[] = [
  { file: 'model-portrait-01.jpg', alt: 'Model with glowing, healthy skin in soft light', by: 'Laura Jaeger' },
  { file: 'model-portrait-02.jpg', alt: 'Applying moisturiser to the cheek', by: 'Leighann Blackwood' },
  { file: 'model-portrait-03.jpg', alt: 'Applying a facial serum with a dropper', by: 'CRYSTALWEED cannabis' },
  { file: 'model-portrait-04.jpg', alt: 'Holding a dropper of facial oil', by: 'Mathilde Langevin' },
  { file: 'serum-01.jpg', alt: 'Amber facial oil with dropper on a soft pink background', by: 'Maria Lupan' },
  { file: 'serum-02.jpg', alt: 'Matte dropper serum bottle in studio light', by: 'Mockup Free' },
  { file: 'serum-03.jpg', alt: 'Amber serum bottle catching soft shadows', by: 'Kadarius Seegars' },
  { file: 'serum-04.jpg', alt: 'White dropper serum bottle on marble', by: 'Content Pixie' },
  { file: 'cream-jar-01.jpg', alt: 'Moisturiser jar beside fresh flowers', by: 'Keity' },
  { file: 'cream-jar-02.jpg', alt: 'Premium night cream jar, softly lit', by: 'Pavlo Talpa' },
  { file: 'pump-01.jpg', alt: 'Pump bottle floating on a cream background', by: 'Mockup Free' },
  { file: 'pump-02.jpg', alt: 'Skincare tube resting on a magazine', by: 'Ana Nogrey' },
  { file: 'pump-03.jpg', alt: 'Matte pump bottle in studio light', by: 'Mockup Free' },
  { file: 'still-life-01.jpg', alt: 'Serum textures in glass dishes with a leaf', by: 'ibnu ihza' },
  { file: 'still-life-02.jpg', alt: 'Gel textures and botanicals, flat lay', by: 'ibnu ihza' },
  { file: 'lifestyle-01.jpg', alt: 'Cream swatch on a warm background', by: 'Kelsey Curtis' },
  { file: 'lifestyle-02.jpg', alt: 'Skincare in the hand under soft pink light', by: 'ian dooley' },
  { file: 'lifestyle-03.jpg', alt: 'Smiling person applying cream, wearing a headband', by: 'Cheyenne Doig' },
]

const categoryDefs = [
  { title: 'Skin Care', slug: 'skin-care' },
  { title: 'Serums', slug: 'serums' },
  { title: 'Moisturisers', slug: 'moisturisers' },
  { title: 'Cleansers', slug: 'cleansers' },
  { title: 'Oils', slug: 'oils' },
  { title: 'Body Products', slug: 'body' },
  { title: 'Anti-aging Care', slug: 'anti-aging' },
  { title: 'Organic Products', slug: 'organic' },
]

// Attribute tags, grouped into filter facets on the shop page.
const tagDefs = [
  { title: 'Dry', slug: 'dry', group: 'Skin Type' },
  { title: 'Oily', slug: 'oily', group: 'Skin Type' },
  { title: 'Combination', slug: 'combination', group: 'Skin Type' },
  { title: 'Sensitive', slug: 'sensitive', group: 'Skin Type' },
  { title: 'Normal', slug: 'normal', group: 'Skin Type' },
  { title: 'Hydration', slug: 'hydration', group: 'Concern' },
  { title: 'Brightening', slug: 'brightening', group: 'Concern' },
  { title: 'Firming', slug: 'firming', group: 'Concern' },
  { title: 'Blemish control', slug: 'blemish-control', group: 'Concern' },
  { title: 'Calming', slug: 'calming', group: 'Concern' },
]

const sizeOptions = [
  { label: '30ml', value: '30ml' },
  { label: '50ml', value: '50ml' },
]

// Serums carry a size axis; prices are per size. (kept as `oilDefs` for the loop below)
const oilDefs = [
  {
    title: 'Vitamin C Brightening Serum',
    slug: 'vitamin-c-brightening-serum',
    categories: ['skin-care', 'serums'],
    tags: ['normal', 'combination', 'brightening'],
    gallery: ['serum-03.jpg', 'lifestyle-01.jpg'],
    description:
      'A stable 15% vitamin C that evens tone and lends skin a lit-from-within glow. Light, fast-absorbing, non-greasy.',
    prices: { '30ml': 38, '50ml': 54 },
  },
  {
    title: 'Hyaluronic Hydra Serum',
    slug: 'hyaluronic-hydra-serum',
    categories: ['skin-care', 'serums'],
    tags: ['dry', 'sensitive', 'hydration'],
    gallery: ['serum-04.jpg', 'still-life-01.jpg'],
    description:
      'Multi-weight hyaluronic acid draws moisture deep into the skin for a plump, dewy finish that lasts all day.',
    prices: { '30ml': 34, '50ml': 48 },
  },
]

// Simple products, single price. (kept as `pantryDefs` for the loop below)
const pantryDefs = [
  {
    title: 'Niacinamide Oil Booster',
    slug: 'niacinamide-oil-booster',
    categories: ['skin-care', 'serums', 'oils'],
    tags: ['oily', 'combination', 'blemish-control', 'calming'],
    gallery: ['serum-02.jpg', 'lifestyle-02.jpg'],
    description: 'A 5% niacinamide booster that refines pores and calms redness, worn alone or mixed into your cream.',
    price: 32,
    inventory: 140,
  },
  {
    title: 'Rosehip Facial Oil',
    slug: 'rosehip-facial-oil',
    categories: ['organic', 'oils'],
    tags: ['dry', 'normal', 'firming', 'hydration'],
    gallery: ['serum-01.jpg', 'lifestyle-02.jpg'],
    description: 'Cold-pressed organic rosehip, rich in omegas, to nourish and soften while you sleep. One dropper is plenty.',
    price: 28,
    inventory: 160,
  },
  {
    title: 'Retinol Renewal Night Cream',
    slug: 'retinol-renewal-night-cream',
    categories: ['anti-aging', 'moisturisers'],
    tags: ['normal', 'combination', 'firming'],
    gallery: ['cream-jar-02.jpg'],
    description: 'Encapsulated retinol smooths fine lines overnight, buffered with ceramides so skin wakes calm, not tight.',
    price: 46,
    inventory: 90,
  },
  {
    title: 'Hydrating Day Moisturiser',
    slug: 'hydrating-day-moisturiser',
    categories: ['skin-care', 'moisturisers'],
    tags: ['dry', 'sensitive', 'normal', 'hydration'],
    gallery: ['cream-jar-01.jpg'],
    description: 'A weightless daily moisturiser with squalane and glycerin that sits beautifully under sunscreen and makeup.',
    price: 30,
    inventory: 180,
  },
  {
    title: 'Gentle Foaming Cleanser',
    slug: 'gentle-foaming-cleanser',
    categories: ['skin-care', 'cleansers'],
    tags: ['sensitive', 'calming'],
    gallery: ['pump-03.jpg'],
    description: 'A soft, sulphate-free foam that lifts away the day without stripping. Leaves skin clean, never squeaky.',
    price: 22,
    inventory: 220,
  },
  {
    title: 'Marine Mineral Body Lotion',
    slug: 'marine-mineral-body-lotion',
    categories: ['body'],
    tags: ['dry', 'hydration'],
    gallery: ['pump-02.jpg'],
    description: 'A fast-sinking body lotion with sea minerals and shea, for skin that feels smooth from shoulders to toes.',
    price: 24,
    inventory: 150,
  },
  {
    title: 'Nourishing Body Wash',
    slug: 'nourishing-body-wash',
    categories: ['body'],
    tags: ['sensitive', 'hydration'],
    gallery: ['pump-01.jpg'],
    description: 'A creamy, low-foam wash that cleanses and conditions in one step, leaving a soft botanical scent.',
    price: 18,
    inventory: 200,
  },
]

/* -------------------------------------------------------------------------- */
/*  Seed                                                                        */
/* -------------------------------------------------------------------------- */

export const seed = async ({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}): Promise<void> => {
  payload.logger.info('Seeding Marisol demo data…')

  payload.logger.info('— Clearing collections and globals…')
  await Promise.all(
    globals.map((global) =>
      payload.updateGlobal({
        slug: global,
        data: { navItems: [] } as any,
        depth: 0,
        context: { disableRevalidate: true },
      }),
    ),
  )

  for (const collection of collections) {
    await payload.db.deleteMany({ collection, req, where: {} })
    if (payload.collections[collection]?.config.versions) {
      await payload.db.deleteVersions({ collection, req, where: {} })
    }
  }

  // Remove demo users so re-seeding is idempotent (keep any real admins you made).
  await payload.delete({
    collection: 'users',
    depth: 0,
    where: { email: { in: ['customer@example.com', 'admin@marisol.store'] } },
  })

  payload.logger.info('— Seeding users…')
  await payload.create({
    collection: 'users',
    data: {
      name: 'Marisol Admin',
      email: 'admin@marisol.store',
      password: 'marisol-admin',
      roles: ['admin'],
    } as any,
  })
  const customer = await payload.create({
    collection: 'users',
    data: {
      name: 'Customer',
      email: 'customer@example.com',
      password: 'password',
      roles: ['customer'],
    } as any,
  })

  payload.logger.info('— Seeding media…')
  const media: Record<string, any> = {}
  for (const def of mediaDefs) {
    const filePath = path.resolve(dirname, 'assets', def.file)
    const data = fs.readFileSync(filePath)
    const file: File = {
      name: def.file,
      data,
      mimetype: 'image/jpeg',
      size: data.byteLength,
    }
    media[def.file] = await payload.create({
      collection: 'media',
      data: { alt: def.alt, caption: credit(def.by) } as any,
      file,
    })
  }

  payload.logger.info('— Seeding categories…')
  const categories: Record<string, any> = {}
  for (const def of categoryDefs) {
    categories[def.slug] = await payload.create({
      collection: 'categories',
      data: { title: def.title, slug: def.slug } as any,
    })
  }

  payload.logger.info('— Seeding tags…')
  const tagDocs: Record<string, any> = {}
  for (const def of tagDefs) {
    tagDocs[def.slug] = await payload.create({
      collection: 'tags',
      data: { title: def.title, slug: def.slug, group: def.group } as any,
    })
  }

  payload.logger.info('— Seeding variant types and options…')
  const sizeType = await payload.create({
    collection: 'variantTypes',
    data: { name: 'size', label: 'Size' } as any,
  })
  const sizeOptionDocs: Record<string, any> = {}
  for (const opt of sizeOptions) {
    sizeOptionDocs[opt.value] = await payload.create({
      collection: 'variantOptions',
      data: { ...opt, variantType: sizeType.id } as any,
    })
  }

  payload.logger.info('— Seeding products…')

  // Oils (with size variants)
  for (const def of oilDefs) {
    const product = await payload.create({
      collection: 'products',
      depth: 0,
      data: {
        title: def.title,
        slug: def.slug,
        _status: 'published',
        enableVariants: true,
        variantTypes: [sizeType.id],
        inventory: 0,
        ...prices(def.prices['30ml']),
        categories: def.categories.map((c) => categories[c].id),
        tags: def.tags.map((t) => tagDocs[t].id),
        description: root([para(def.description)]),
        gallery: def.gallery.map((f) => ({ image: media[f].id })),
        meta: {
          title: `${def.title} | Marisol`,
          description: def.description,
          image: media[def.gallery[0]].id,
        },
      } as any,
    })

    for (const opt of sizeOptions) {
      await payload.create({
        collection: 'variants',
        depth: 0,
        data: {
          product: product.id,
          options: [sizeOptionDocs[opt.value].id],
          inventory: 80,
          ...prices((def.prices as any)[opt.value]),
          _status: 'published',
        } as any,
      })
    }
  }

  // Pantry goods (no variants)
  for (const def of pantryDefs) {
    await payload.create({
      collection: 'products',
      depth: 0,
      data: {
        title: def.title,
        slug: def.slug,
        _status: 'published',
        enableVariants: false,
        inventory: def.inventory,
        ...prices(def.price),
        categories: def.categories.map((c) => categories[c].id),
        tags: def.tags.map((t) => tagDocs[t].id),
        description: root([para(def.description)]),
        gallery: def.gallery.map((f) => ({ image: media[f].id })),
        meta: {
          title: `${def.title} | Marisol`,
          description: def.description,
          image: media[def.gallery[0]].id,
        },
      } as any,
    })
  }

  payload.logger.info('— Seeding pages…')
  await payload.create({
    collection: 'pages',
    depth: 0,
    context: { disableRevalidate: true },
    data: {
      slug: 'about',
      _status: 'published',
      title: 'Our Story',
      hero: {
        type: 'lowImpact',
        richText: root([
          heading('h1', 'Clean skincare for your skin’s natural radiance.'),
          para(
            'Marisol makes gentle, effective skincare with naturally-derived ingredients. No harsh fillers, no empty claims. Just formulas that help your skin look like the best version of itself.',
          ),
        ]),
        links: [],
      },
      layout: [
        {
          blockType: 'mediaBlock',
          blockName: 'Skin',
          media: media['model-portrait-02.jpg'].id,
        },
        {
          blockType: 'content',
          blockName: 'Philosophy',
          columns: [
            {
              size: 'half',
              richText: root([
                heading('h2', 'Pure ingredients'),
                para(
                  'Only clean, safe and carefully selected actives, at levels that actually do something. Every ingredient earns its place.',
                ),
              ]),
            },
            {
              size: 'half',
              richText: root([
                heading('h2', 'Kind to skin and planet'),
                para(
                  'Dermatologist-tested, cruelty-free formulas in recyclable packaging. Beauty that is good to your skin and gentle on the world.',
                ),
              ]),
            },
          ],
        },
        {
          blockType: 'cta',
          blockName: 'Shop CTA',
          richText: root([
            heading('h3', 'Build your ritual'),
            para('Cleanse, treat, hydrate. Start with a few essentials and grow your routine from there.'),
          ]),
          links: [
            {
              link: { type: 'custom', appearance: 'default', label: 'Shop skincare', url: '/shop' },
            },
          ],
        },
      ],
      meta: {
        title: 'Our Story | Marisol',
        description:
          'Clean, effective skincare made with naturally-derived ingredients, for skin’s natural radiance.',
        image: media['model-portrait-01.jpg'].id,
      },
    } as any,
  })

  payload.logger.info('— Seeding globals…')
  await Promise.all([
    payload.updateGlobal({
      slug: 'header',
      data: {
        navItems: [
          { link: { type: 'custom', label: 'Shop all', url: '/shop' } },
          { link: { type: 'custom', label: 'Skin care', url: '/shop?category=skin-care' } },
          { link: { type: 'custom', label: 'Our Story', url: '/about' } },
        ],
      } as any,
    }),
    payload.updateGlobal({
      slug: 'footer',
      data: {
        navItems: [
          { link: { type: 'custom', label: 'Shop', url: '/shop' } },
          { link: { type: 'custom', label: 'Our Story', url: '/about' } },
          { link: { type: 'custom', label: 'Find my order', url: '/find-order' } },
          { link: { type: 'custom', label: 'Admin', url: '/admin' } },
        ],
      } as any,
    }),
    // Fictional, like the rest of the demo brand — a clone replaces these first.
    payload.updateGlobal({
      slug: 'settings',
      data: {
        storeName: 'Marisol',
        currency: 'USD',
        tagline:
          "Clean, effective skincare made with naturally-derived ingredients, for skin's own natural radiance.",
        supportEmail: 'hello@marisol.store',
        social: [
          { platform: 'instagram', url: 'https://instagram.com/marisolskin' },
          { platform: 'tiktok', url: 'https://tiktok.com/@marisolskin' },
        ],
        metaTitle: 'Marisol — Clean skincare for your natural radiance',
        metaDescription:
          'Clean, effective skincare made with naturally-derived ingredients \u2014 cleansers, serums and moisturisers for skin\u2019s own natural radiance.',
      } as any,
      context: { disableRevalidate: true },
    }),
  ])

  payload.logger.info('Seeded Marisol demo data successfully.')
  void customer
}
