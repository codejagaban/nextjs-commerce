import type { CollectionConfig } from 'payload'
import { isAdmin } from '@/access/isAdmin'

/** Small durable outbox: email delivery never rolls back a recorded shipment. */
export const ShipmentNotifications: CollectionConfig = {
  slug: 'shipment-notifications',
  admin: { hidden: true },
  access: { read: isAdmin, create: () => false, update: () => false, delete: isAdmin },
  fields: [
    { name: 'order', type: 'relationship', relationTo: 'orders', required: true, index: true },
    { name: 'shipmentID', type: 'text', required: true },
    { name: 'eventKey', type: 'text', required: true, unique: true },
    { name: 'kind', type: 'select', required: true, options: ['shipped', 'tracking', 'delivered'] },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: ['pending', 'sending', 'sent', 'failed', 'skipped'],
    },
    { name: 'sentAt', type: 'date' },
  ],
}
