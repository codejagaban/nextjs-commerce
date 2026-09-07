import type { Currency } from '@payloadcms/plugin-ecommerce/types'

/**
 * Declared here rather than imported from the plugin's root export: that entry
 * pulls in server-only upload code, and this module is used by client components
 * too. These match the plugin's own definitions.
 */
const USD: Currency = { code: 'USD', decimals: 2, label: 'US Dollar', symbol: '$' }
const EUR: Currency = { code: 'EUR', decimals: 2, label: 'Euro', symbol: '€' }
const GBP: Currency = { code: 'GBP', decimals: 2, label: 'British Pound', symbol: '£' }

/**
 * The currencies this store can sell in.
 *
 * The ecommerce plugin turns each entry into its own `priceIn<CODE>` field on
 * products and variants, so a price is entered per currency and nothing is ever
 * converted at runtime. That is why this list lives in code rather than in Store
 * settings: adding a currency changes the database schema, so it is a deploy, not
 * a setting. Which of these the storefront actually sells in *is* a setting.
 */
export const SUPPORTED_CURRENCIES: Currency[] = [USD, EUR, GBP]

export const DEFAULT_CURRENCY_CODE = 'USD'

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code']

/** The admin field a currency's amount is stored in, e.g. USD -> priceInUSD. */
export const priceFieldFor = (code: string) => `priceIn${code}` as const

/** Select-projection keys for every currency, for a `select` on products/variants. */
export const priceSelect = SUPPORTED_CURRENCIES.reduce<Record<string, true>>((acc, c) => {
  acc[priceFieldFor(c.code)] = true
  acc[`${priceFieldFor(c.code)}Enabled`] = true
  return acc
}, {})

/**
 * The amount to show for a document in the active currency.
 *
 * A store that has not priced every product in every currency still renders a
 * price: the default currency stands in rather than leaving a blank where a
 * figure belongs. Seeded demo data carries all three, so the fallback is a
 * safety net, not the normal path.
 */
export const priceFor = (doc: object | null | undefined, code: string): number | undefined => {
  // Generated Payload interfaces have no index signature, so read them as records.
  const record = doc as Record<string, unknown> | null | undefined
  if (!record) return undefined
  const amount = record[priceFieldFor(code)]
  if (typeof amount === 'number') return amount
  const fallback = record[priceFieldFor(DEFAULT_CURRENCY_CODE)]
  return typeof fallback === 'number' ? fallback : undefined
}
