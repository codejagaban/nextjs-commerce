import type { Metadata } from 'next'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  images: [
    {
      url: '/brand/still-life-01.jpg',
      width: 1400,
      height: 800,
      alt: 'Skincare still life with botanical leaves',
    },
  ],
}

export const mergeOpenGraph = (og?: Partial<Metadata['openGraph']>): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
