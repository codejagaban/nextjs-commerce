'use client'

import { useFormFields } from '@payloadcms/ui'
import React from 'react'

export const ProductInventoryHint: React.FC = () => {
  const variantsEnabled = useFormFields(([fields]) => Boolean(fields.enableVariants?.value))
  return (
    <p className="product-inventory-hint">
      {variantsEnabled
        ? 'Inventory is tracked on each variant in the table.'
        : 'Set the number of units currently available.'}
    </p>
  )
}
