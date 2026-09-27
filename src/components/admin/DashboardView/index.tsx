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
const queryString = (value: unknown) => (typeof value === 'string' ? value : undefined)

export async function DashboardView({ clientConfig, initPageResult }: AdminViewServerProps) {
  const user = initPageResult.req.user
  const fullName = typeof user?.name === 'string' ? user.name : undefined
  const firstName = fullName ? fullName.split(' ')[0] : undefined

  return (
    <Fragment>
      <HydrateAuthProvider permissions={initPageResult.permissions} />
      <SetStepNav nav={[{ label: 'Dashboard' }]} />
      <Gutter>
        <Dashboard
          adminPath={clientConfig.routes.admin}
          filters={{
            comparison: queryString(initPageResult.req.query.compare),
            from: queryString(initPageResult.req.query.from),
            range: queryString(initPageResult.req.query.range),
            to: queryString(initPageResult.req.query.to),
          }}
          name={firstName}
        />
      </Gutter>
    </Fragment>
  )
}
