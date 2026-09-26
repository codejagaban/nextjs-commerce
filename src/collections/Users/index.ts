import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { publicAccess } from '@/access/publicAccess'
import { adminOrSelf } from '@/access/adminOrSelf'
import { checkRole } from '@/access/utilities'
import { DEFAULT_STORE_NAME } from '@/brand'
import { renderActionEmail } from '@/email/template'
import { getServerSideURL } from '@/utilities/getURL'

import { ensureFirstUserIsAdmin } from './hooks/ensureFirstUserIsAdmin'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: ({ req: { user } }) => checkRole(['admin'], user),
    create: publicAccess,
    delete: adminOnly,
    read: adminOrSelf,
    unlock: adminOnly,
    update: adminOrSelf,
  },
  admin: {
    group: 'Users',
    defaultColumns: ['name', 'email', 'roles'],
    useAsTitle: 'name',
  },
  auth: {
    tokenExpiration: 1209600,
    /**
     * Throttle password guessing. Five wrong attempts locks the account for ten
     * minutes; Payload clears the counter on a successful login. Without these
     * an attacker can try passwords as fast as the network allows.
     *
     * Email verification is deliberately off: this is a shop, and making someone
     * leave the checkout to open an inbox costs more in abandoned carts than it
     * saves. Sign-up logs you straight in.
     */
    maxLoginAttempts: 5,
    lockTime: 600000,
    /**
     * Payload's default reset email points at the admin panel. Customers have no
     * business there, so the link is rewritten to the storefront page that
     * actually collects the new password.
     */
    forgotPassword: {
      generateEmailSubject: () => `Reset your ${DEFAULT_STORE_NAME} password`,
      generateEmailHTML: (args) => {
        const url = new URL('/reset-password', getServerSideURL())
        url.searchParams.set('token', args?.token || '')
        return renderActionEmail({
          actionLabel: 'Set a new password',
          intro: `Someone asked to reset the password for your ${DEFAULT_STORE_NAME} account.`,
          note: 'If you did not ask for this, you can ignore this email. Your password stays unchanged.',
          storeName: DEFAULT_STORE_NAME,
          title: 'Reset your password',
          url: url.toString(),
        }).html
      },
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'roles',
      type: 'select',
      access: {
        create: adminOnlyFieldAccess,
        read: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      defaultValue: ['customer'],
      hasMany: true,
      hooks: {
        beforeChange: [ensureFirstUserIsAdmin],
      },
      options: [
        {
          label: 'admin',
          value: 'admin',
        },
        {
          label: 'customer',
          value: 'customer',
        },
      ],
    },
    {
      name: 'orders',
      type: 'join',
      collection: 'orders',
      on: 'customer',
      admin: {
        allowCreate: false,
        defaultColumns: ['id', 'createdAt', 'total', 'currency', 'items'],
      },
    },
    {
      name: 'cart',
      type: 'join',
      collection: 'carts',
      on: 'customer',
      admin: {
        allowCreate: false,
        defaultColumns: ['id', 'createdAt', 'total', 'currency', 'items'],
      },
    },
    {
      name: 'addresses',
      type: 'join',
      collection: 'addresses',
      on: 'customer',
      admin: {
        allowCreate: false,
        defaultColumns: ['id'],
      },
    },
  ],
}
