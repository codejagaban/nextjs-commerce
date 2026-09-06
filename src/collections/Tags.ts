import { slugField } from 'payload'
import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'

/**
 * Product attribute tags, grouped into filter facets (e.g. "Skin Type",
 * "Concern"). Each `group` becomes a collapsible section in the shop filter.
 */
export const Tags: CollectionConfig = {
  slug: 'tags',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: () => true,
    update: adminOnly,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'group'],
    group: 'Content',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'group',
      type: 'text',
      required: true,
      admin: {
        description: 'The filter section this tag appears under, e.g. "Skin Type".',
      },
    },
    slugField({
      position: undefined,
    }),
  ],
}
