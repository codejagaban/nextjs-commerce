'use client'

import React from 'react'
import type { Address } from '@/payload-types'
import { CreateAddressModal } from '@/components/addresses/CreateAddressModal'

type Props = {
  address: Partial<Omit<Address, 'country'>> & { country?: string } // Allow address to be partial and entirely optional as this is entirely for display purposes
  /**
   * Completely override the default actions
   */
  actions?: React.ReactNode
  /**
   * Insert elements before the actions
   */
  beforeActions?: React.ReactNode
  /**
   * Insert elements after the actions
   */
  afterActions?: React.ReactNode
  /**
   * Hide all actions
   */
  hideActions?: boolean
}

export const AddressItem: React.FC<Props> = ({
  address,
  actions,
  hideActions = false,
  beforeActions,
  afterActions,
}) => {
  if (!address) {
    return null
  }

  return (
    <div className="flex items-start justify-between gap-6 rounded-xl border border-border bg-background p-5">
      <div className="grow space-y-0.5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">
          {address.title && <span>{address.title} </span>}
          {address.firstName} {address.lastName}
        </p>
        {address.company && <p>{address.company}</p>}
        {address.phone && <p>{address.phone}</p>}
        <p>
          {address.addressLine1}
          {address.addressLine2 && <>, {address.addressLine2}</>}
        </p>
        <p>
          {address.city}, {address.state} {address.postalCode}
        </p>
        <p>{address.country}</p>
      </div>

      {!hideActions && address.id && (
        <div className="flex shrink-0 flex-col gap-2">
          {actions ? (
            actions
          ) : (
            <>
              {beforeActions}
              {address.id && (
                <CreateAddressModal
                  addressID={address.id}
                  initialData={address}
                  buttonText={'Edit'}
                  modalTitle={'Edit address'}
                />
              )}
              {afterActions}
            </>
          )}
        </div>
      )}
    </div>
  )
}
