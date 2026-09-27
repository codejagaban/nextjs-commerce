import type { Field } from 'payload'

import { DEFAULT_CURRENCY_CODE, SUPPORTED_CURRENCIES } from '@/currencies'

const currenciesConfig = {
  defaultCurrency: DEFAULT_CURRENCY_CODE,
  supportedCurrencies: SUPPORTED_CURRENCIES,
}

const moneyField = ({
  description,
  label,
  name,
}: {
  description: string
  label: string
  name: string
}): Field => ({
  name,
  type: 'number',
  label,
  defaultValue: 0,
  min: 0,
  admin: {
    components: {
      Field: {
        clientProps: { currenciesConfig, readOnly: true },
        path: '@payloadcms/plugin-ecommerce/rsc#PriceInput',
      },
    },
    description,
    readOnly: true,
    step: 1,
  },
})

/**
 * Monetary values captured when an order is placed, stored in minor currency
 * units. Keeping the components separate makes historical reports independent
 * of later product-price or store-setting changes.
 */
export const orderFinancialFields: Field[] = [
  {
    type: 'collapsible',
    label: 'Financial breakdown',
    admin: {
      initCollapsed: false,
      position: 'sidebar',
    },
    fields: [
      moneyField({
        name: 'subtotal',
        label: 'Subtotal',
        description: 'Product value before discounts, shipping, and tax.',
      }),
      moneyField({
        name: 'discountTotal',
        label: 'Discounts',
        description: 'Discounts applied to this order.',
      }),
      moneyField({
        name: 'shippingTotal',
        label: 'Shipping',
        description: 'Shipping charged to the customer.',
      }),
      moneyField({
        name: 'taxTotal',
        label: 'Tax',
        description: 'Tax charged to the customer.',
      }),
      moneyField({
        name: 'productRefundTotal',
        label: 'Product refunds',
        description: 'Product value returned to the customer so far.',
      }),
      moneyField({
        name: 'shippingRefundTotal',
        label: 'Shipping refunds',
        description: 'Shipping charges returned to the customer so far.',
      }),
      moneyField({
        name: 'taxRefundTotal',
        label: 'Tax refunds',
        description: 'Tax returned to the customer so far.',
      }),
    ],
  },
]
