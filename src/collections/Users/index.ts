import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { publicAccess } from '@/access/publicAccess'
import { adminOrSelf } from '@/access/adminOrSelf'
import { checkRole } from '@/access/utilities'

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
      generateEmailSubject: () => `Reset your ${process.env.SITE_NAME || 'store'} password`,
      generateEmailHTML: (args) => {
        const token = args?.token
        const base = process.env.NEXT_PUBLIC_SERVER_URL || ''
        const url = `${base}/reset-password?token=${token}`
        const name = process.env.SITE_NAME || 'the store'

        // Plain, inline-styled HTML: email clients strip stylesheets, and a
        // reset message has one job — be legible and carry one link.
        return `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1c1917; line-height: 1.6;">
            <p>Someone asked to reset the password for your ${name} account.</p>
            <p style="margin: 24px 0;">
              <a href="${url}" style="background: #1c1917; color: #ffffff; padding: 12px 22px; border-radius: 999px; text-decoration: none; display: inline-block;">
                Set a new password
              </a>
            </p>
            <p style="color: #57534e; font-size: 14px;">
              If the button does not work, paste this into your browser:<br />
              <a href="${url}" style="color: #57534e;">${url}</a>
            </p>
            <p style="color: #57534e; font-size: 14px;">
              If you did not ask for this, you can ignore this email — your password stays as it is.
            </p>
          </div>
        `
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
