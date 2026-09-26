import type { Order } from '@/payload-types'
import type { Metadata } from 'next'

import { Price } from '@/components/Price'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/utilities/formatDateTime'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CaretLeft } from '@phosphor-icons/react/dist/ssr'
import { ProductItem } from '@/components/ProductItem'
import { headers as getHeaders } from 'next/headers.js'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { OrderStatus } from '@/components/OrderStatus'
import { AddressItem } from '@/components/addresses/AddressItem'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ email?: string; accessToken?: string }>
}

export default async function Order({ params, searchParams }: PageProps) {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  const { id } = await params
  const { email = '', accessToken = '' } = await searchParams

  let order: Order | null = null

  try {
    const {
      docs: [orderResult],
    } = await payload.find({
      collection: 'orders',
      user,
      overrideAccess: !Boolean(user),
      depth: 2,
      where: {
        and: [
          {
            id: {
              equals: id,
            },
          },
          ...(user
            ? [
                {
                  customer: {
                    equals: user.id,
                  },
                },
              ]
            : [
                {
                  accessToken: {
                    equals: accessToken,
                  },
                },
                ...(email
                  ? [
                      {
                        customerEmail: {
                          equals: email,
                        },
                      },
                    ]
                  : []),
              ]),
        ],
      },
      select: {
        amount: true,
        currency: true,
        items: true,
        customerEmail: true,
        customer: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        shippingAddress: true,
      },
    })

    const canAccessAsGuest =
      !user &&
      email &&
      accessToken &&
      orderResult &&
      orderResult.customerEmail &&
      orderResult.customerEmail === email
    const canAccessAsUser =
      user &&
      orderResult &&
      orderResult.customer &&
      (typeof orderResult.customer === 'object'
        ? orderResult.customer.id
        : orderResult.customer) === user.id

    if (orderResult && (canAccessAsGuest || canAccessAsUser)) {
      order = orderResult
    }
  } catch (error) {
    console.error(error)
  }

  if (!order) {
    notFound()
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-3 flex items-center justify-between gap-4">
        {user ? (
          <Button asChild variant="ghost" className="-ml-3 rounded-full">
            <Link href="/orders">
              <CaretLeft />
              All orders
            </Link>
          </Button>
        ) : (
          <div />
        )}

        <p className="text-sm text-muted-foreground tabular-nums">Order #{order.id}</p>
      </div>

      <div className="flex flex-col gap-6 rounded-lg bg-card p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-[1fr_auto_auto] sm:gap-x-10">
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Order date
            </p>
            <p className="font-display text-lg text-foreground">
              <time dateTime={order.createdAt}>
                {formatDateTime({ date: order.createdAt, format: 'MMM d, yyyy' })}
              </time>
            </p>
          </div>

          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">Total</p>
            {order.amount && (
              <Price className="font-display text-lg text-foreground" amount={order.amount} />
            )}
          </div>

          {order.status && (
            <div>
              <p className="mb-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                Status
              </p>
              <OrderStatus status={order.status} />
            </div>
          )}
        </div>

        {order.items && (
          <section aria-label="Order items">
            <h2 className="mb-3 font-display text-lg text-foreground">Items</h2>
            <ul className="flex flex-col gap-4">
              {order.items?.map((item, index) => {
                if (typeof item.product === 'string') {
                  return null
                }

                if (!item.product || typeof item.product !== 'object') {
                  return <li key={index}>This item is no longer available.</li>
                }

                const variant =
                  item.variant && typeof item.variant === 'object' ? item.variant : undefined

                return (
                  <li key={item.id}>
                    <ProductItem
                      style="compact"
                      currencyCode={order.currency ?? undefined}
                      product={item.product}
                      quantity={item.quantity}
                      variant={variant}
                    />
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {order.shippingAddress && (
          <section aria-label="Shipping address">
            <h2 className="mb-2 font-display text-lg text-foreground">Shipping address</h2>

            {/* @ts-expect-error - some kind of type hell */}
            <AddressItem address={order.shippingAddress} hideActions appearance="plain" />
          </section>
        )}
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params

  return {
    description: `Order details for order ${id}.`,
    openGraph: mergeOpenGraph({
      title: `Order ${id}`,
      url: `/orders/${id}`,
    }),
    title: `Order ${id}`,
  }
}
