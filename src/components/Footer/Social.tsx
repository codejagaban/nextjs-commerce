import type { Setting } from '@/payload-types'

import {
  FacebookLogo,
  InstagramLogo,
  PinterestLogo,
  TiktokLogo,
  XLogo,
  YoutubeLogo,
} from '@phosphor-icons/react/dist/ssr'
import React from 'react'

type Profile = NonNullable<Setting['social']>[number]

/**
 * Real brand marks, bare.
 *
 * These are the platforms' own logos from Phosphor rather than a redrawn set —
 * a hand-traced Instagram glyph is a fake logo. No tile, chip or circle behind
 * them: the mark sits on the surface and carries its own weight.
 */
const marks = {
  instagram: { Icon: InstagramLogo, label: 'Instagram' },
  tiktok: { Icon: TiktokLogo, label: 'TikTok' },
  youtube: { Icon: YoutubeLogo, label: 'YouTube' },
  facebook: { Icon: FacebookLogo, label: 'Facebook' },
  x: { Icon: XLogo, label: 'X' },
  pinterest: { Icon: PinterestLogo, label: 'Pinterest' },
} as const

export function Social({ profiles, storeName }: { profiles: Profile[]; storeName: string }) {
  if (!profiles.length) return null

  return (
    <ul className="mt-6 flex items-center gap-4">
      {profiles.map((p) => {
        const mark = marks[p.platform]
        if (!mark) return null
        const { Icon, label } = mark
        return (
          <li key={p.id ?? p.platform}>
            <a
              className="block text-muted-foreground transition-colors hover:text-foreground"
              href={p.url}
              rel="noreferrer noopener"
              target="_blank"
            >
              <Icon aria-hidden="true" className="h-5 w-5" weight="fill" />
              <span className="sr-only">{`${storeName} on ${label}`}</span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
