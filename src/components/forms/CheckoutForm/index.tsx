'use client'

import { Message } from '@/components/Message'
import { Button } from '@/components/ui/button'
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { useRouter } from 'next/navigation'
import React, { useCallback, FormEvent } from 'react'
import { useCart, usePayments } from '@payloadcms/plugin-ecommerce/client/react'
import { Address } from '@/payload-types'

type Props = {
  customerEmail?: string
  billingAddress?: Partial<Address>
  shippingAddress?: Partial<Address>
  setProcessingPayment: React.Dispatch<React.SetStateAction<boolean>>
}

export const CheckoutForm: React.FC<Props> = ({
  customerEmail,
  billingAddress,
  setProcessingPayment,
}) => {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = React.useState<null | string>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [paidIntentID, setPaidIntentID] = React.useState<string>()
  const [paymentReady, setPaymentReady] = React.useState(false)
  const router = useRouter()
  const { clearCart } = useCart()
  const { confirmOrder } = usePayments()

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!stripe || !elements || isLoading || (!paidIntentID && !paymentReady)) return
      setError(null)
      setIsLoading(true)
      setProcessingPayment(true)

      if (stripe && elements) {
        try {
          const returnUrl = new URL('/checkout/confirm-order', window.location.origin)
          if (customerEmail) returnUrl.searchParams.set('email', customerEmail)

          const { error: stripeError, paymentIntent } = paidIntentID
            ? { paymentIntent: { id: paidIntentID, status: 'succeeded' } }
            : await stripe.confirmPayment({
                confirmParams: {
                  return_url: returnUrl.toString(),
                  payment_method_data: {
                    billing_details: {
                      email: customerEmail,
                      phone: billingAddress?.phone,
                      address: {
                        line1: billingAddress?.addressLine1,
                        line2: billingAddress?.addressLine2,
                        city: billingAddress?.city,
                        state: billingAddress?.state,
                        postal_code: billingAddress?.postalCode,
                        country: billingAddress?.country,
                      },
                    },
                  },
                },
                elements,
                redirect: 'if_required',
              })

          if (paymentIntent && paymentIntent.status === 'succeeded') {
            setPaidIntentID(paymentIntent.id)
            try {
              const confirmResult = await confirmOrder('stripe', {
                additionalData: {
                  paymentIntentID: paymentIntent.id,
                  ...(customerEmail ? { customerEmail } : {}),
                },
              })

              if (
                confirmResult &&
                typeof confirmResult === 'object' &&
                'orderID' in confirmResult &&
                confirmResult.orderID
              ) {
                const accessToken =
                  'accessToken' in confirmResult ? (confirmResult.accessToken as string) : ''
                const queryParams = new URLSearchParams()

                if (customerEmail) {
                  queryParams.set('email', customerEmail)
                }
                if (accessToken) {
                  queryParams.set('accessToken', accessToken)
                }

                const queryString = queryParams.toString()
                const redirectUrl = `/orders/${confirmResult.orderID}${queryString ? `?${queryString}` : ''}`

                // Clear the cart after successful payment
                void clearCart().catch(() => {
                  // The order is already saved; cart cleanup must not prevent access to it.
                })

                // Redirect to order confirmation page
                router.push(redirectUrl)
              } else {
                throw new Error('No order was returned. Retry confirmation without paying again.')
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Something went wrong.'
              setError(`Error while confirming order: ${msg}`)
              setIsLoading(false)
            }
          }
          if (stripeError?.message) {
            setError(stripeError.message)
            setIsLoading(false)
          } else if (paymentIntent && paymentIntent.status !== 'succeeded') {
            setError(
              'Your payment is still processing. Please check your order before trying another payment.',
            )
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Something went wrong.'
          setError(`Error while submitting payment: ${msg}`)
          setIsLoading(false)
          setProcessingPayment(false)
        } finally {
          setIsLoading(false)
          setProcessingPayment(false)
        }
      }
    },
    [
      setProcessingPayment,
      stripe,
      elements,
      customerEmail,
      billingAddress,
      confirmOrder,
      clearCart,
      router,
      isLoading,
      paidIntentID,
      paymentReady,
    ],
  )

  return (
    <form noValidate onSubmit={handleSubmit}>
      {error && <Message error={error} />}
      {!paidIntentID && (
        <PaymentElement
          onReady={() => setPaymentReady(true)}
          onLoadError={() =>
            setError('The payment form could not load. Cancel payment and try again.')
          }
        />
      )}
      <div className="mt-8 flex gap-4">
        <Button
          disabled={!stripe || isLoading || (!paidIntentID && !paymentReady)}
          type="submit"
          variant="default"
        >
          {isLoading ? 'Loading...' : paidIntentID ? 'Retry order confirmation' : 'Pay now'}
        </Button>
      </div>
    </form>
  )
}
