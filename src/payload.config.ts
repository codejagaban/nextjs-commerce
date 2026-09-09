import { postgresAdapter } from '@payloadcms/db-postgres'
import sharp from 'sharp'

import {
  BoldFeature,
  EXPERIMENTAL_TableFeature,
  IndentFeature,
  ItalicFeature,
  LinkFeature,
  OrderedListFeature,
  UnderlineFeature,
  UnorderedListFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from '@/collections/Categories'
import { Tags } from '@/collections/Tags'
import { Media } from '@/collections/Media'
import { Pages } from '@/collections/Pages'
import { Users } from '@/collections/Users'
import { Footer } from '@/globals/Footer'
import { Header } from '@/globals/Header'
import { Settings } from '@/globals/Settings'
import { emailAdapter } from '@/email'
import { getServerSideURL } from '@/utilities/getURL'
import { plugins } from './plugins'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeLogin` statement on line 15.
      beforeLogin: ['@/components/BeforeLogin#BeforeLogin'],
      // Payload's nav is built from collections and globals, so the admin home
      // has no entry of its own. This adds one.
      beforeNavLinks: ['@/components/admin/DashboardNavLink#DashboardNavLink'],
      views: {
        // Replaces the default home, which listed every collection as a card grid
        // that duplicates the sidebar. Seeding moved to the CLI: `pnpm seed`.
        dashboard: {
          Component: '@/components/admin/DashboardView#DashboardView',
        },
      },
      // Loads our admin stylesheet on every admin screen. Payload has no config
      // key for custom CSS — it has to be imported from a rendered component.
      providers: ['@/components/admin/AdminStyles#AdminStyles'],
    },
    user: Users.slug,
  },
  collections: [Users, Pages, Categories, Tags, Media],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  editor: lexicalEditor({
    features: () => {
      return [
        UnderlineFeature(),
        BoldFeature(),
        ItalicFeature(),
        OrderedListFeature(),
        UnorderedListFeature(),
        LinkFeature({
          enabledCollections: ['pages'],
          fields: ({ defaultFields }) => {
            const defaultFieldsWithoutUrl = defaultFields.filter((field) => {
              if ('name' in field && field.name === 'url') return false
              return true
            })

            return [
              ...defaultFieldsWithoutUrl,
              {
                name: 'url',
                type: 'text',
                admin: {
                  condition: ({ linkType }) => linkType !== 'internal',
                },
                label: ({ t }) => t('fields:enterURL'),
                required: true,
              },
            ]
          },
        }),
        IndentFeature(),
        EXPERIMENTAL_TableFeature(),
      ]
    },
  }),
  // Resend, SMTP, or a console preview — chosen by environment. See src/email.
  email: emailAdapter(),
  /**
   * Payload compares the request origin against this to protect authenticated
   * mutations. Left unset it falls back to an empty origin, logs a warning on
   * every request, and the CSRF check protects nothing.
   */
  serverURL: getServerSideURL(),
  csrf: [getServerSideURL()],
  endpoints: [],
  globals: [Header, Footer, Settings],
  plugins,
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // Sharp powers image resizing, cropping, and focal points for Media uploads.
  sharp,
})
