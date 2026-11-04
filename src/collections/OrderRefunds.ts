import type { CollectionConfig } from 'payload'
import { isAdmin } from '@/access/isAdmin'

/** Durable provider operations. Public writes must never manufacture money movement. */
export const OrderRefunds: CollectionConfig = {
  slug: 'order-refunds',
  admin: { hidden: true },
  access: { read: isAdmin, create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'order', type: 'relationship', relationTo: 'orders', required: true, index: true },
    { name: 'transaction', type: 'relationship', relationTo: 'transactions', required: true },
    { name: 'requestID', type: 'text', required: true, unique: true },
    { name: 'requestHash', type: 'text', required: true },
    { name: 'actor', type: 'relationship', relationTo: 'users', required: true },
    { name: 'reason', type: 'textarea', required: true },
    { name: 'paymentIntentID', type: 'text', required: true },
    { name: 'providerRefundID', type: 'text', unique: true },
    { name: 'currency', type: 'text', required: true },
    ...['productAmount', 'shippingAmount', 'taxAmount', 'amount'].map((name) => ({
      name,
      type: 'number' as const,
      required: true,
      min: 0,
    })),
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'submitting',
      options: [
        'submitting',
        'pending',
        'requires_action',
        'succeeded',
        'failed',
        'canceled',
        'needs_review',
      ],
    },
  ],
}
