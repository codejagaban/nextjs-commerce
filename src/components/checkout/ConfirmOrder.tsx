'use client'

import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Message } from '@/components/Message'
import Link from 'next/link'
import { useCart, usePayments } from '@payloadcms/plugin-ecommerce/client/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

export const ConfirmOrder: React.FC = () => {
  const { confirmOrder } = usePayments()
  const { cart, clearCart } = useCart()
  const [error, setError] = useState<string>()

  const searchParams = useSearchParams()
  const router = useRouter()
  // Ensure we only confirm the order once, even if the component re-renders
  const isConfirming = useRef(false)

  const attemptConfirmation = useCallback(async () => {
    if (!cart) {
      return
    }

    const paymentIntentID = searchParams.get('payment_intent')
    const email = searchParams.get('email')

    if (paymentIntentID) {
      if (!isConfirming.current) {
        isConfirming.current = true

        try {
          const result = await confirmOrder('stripe', {
            additionalData: {
              paymentIntentID,
              ...(email ? { customerEmail: email } : {}),
            },
          })
          if (result && typeof result === 'object' && 'orderID' in result && result.orderID) {
            const accessToken = 'accessToken' in result ? (result.accessToken as string) : ''
            const queryParams = new URLSearchParams()

            if (email) {
              queryParams.set('email', email)
            }
            if (accessToken) {
              queryParams.set('accessToken', accessToken)
            }

            const queryString = queryParams.toString()
            void clearCart().catch(() => {})
            router.push(`/orders/${result.orderID}${queryString ? `?${queryString}` : ''}`)
          } else {
            throw new Error('No order was returned.')
          }
        } catch {
          setError('We could not load your order yet. Retry confirmation without paying again.')
        }
      }
    } else {
      // If no payment intent ID is found, redirect to the home
      router.push('/')
    }
  }, [cart, clearCart, confirmOrder, router, searchParams])

  useEffect(() => {
    // State changes only after the external payment confirmation request fails.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void attemptConfirmation()
  }, [attemptConfirmation])

  return (
    <div className="text-center w-full flex flex-col items-center justify-start gap-4">
      <h1 className="text-2xl">Confirming Order</h1>

      {error ? (
        <>
          <Message error={error} />
          <Button
            onClick={() => {
              setError(undefined)
              isConfirming.current = false
              void attemptConfirmation()
            }}
          >
            Retry order confirmation
          </Button>
        </>
      ) : (
        <LoadingSpinner className="w-12 h-6" />
      )}
      <Link href="/find-order">Find an order with your email</Link>
    </div>
  )
}
