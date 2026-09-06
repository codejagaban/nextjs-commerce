import type { StaticImageData } from 'next/image'
import type { ElementType, Ref } from 'react'

import type { Media as MediaType } from '@/payload-types'

export interface Props {
  alt?: string
  className?: string
  fill?: boolean // for NextImage only
  height?: number
  htmlElement?: ElementType | null
  imgClassName?: string
  onClick?: () => void
  onLoad?: () => void
  priority?: boolean // for NextImage only
  /**
   * Explicit loading hint. Next 16's LCP check looks for `loading="eager"`
   * specifically, which `priority` alone does not set.
   */
  loading?: 'eager' | 'lazy'
  ref?: Ref<HTMLImageElement | HTMLVideoElement | null>
  resource?: MediaType | string | number // for Payload media
  size?: string // for NextImage only
  src?: StaticImageData // for static media
  videoClassName?: string
  width?: number
}
