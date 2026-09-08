import { getCachedGlobal } from '@/utilities/getGlobals'
import { getSettings } from '@/utilities/getSettings'
import { DEFAULT_STORE_NAME } from '@/brand'

import './index.css'
import { HeaderClient } from './index.client'

export async function Header() {
  const [header, settings] = await Promise.all([getCachedGlobal('header', 1)(), getSettings()])

  return <HeaderClient header={header} storeName={settings?.storeName || DEFAULT_STORE_NAME} />
}
