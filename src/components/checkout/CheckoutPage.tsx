'use client'

import { Media } from '@/components/Media'
import { Message } from '@/components/Message'
import { Price } from '@/components/Price'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/providers/Auth'
import { useTheme } from '@/providers/Theme'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { Suspense, useCallback, useEffect, useState } from 'react'

import { cssVariables } from '@/cssVariables'
import { CheckoutForm } from '@/components/forms/CheckoutForm'
import {
  useAddresses,
  useCart,
  useCurrency,
  usePayments,
} from '@payloadcms/plugin-ecommerce/client/react'

import { priceFor } from '@/currencies'
import { CheckoutAddresses } from '@/components/checkout/CheckoutAddresses'
import { CreateAddressModal } from '@/components/addresses/CreateAddressModal'
import { Address } from '@/payload-types'
import { Checkbox } from '@/components/ui/checkbox'
import { AddressItem } from '@/components/addresses/AddressItem'
import { FormItem } from '@/components/forms/FormItem'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/LoadingSpinner'

const apiKey = `${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}`
const stripe = loadStripe(apiKey)

export const CheckoutPage: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const { cart } = useCart()
  const { currency } = useCurrency()
  const [error, setError] = useState<null | string>(null)
  const { theme } = useTheme()
  /**
   * State to manage the email input for guest checkout.
   */
  const [email, setEmail] = useState('')
  const [emailEditable, setEmailEditable] = useState(true)
  const [paymentData, setPaymentData] = useState<null | Record<string, unknown>>(null)
  const { initiatePayment } = usePayments()
  const { addresses } = useAddresses()
  const [shippingAddress, setShippingAddress] = useState<Partial<Address>>()
  const [selectedBillingAddress, setBillingAddress] = useState<Partial<Address>>()
  const billingAddress = selectedBillingAddress ?? addresses?.[0]
  const [billingAddressSameAsShipping, setBillingAddressSameAsShipping] = useState(true)
  const [isProcessingPayment, setProcessingPayment] = useState(false)

  const cartIsEmpty = !cart || !cart.items || !cart.items.length

  const canGoToPayment = Boolean(
    (email || user) && billingAddress && (billingAddressSameAsShipping || shippingAddress),
  )

  useEffect(() => {
    return () => {
      setShippingAddress(undefined)
      setBillingAddress(undefined)
      setBillingAddressSameAsShipping(true)
      setEmail('')
      setEmailEditable(true)
    }
  }, [])

  const initiatePaymentIntent = useCallback(
    async (paymentID: string) => {
      try {
        const paymentData = (await initiatePayment(paymentID, {
          additionalData: {
            ...(email ? { customerEmail: email } : {}),
            billingAddress,
            shippingAddress: billingAddressSameAsShipping ? billingAddress : shippingAddress,
          },
        })) as Record<string, unknown>

        if (paymentData) {
          setPaymentData(paymentData)
        }
      } catch (error) {
        // The server may answer with a JSON body or a bare string, so parsing
        // has to be tolerant — an unguarded JSON.parse here used to throw inside
        // the catch, escape as an unhandled rejection, and destroy the real cause.
        const raw = error instanceof Error ? error.message : String(error ?? '')
        let errorData: { cause?: { code?: string }; message?: string } = {}

        try {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === 'object') errorData = parsed
        } catch {
          // Not JSON — keep the raw text as the message.
        }

        let errorMessage = 'An error occurred while initiating payment.'

        if (errorData?.cause?.code === 'OutOfStock') {
          errorMessage = 'One or more items in your cart are out of stock.'
        } else {
          const detail = (errorData.message || raw || '').trim()
          if (detail) errorMessage = detail
        }

        // eslint-disable-next-line no-console
        console.error('initiatePayment failed:', raw)

        setError(errorMessage)
        toast.error(errorMessage)
      }
    },
    // `email` and `initiatePayment` were missing, so the callback could close
    // over a stale email and send the wrong customer to Stripe.
    [
      billingAddress,
      billingAddressSameAsShipping,
      shippingAddress,
      email,
      initiatePayment,
    ],
  )

  if (!stripe) return null

  if (cartIsEmpty && isProcessingPayment) {
    return (
      <div className="py-12 w-full items-center justify-center">
        <div className="prose dark:prose-invert text-center max-w-none self-center mb-8">
          <p>Processing your payment...</p>
        </div>
        <LoadingSpinner />
      </div>
    )
  }

  if (cartIsEmpty) {
    return (
      <div className="prose dark:prose-invert py-12 w-full items-center">
        <p>Your cart is empty.</p>
        <Link href="/shop">Continue shopping?</Link>
      </div>
    )
  }

  return (
    <div className="grow w-full py-10">
      <h1 className="font-display text-3xl text-foreground md:text-4xl">Checkout</h1>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1fr_440px] lg:gap-14">
        <div className="flex flex-col gap-10">
          {/* Contact ------------------------------------------------------ */}
          <section>
            <h2 className="mb-4 font-display text-xl text-foreground">Contact</h2>
            <div className="rounded-2xl border border-border bg-card p-6">
              {user ? (
                <div className="text-sm">
                  <p className="font-medium text-foreground">{user.email}</p>
                  <p className="mt-1 text-muted-foreground">
                    Not you?{' '}
                    <Link className="font-medium text-foreground underline underline-offset-4" href="/logout">
                      Log out
                    </Link>
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <Button asChild variant="outline" className="h-10 rounded-full px-5">
                      <Link href="/login">Log in</Link>
                    </Button>
                    <span>
                      or{' '}
                      <Link
                        href="/create-account"
                        className="font-medium text-foreground underline underline-offset-4"
                      >
                        create an account
                      </Link>
                    </span>
                  </div>

                  <FormItem>
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      className="h-11 rounded-lg"
                      disabled={!emailEditable}
                      id="email"
                      name="email"
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      required
                      type="email"
                    />
                  </FormItem>

                  <Button
                    className="mt-4 h-11 rounded-full px-6"
                    disabled={!email || !emailEditable}
                    onClick={(e) => {
                      e.preventDefault()
                      setEmailEditable(false)
                    }}
                    variant="default"
                  >
                    Continue as guest
                  </Button>
                </>
              )}
            </div>
          </section>

          {/* Address ------------------------------------------------------ */}
          <section className="flex flex-col gap-5">
            <h2 className="font-display text-xl text-foreground">Address</h2>

            {billingAddress ? (
              <AddressItem
                actions={
                  <Button
                    variant={'outline'}
                    className="h-9 rounded-full"
                    disabled={Boolean(paymentData)}
                    onClick={(e) => {
                      e.preventDefault()
                      setBillingAddress(undefined)
                    }}
                  >
                    Remove
                  </Button>
                }
                address={billingAddress}
              />
            ) : user ? (
              <CheckoutAddresses heading="Billing address" setAddress={setBillingAddress} />
            ) : (
              <CreateAddressModal
                disabled={!email || Boolean(emailEditable)}
                callback={(address) => {
                  setBillingAddress(address)
                }}
                skipSubmission={true}
              />
            )}

            <div className="flex items-center gap-3">
              <Checkbox
                id="shippingTheSameAsBilling"
                checked={billingAddressSameAsShipping}
                disabled={Boolean(paymentData || (!user && (!email || Boolean(emailEditable))))}
                onCheckedChange={(state) => {
                  setBillingAddressSameAsShipping(state as boolean)
                }}
              />
              <Label htmlFor="shippingTheSameAsBilling" className="font-normal">
                Shipping is the same as billing
              </Label>
            </div>

            {!billingAddressSameAsShipping && (
              <>
                {shippingAddress ? (
                  <AddressItem
                    actions={
                      <Button
                        variant={'outline'}
                        className="h-9 rounded-full"
                        disabled={Boolean(paymentData)}
                        onClick={(e) => {
                          e.preventDefault()
                          setShippingAddress(undefined)
                        }}
                      >
                        Remove
                      </Button>
                    }
                    address={shippingAddress}
                  />
                ) : user ? (
                  <CheckoutAddresses
                    heading="Shipping address"
                    description="Please select a shipping address."
                    setAddress={setShippingAddress}
                  />
                ) : (
                  <CreateAddressModal
                    callback={(address) => {
                      setShippingAddress(address)
                    }}
                    disabled={!email || Boolean(emailEditable)}
                    skipSubmission={true}
                  />
                )}
              </>
            )}

            {!paymentData && (
              <Button
                className="h-12 self-start rounded-full px-8"
                disabled={!canGoToPayment}
                onClick={(e) => {
                  e.preventDefault()
                  void initiatePaymentIntent('stripe')
                }}
              >
                Go to payment
              </Button>
            )}

            {!paymentData?.['clientSecret'] && error && (
              <div>
                <Message error={error} />
                <Button
                  className="mt-4 rounded-full"
                  onClick={(e) => {
                    e.preventDefault()
                    router.refresh()
                  }}
                  variant="default"
                >
                  Try again
                </Button>
              </div>
            )}
          </section>

          <Suspense fallback={<React.Fragment />}>
            {/* @ts-ignore */}
            {paymentData && paymentData?.['clientSecret'] && (
              <section className="pb-8">
                <h2 className="mb-4 font-display text-xl text-foreground">Payment</h2>
                {error && <p className="mb-4 text-sm text-destructive">{`Error: ${error}`}</p>}
              <Elements
                options={{
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      borderRadius: '6px',
                      colorPrimary: '#858585',
                      gridColumnSpacing: '20px',
                      gridRowSpacing: '20px',
                      colorBackground: theme === 'dark' ? '#0a0a0a' : cssVariables.colors.base0,
                      colorDanger: cssVariables.colors.error500,
                      colorDangerText: cssVariables.colors.error500,
                      colorIcon:
                        theme === 'dark' ? cssVariables.colors.base0 : cssVariables.colors.base1000,
                      colorText: theme === 'dark' ? '#858585' : cssVariables.colors.base1000,
                      colorTextPlaceholder: '#858585',
                      fontFamily: 'Geist, sans-serif',
                      fontSizeBase: '16px',
                      fontWeightBold: '600',
                      fontWeightNormal: '500',
                      spacingUnit: '4px',
                    },
                  },
                  clientSecret: paymentData['clientSecret'] as string,
                }}
                stripe={stripe}
              >
                <div className="flex flex-col gap-8">
                  <CheckoutForm
                    customerEmail={email}
                    billingAddress={billingAddress}
                    setProcessingPayment={setProcessingPayment}
                  />
                  <Button
                    variant="ghost"
                    className="self-start"
                    onClick={() => setPaymentData(null)}
                  >
                    Cancel payment
                  </Button>
                </div>
              </Elements>
            </section>
          )}
        </Suspense>
      </div>

      {!cartIsEmpty && (
        <aside className="h-fit rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-xl text-foreground">Order summary</h2>
          <ul className="mt-5 space-y-4">
            {cart?.items?.map((item, index) => {
              if (typeof item.product === 'object' && item.product) {
                const {
                  product,
                  product: { meta, title, gallery },
                  quantity,
                  variant,
                } = item

                if (!quantity) return null

                let image = gallery?.[0]?.image || meta?.image
                let price = priceFor(product, currency.code)

                const isVariant = Boolean(variant) && typeof variant === 'object'

                if (isVariant) {
                  price = priceFor(variant, currency.code)

                  const imageVariant = product.gallery?.find((item: any) => {
                    if (!item.variantOption) return false
                    const variantOptionID =
                      typeof item.variantOption === 'object'
                        ? item.variantOption.id
                        : item.variantOption

                    const hasMatch = variant?.options?.some((option: any) => {
                      if (typeof option === 'object') return option.id === variantOptionID
                      else return option === variantOptionID
                    })

                    return hasMatch
                  })

                  if (imageVariant && typeof imageVariant.image !== 'string') {
                    image = imageVariant.image
                  }
                }

                return (
                  <li className="flex items-start gap-3" key={index}>
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary">
                      {image && typeof image !== 'string' && (
                        <Media
                          fill
                          imgClassName="object-cover"
                          // Nothing larger sits above the fold here, so the first
                          // thumbnail is the LCP element.
                          loading={index === 0 ? 'eager' : undefined}
                          priority={index === 0}
                          resource={image}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug text-foreground">{title}</p>
                      {variant && typeof variant === 'object' && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {variant.options
                            ?.map((option: any) => (typeof option === 'object' ? option.label : null))
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">Qty {quantity}</p>
                    </div>
                    {typeof price === 'number' && (
                      <Price
                        amount={price}
                        className="shrink-0 text-sm text-foreground tabular-nums"
                      />
                    )}
                  </li>
                )
              }
              return null
            })}
          </ul>
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">Total</span>
            <Price
              className="font-display text-2xl text-foreground tabular-nums"
              amount={cart.subtotal || 0}
            />
          </div>
        </aside>
      )}
      </div>
    </div>
  )
}
