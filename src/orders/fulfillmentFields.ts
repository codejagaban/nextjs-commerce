import type { Field } from 'payload'
import { isAdmin } from '@/access/isAdmin'

export const fulfillmentFields: Field[] = [
  {
    name: 'shipments',
    type: 'array',
    admin: { hidden: true },
    access: { create: () => false, update: () => false },
    fields: [
      { name: 'carrier', type: 'text', required: true },
      { name: 'trackingNumber', type: 'text' },
      { name: 'trackingURL', type: 'text' },
      { name: 'shippedAt', type: 'date', required: true },
      { name: 'deliveredAt', type: 'date' },
      {
        name: 'items',
        type: 'array',
        required: true,
        minRows: 1,
        fields: [
          { name: 'orderItemID', type: 'text', required: true },
          { name: 'quantity', type: 'number', required: true, min: 1 },
        ],
      },
    ],
  },
  {
    name: 'workflowEvents',
    type: 'array',
    admin: { hidden: true },
    access: { create: () => false, update: () => false, read: ({ req }) => isAdmin({ req }) === true },
    fields: [
      { name: 'action', type: 'text', required: true },
      { name: 'actor', type: 'relationship', relationTo: 'users', required: true },
      { name: 'occurredAt', type: 'date', required: true },
      { name: 'requestID', type: 'text', required: true },
      { name: 'requestHash', type: 'text', required: true },
    ],
  },
]
