import { DEFAULT_CURRENCY_CODE } from '@/currencies'
import { getSettings } from '@/utilities/getSettings'

/**
 * The currency the storefront sells in, from Store settings.
 *
 * Falls back to the configured default when the settings row has not been written
 * yet — a fresh clone still renders prices.
 */
export const getStoreCurrency = async (): Promise<string> =>
  (await getSettings())?.currency || DEFAULT_CURRENCY_CODE
