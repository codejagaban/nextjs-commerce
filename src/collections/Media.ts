import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'

import { adminOnly } from '@/access/adminOnly'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Media: CollectionConfig = {
  admin: {
    group: 'Content',
  },
  slug: 'media',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: () => true,
    update: adminOnly,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'caption',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
  ],
  /**
   * Derivatives are generated once, at upload, by sharp — not per request by an
   * image CDN. The storefront then serves fixed files, so no transformation is
   * ever metered and the delivery cost is the bucket's egress, which on R2 is
   * nothing.
   *
   * The widths come from what the storefront actually renders: an 80px cart
   * thumbnail, a grid tile roughly 384px wide on a 2x screen, and a full-bleed
   * hero. `withoutEnlargement` means a small source image is left alone rather
   * than upscaled into a blurry larger file.
   *
   * `staticDir` still applies when R2 is not configured, so a clone runs on local
   * disk until it has a bucket.
   */
  upload: {
    staticDir: path.resolve(dirname, '../../public/media'),
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    crop: true,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'],
    // Strip camera and location metadata; it is dead weight and a privacy leak.
    withMetadata: false,
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 78 } },
      },
      {
        name: 'card',
        width: 768,
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 80 } },
      },
      {
        name: 'hero',
        width: 1920,
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 82 } },
      },
      {
        /**
         * Social scrapers are the one place webp is still unsafe — several read
         * the image but refuse to render it — so the share card stays JPEG at a
         * fixed 1200x630.
         */
        name: 'og',
        width: 1200,
        height: 630,
        position: 'centre',
        formatOptions: { format: 'jpeg', options: { quality: 85 } },
      },
    ],
  },
}
