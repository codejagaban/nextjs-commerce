import type { GlobalConfig } from 'payload'

import { revalidateTag } from 'next/cache'

import { adminOnly } from '@/access/adminOnly'

/**
 * The one place a clone of this template gets its identity.
 *
 * Everything here is text the storefront reads at request time, so a new store is
 * branded from the admin rather than from a code edit. Currency is deliberately
 * absent: the ecommerce plugin resolves it when the Payload config is built, long
 * before the database is readable, so a picker here would be a control that does
 * nothing.
 */
export const Settings: GlobalConfig = {
  slug: 'settings',
  label: 'Store settings',
  access: {
    read: () => true,
    update: adminOnly,
  },
  admin: {
    group: 'Settings',
  },
  hooks: {
    /**
     * Without this the storefront keeps serving the cached copy until a redeploy.
     * Seeding and any other CLI write runs outside a request, where there is no
     * cache store to revalidate — hence the guard and the escape hatch the seed
     * script already uses for the other globals.
     */
    afterChange: [
      ({ context }) => {
        if (context?.disableRevalidate) return
        try {
          revalidateTag('global_settings', 'max')
        } catch {
          // No static generation store — nothing is cached to bust.
        }
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Store',
          fields: [
            {
              name: 'storeName',
              type: 'text',
              required: true,
              defaultValue: 'Marisol',
              admin: {
                description: 'Shown in the footer, the copyright line and the browser tab.',
              },
            },
            {
              name: 'tagline',
              type: 'textarea',
              defaultValue:
                "Clean, effective skincare made with naturally-derived ingredients, for skin's own natural radiance.",
              admin: {
                description: 'One or two sentences under the footer wordmark.',
              },
            },
          ],
        },
        {
          label: 'Contact',
          fields: [
            {
              name: 'supportEmail',
              type: 'email',
              defaultValue: 'hello@marisol.store',
              admin: {
                description: 'Published in the footer so customers can reach a person.',
              },
            },
            {
              name: 'supportPhone',
              type: 'text',
              admin: {
                description: 'Optional. Left blank, no phone is shown.',
              },
            },
          ],
        },
        {
          label: 'Social',
          fields: [
            {
              name: 'social',
              type: 'array',
              labels: { singular: 'Profile', plural: 'Profiles' },
              admin: {
                description:
                  'Only the platforms you actually use — an empty list shows no social row at all.',
                initCollapsed: true,
              },
              fields: [
                {
                  name: 'platform',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Instagram', value: 'instagram' },
                    { label: 'TikTok', value: 'tiktok' },
                    { label: 'YouTube', value: 'youtube' },
                    { label: 'Facebook', value: 'facebook' },
                    { label: 'X', value: 'x' },
                    { label: 'Pinterest', value: 'pinterest' },
                  ],
                },
                {
                  name: 'url',
                  type: 'text',
                  required: true,
                  admin: { placeholder: 'https://instagram.com/yourstore' },
                },
              ],
            },
          ],
        },
        {
          label: 'SEO',
          fields: [
            {
              name: 'metaTitle',
              type: 'text',
              defaultValue: 'Marisol — Clean skincare for your natural radiance',
              admin: {
                description:
                  'The home page title, and the fallback for any page without its own. Blank falls back to the store name.',
              },
            },
            {
              name: 'metaDescription',
              type: 'textarea',
              maxLength: 200,
              defaultValue:
                'Clean, effective skincare made with naturally-derived ingredients — cleansers, serums and moisturisers for skin\u2019s own natural radiance.',
              admin: {
                description: 'The search-result snippet for pages without their own description.',
              },
            },
          ],
        },
      ],
    },
  ],
}
