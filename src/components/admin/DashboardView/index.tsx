import type { AdminViewServerProps } from 'payload'

import { Gutter, HydrateAuthProvider, SetStepNav } from '@payloadcms/ui'
import React, { Fragment } from 'react'

import { Dashboard } from '../Dashboard'

/**
 * Replaces Payload's default admin home.
 *
 * The default lists every collection and global as a grid of cards, which the
 * sidebar already covers — on a page meant to report on the store, it is
 * duplicate navigation pushing the figures off screen. This renders the overview
 * on its own. The surrounding chrome comes from the admin layout, so the nav and
 * header are untouched.
 */
export async function DashboardView({ initPageResult }: AdminViewServerProps) {
  return (
    <Fragment>
      <HydrateAuthProvider permissions={initPageResult.permissions} />
      <SetStepNav nav={[{ label: 'Dashboard' }]} />
      <Gutter>
        <Dashboard />
      </Gutter>
    </Fragment>
  )
}
