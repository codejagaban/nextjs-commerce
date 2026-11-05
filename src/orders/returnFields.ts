import type { Field } from 'payload'

export const returnFields: Field[] = [
  {
    name: 'returns',
    type: 'array',
    admin: { hidden: true },
    access: { create: () => false, update: () => false },
    fields: [
      { name: 'reason', type: 'text', required: true },
      { name: 'requestedAt', type: 'date', required: true },
      {
        name: 'items',
        type: 'array',
        required: true,
        minRows: 1,
        fields: [
          { name: 'orderItemID', type: 'text', required: true },
          { name: 'quantity', type: 'number', required: true, min: 1 },
          { name: 'received', type: 'number', required: true, defaultValue: 0, min: 0 },
          { name: 'restocked', type: 'number', required: true, defaultValue: 0, min: 0 },
        ],
      },
    ],
  },
]
