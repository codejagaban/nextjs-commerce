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

const collections: CollectionSlug[] = [
  'categories',
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
  { file: 'landscape-hero-01.jpg', alt: 'Sunlit Mediterranean hillside olive grove at golden hour', by: 'Luca Micheli' },
  { file: 'landscape-hero-02.jpg', alt: 'Rows of olive trees stretching toward warm horizon light', by: 'Chris Weiher' },
  { file: 'landscape-hero-03.jpg', alt: 'Terraced olive grove bathed in late afternoon sun', by: 'Danilo Rios' },
  { file: 'olive-grove-01.jpg', alt: 'Gnarled olive trees in a quiet estate grove', by: 'Roberto Nickson' },
  { file: 'olive-grove-02.jpg', alt: 'Silver-green olive foliage catching the light', by: 'Susana Bartolome' },
  { file: 'olive-oil-bottle-01.jpg', alt: 'Bottle of extra virgin olive oil on a warm surface', by: 'Kelly Sikkema' },
  { file: 'olive-oil-bottle-02.jpg', alt: 'Amber glass olive oil bottle, studio light', by: 'Zoshua Colah' },
  { file: 'olive-oil-bottle-03.jpg', alt: 'Estate olive oil bottle beside fresh produce', by: 'Christin Hume' },
  { file: 'olives-closeup-01.jpg', alt: 'Ripe green olives on the branch', by: 'Sixteen Miles Out' },
  { file: 'olives-closeup-02.jpg', alt: 'Freshly harvested olives in close detail', by: 'Kelis' },
  { file: 'olives-closeup-03.jpg', alt: 'Olives ripening in warm sunlight', by: 'Mohamed Fsili' },
  { file: 'olive-oil-drizzle-01.jpg', alt: 'Golden olive oil poured over a dish', by: 'Ahmet Koç' },
  { file: 'olive-oil-drizzle-02.jpg', alt: 'Olive oil drizzling onto rustic bread', by: 'Karolina Ferretis' },
  { file: 'sea-salt-01.jpg', alt: 'Flaky hand-harvested sea salt', by: 'Jason Tuinstra' },
  { file: 'honey-01.jpg', alt: 'Raw honey with a wooden dipper', by: 'Arwin Neil Baichoo' },
  { file: 'pantry-bottles-01.jpg', alt: 'Dark pantry bottles in a warm still life', by: 'Annie Spratt' },
  { file: 'table-spread-01.jpg', alt: 'Mediterranean table spread in warm tones', by: 'Victoria Morgan' },
  { file: 'table-spread-02.jpg', alt: 'Rustic shared meal of Mediterranean dishes', by: 'Anya Chernykh' },
]

const categoryDefs = [
  { title: 'Olive Oil', slug: 'olive-oil' },
  { title: 'Vinegar', slug: 'vinegar' },
  { title: 'Pantry', slug: 'pantry' },
  { title: 'Honey', slug: 'honey' },
  { title: 'Gifts', slug: 'gifts' },
]

const sizeOptions = [
  { label: '250ml', value: '250ml' },
  { label: '500ml', value: '500ml' },
  { label: '1L', value: '1l' },
]

// Oils carry a size axis; prices are per size.
const oilDefs = [
  {
    title: 'Arbequina Extra Virgin Olive Oil',
    slug: 'arbequina-extra-virgin',
    category: 'olive-oil',
    gallery: ['olive-oil-bottle-01.jpg', 'olive-oil-drizzle-01.jpg'],
    description:
      'Soft and buttery, with almond and ripe apple. Our most approachable oil — the one we reach for every day.',
    prices: { '250ml': 19, '500ml': 32, '1l': 54 },
  },
  {
    title: 'Koroneiki Robust Olive Oil',
    slug: 'koroneiki-robust',
    category: 'olive-oil',
    gallery: ['olive-oil-bottle-02.jpg', 'olives-closeup-01.jpg'],
    description:
      'Green, peppery and bold, with a herbaceous bite that lingers. Pressed within hours of the harvest.',
    prices: { '250ml': 21, '500ml': 36, '1l': 60 },
  },
  {
    title: 'Picual Estate Reserve',
    slug: 'picual-estate-reserve',
    category: 'olive-oil',
    gallery: ['olive-oil-bottle-03.jpg', 'olive-grove-01.jpg'],
    description:
      'Our single-grove reserve: fig leaf, tomato vine and a warm, grassy finish. A limited pressing each year.',
    prices: { '250ml': 24, '500ml': 42, '1l': 68 },
  },
  {
    title: 'Hojiblanca Delicate',
    slug: 'hojiblanca-delicate',
    category: 'olive-oil',
    gallery: ['olive-oil-drizzle-02.jpg', 'olives-closeup-02.jpg'],
    description:
      'Gentle and golden, with almond blossom and a clean, sweet close. Finishing oil for fish and fresh greens.',
    prices: { '250ml': 20, '500ml': 34, '1l': 56 },
  },
]

// Simple pantry goods, single price.
const pantryDefs = [
  {
    title: 'Barrel-Aged Red Wine Vinegar',
    slug: 'barrel-aged-red-wine-vinegar',
    category: 'vinegar',
    gallery: ['pantry-bottles-01.jpg'],
    description: 'Aged in oak for a mellow, rounded acidity. Bright enough to lift a salad, soft enough to sip.',
    price: 18,
    inventory: 120,
  },
  {
    title: 'Hand-Harvested Sea Salt Flakes',
    slug: 'sea-salt-flakes',
    category: 'pantry',
    gallery: ['sea-salt-01.jpg'],
    description: 'Pyramid flakes raked by hand from coastal pans. A final, crunchy flourish for everything.',
    price: 12,
    inventory: 200,
  },
  {
    title: 'Wildflower Raw Honey',
    slug: 'wildflower-raw-honey',
    category: 'honey',
    gallery: ['honey-01.jpg'],
    description: 'Unfiltered and unheated, gathered from hillside wildflowers. Floral, amber and slow to pour.',
    price: 16,
    inventory: 150,
  },
  {
    title: 'The Harvest Gift Box',
    slug: 'harvest-gift-box',
    category: 'gifts',
    gallery: ['table-spread-01.jpg', 'table-spread-02.jpg'],
    description:
      'Our story in one box: a 500ml Arbequina, sea salt, wildflower honey and barrel-aged vinegar, in a linen wrap.',
    price: 78,
    inventory: 40,
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
        priceInUSDEnabled: true,
        priceInUSD: usd(def.prices['250ml']),
        categories: [categories[def.category].id],
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
          priceInUSDEnabled: true,
          priceInUSD: usd((def.prices as any)[opt.value]),
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
        priceInUSDEnabled: true,
        priceInUSD: usd(def.price),
        categories: [categories[def.category].id],
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
          heading('h1', 'From one grove, pressed the same day it is picked.'),
          para(
            'Marisol began on a single terraced hillside above the sea. We still harvest by hand and press within hours, because that is the only way to keep the fruit in the bottle.',
          ),
        ]),
        links: [],
      },
      layout: [
        {
          blockType: 'mediaBlock',
          blockName: 'Grove',
          media: media['olive-grove-01.jpg'].id,
        },
        {
          blockType: 'content',
          blockName: 'Philosophy',
          columns: [
            {
              size: 'half',
              richText: root([
                heading('h2', 'Slow by choice'),
                para(
                  'Small lots, real dates, nothing rushed. Every pressing is traceable to the week it left the tree.',
                ),
              ]),
            },
            {
              size: 'half',
              richText: root([
                heading('h2', 'Grown, not sourced'),
                para(
                  'We farm what we sell. The oils, the salt cured on our coast, the honey from the hives at the grove’s edge.',
                ),
              ]),
            },
          ],
        },
        {
          blockType: 'cta',
          blockName: 'Shop CTA',
          richText: root([
            heading('h3', 'Taste this season’s harvest'),
            para('The current pressing is bottled and ready. It changes with the year — this is how it tastes now.'),
          ]),
          links: [
            {
              link: { type: 'custom', appearance: 'default', label: 'Shop the harvest', url: '/shop' },
            },
          ],
        },
      ],
      meta: {
        title: 'Our Story | Marisol',
        description:
          'Single-estate olive oil and Mediterranean pantry, harvested by hand and pressed the same day.',
        image: media['landscape-hero-01.jpg'].id,
      },
    } as any,
  })

  payload.logger.info('— Seeding globals…')
  await Promise.all([
    payload.updateGlobal({
      slug: 'header',
      data: {
        navItems: [
          { link: { type: 'custom', label: 'Shop', url: '/shop' } },
          { link: { type: 'custom', label: 'Olive Oil', url: '/shop?category=olive-oil' } },
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
  ])

  payload.logger.info('Seeded Marisol demo data successfully.')
  void customer
}
