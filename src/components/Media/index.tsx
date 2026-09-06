import React, { Fragment } from 'react'

import type { Props } from './types'

import { Image } from './Image'
import { Video } from './Video'

export const Media: React.FC<Props> = (props) => {
  const { className, fill, htmlElement = 'div', resource } = props

  const isVideo = typeof resource === 'object' && resource?.mimeType?.includes('video')

  /**
   * A `fill` image positions itself against its nearest positioned ancestor, so
   * the wrapper this component would otherwise add sits between the image and
   * the caller's `relative` box and breaks it — next/image warns that the parent
   * has `position: static`. With `fill` the caller's own element is the frame,
   * so render the image straight into it.
   */
  const Tag = fill ? Fragment : (htmlElement as any) || Fragment
  const useWrapper = Tag !== Fragment

  return (
    <Tag {...(useWrapper ? { className } : {})}>
      {isVideo ? <Video {...props} /> : <Image {...props} />}
    </Tag>
  )
}
