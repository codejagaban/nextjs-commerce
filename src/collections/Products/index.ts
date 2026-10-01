import { CallToAction } from '@/blocks/CallToAction/config'
import { Content } from '@/blocks/Content/config'
import { MediaBlock } from '@/blocks/MediaBlock/config'
import { type Field, slugField } from 'payload'
import { generatePreviewPath } from '@/utilities/generatePreviewPath'
import { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'
import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import {
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { DefaultDocumentIDType, Where } from 'payload'

import { priceSelect } from '@/currencies'

const named = (field: Field, name: string) => 'name' in field && field.name === name

export const ProductsCollection: CollectionOverride = ({ defaultCollection }) => {
  const defaults = defaultCollection.fields
  const inventory = defaults.find((field) => named(field, 'inventory'))
  const variantFields = defaults.filter((field) =>
    ['enableVariants', 'variantTypes', 'variants'].some((name) => named(field, name)),
  )
  const priceFields = defaults.filter((field) => field.type === 'group')
  const slug = slugField()
  const slugFields = slug.type === 'row' ? slug.fields : []

  return ({
  ...defaultCollection,
  admin: {
    ...defaultCollection?.admin,
    components: {
      ...defaultCollection?.admin?.components,
      edit: {
        ...defaultCollection?.admin?.components?.edit,
        PublishButton: '@/components/admin/ProductPublishButton#ProductPublishButton',
      },
    },
    defaultColumns: ['title', 'enableVariants', '_status', 'variants.variants'],
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          slug: data?.slug,
          collection: 'products',
          req,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: data?.slug as string,
        collection: 'products',
        req,
      }),
    useAsTitle: 'title',
  },
  defaultPopulate: {
    ...defaultCollection?.defaultPopulate,
    title: true,
    slug: true,
    variantOptions: true,
    variants: true,
    enableVariants: true,
    gallery: true,
    ...priceSelect,
    inventory: true,
    meta: true,
  },
  fields: [
    {
      name: 'publishingSummary',
      type: 'ui',
      admin: {
        components: { Field: '@/components/admin/ProductPublishing#ProductPublishing' },
        position: 'sidebar',
      },
    },
    {
      type: 'collapsible',
      label: 'Basic information',
      admin: { className: 'product-editor__section product-editor__basic', initCollapsed: false },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'title', type: 'text', required: true, admin: { width: '50%' } },
            ...slugFields.map((field): Field => {
              if ('name' in field && field.name === 'slug') {
                return { ...field, admin: { ...field.admin, width: '50%' } } as Field
              }
              return field
            }),
          ],
        },
            {
              name: 'description',
              type: 'richText',
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                    HorizontalRuleFeature(),
                  ]
                },
              }),
              label: false,
              required: false,
            },
      ],
    },
    {
      type: 'collapsible',
      label: 'Media',
      admin: { className: 'product-editor__section product-editor__media', initCollapsed: false },
      fields: [
            {
              name: 'gallery',
              type: 'array',
              minRows: 1,
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                },
                {
                  name: 'variantOption',
                  type: 'relationship',
                  relationTo: 'variantOptions',
                  admin: {
                    condition: (data) => {
                      return data?.enableVariants === true && data?.variantTypes?.length > 0
                    },
                  },
                  filterOptions: ({ data }) => {
                    if (data?.enableVariants && data?.variantTypes?.length) {
                      const variantTypeIDs = data.variantTypes.map((item: any) => {
                        if (typeof item === 'object' && item?.id) {
                          return item.id
                        }
                        return item
                      }) as DefaultDocumentIDType[]

                      if (variantTypeIDs.length === 0)
                        return {
                          variantType: {
                            in: [],
                          },
                        }

                      const query: Where = {
                        variantType: {
                          in: variantTypeIDs,
                        },
                      }

                      return query
                    }

                    return {
                      variantType: {
                        in: [],
                      },
                    }
                  },
                },
              ],
            },
      ],
    },
    {
      type: 'collapsible',
      label: 'Variants',
      admin: { className: 'product-editor__section product-editor__variants', initCollapsed: false },
      fields: variantFields,
    },
    {
      type: 'collapsible',
      label: 'Additional content',
      admin: { className: 'product-editor__section product-editor__additional', initCollapsed: true },
      fields: [
            {
              name: 'layout',
              type: 'blocks',
              blocks: [CallToAction, Content, MediaBlock],
            },
            {
              name: 'relatedProducts',
              type: 'relationship',
              filterOptions: ({ id }) => {
                if (id) {
                  return {
                    id: {
                      not_in: [id],
                    },
                  }
                }

                // ID comes back as undefined during seeding so we need to handle that case
                return {
                  id: {
                    exists: true,
                  },
                }
              },
              hasMany: true,
              relationTo: 'products',
            },
      ],
    },
    {
      type: 'collapsible',
      label: 'Search preview',
      admin: { className: 'product-editor__section product-editor__seo', initCollapsed: true },
      fields: [
        {
          name: 'meta',
          label: 'SEO',
          type: 'group',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
            }),

            MetaDescriptionField({}),
            PreviewField({
              // if the `generateUrl` function is configured
              hasGenerateFn: true,

              // field paths to match the target field for data
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Product organization',
      admin: {
        className: 'product-editor__sidebar-card product-editor__organization',
        initCollapsed: false,
        position: 'sidebar',
      },
      fields: [
        {
          name: 'categories',
          type: 'relationship',
          admin: { sortOptions: 'title' },
          hasMany: true,
          relationTo: 'categories',
        },
        {
          name: 'tags',
          type: 'relationship',
          admin: { sortOptions: 'group' },
          hasMany: true,
          relationTo: 'tags',
        },
      ],
    },
    ...(inventory ? [{
      type: 'collapsible' as const,
      label: 'Inventory',
      admin: {
        className: 'product-editor__sidebar-card product-editor__inventory',
        initCollapsed: false,
        position: 'sidebar' as const,
      },
      fields: [
        {
          name: 'inventoryHint',
          type: 'ui',
          admin: { components: { Field: '@/components/admin/ProductInventoryHint#ProductInventoryHint' } },
        },
        inventory,
      ],
    }] : []),
    {
      type: 'collapsible',
      label: 'Pricing',
      admin: {
        className: 'product-editor__sidebar-card product-editor__pricing',
        initCollapsed: false,
        position: 'sidebar',
      },
      fields: priceFields,
    },
  ] as Field[],
  })
}
