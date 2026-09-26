'use client'

import { Price } from '@/components/Price'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useCart, useCurrency } from '@payloadcms/plugin-ecommerce/client/react'

import { priceFor } from '@/currencies'
import { ShoppingCart } from '@phosphor-icons/react/dist/ssr'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { DeleteItemButton } from './DeleteItemButton'
import { EditItemQuantityButton } from './EditItemQuantityButton'
import { OpenCartButton } from './OpenCart'
import { Product } from '@/payload-types'

export function CartModal() {
  const { cart } = useCart()
  const { currency } = useCurrency()
  const [isOpen, setIsOpen] = useState(false)

  const pathname = usePathname()

  const [previousPathname, setPreviousPathname] = useState(pathname)
  if (previousPathname !== pathname) {
    setPreviousPathname(pathname)
    setIsOpen(false)
  }

  const totalQuantity = useMemo(() => {
    if (!cart || !cart.items || !cart.items.length) return undefined
    return cart.items.reduce((quantity, item) => (item.quantity || 0) + quantity, 0)
  }, [cart])

  // When an item is added, slide the cart open and bump the icon.
  // Ignore the initial hydration (0 -> N) by only arming after the cart settles.
  const prevQtyRef = useRef<number>(0)
  const readyRef = useRef(false)
  const [bump, setBump] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      prevQtyRef.current = totalQuantity ?? 0
      readyRef.current = true
    }, 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!readyRef.current) return
    const prev = prevQtyRef.current
    const curr = totalQuantity ?? 0
    prevQtyRef.current = curr
    if (curr > prev) {
      setIsOpen(true)
      setBump(true)
      const t = setTimeout(() => setBump(false), 550)
      return () => clearTimeout(t)
    }
  }, [totalQuantity])

  return (
    <Sheet onOpenChange={setIsOpen} open={isOpen}>
      <SheetTrigger asChild>
        <OpenCartButton quantity={totalQuantity} bump={bump} />
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col sm:max-w-lg md:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl text-foreground">Your cart</SheetTitle>

          <SheetDescription className="text-muted-foreground">
            Add items to see your total and check out.
          </SheetDescription>
        </SheetHeader>

        {!cart || cart?.items?.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center text-muted-foreground">
            <ShoppingCart className="h-14 w-14" weight="thin" />
            <p className="font-display text-xl text-foreground">Your cart is empty.</p>
          </div>
        ) : (
          <div className="grow flex px-4">
            <div className="flex flex-col justify-between w-full">
              <ul className="grow overflow-auto py-4">
                {cart?.items?.map((item, i) => {
                  const product = item.product
                  const variant = item.variant

                  if (typeof product !== 'object' || !item || !product || !product.slug)
                    return <React.Fragment key={i} />

                  const metaImage =
                    product.meta?.image && typeof product.meta?.image === 'object'
                      ? product.meta.image
                      : undefined

                  const firstGalleryImage =
                    typeof product.gallery?.[0]?.image === 'object'
                      ? product.gallery?.[0]?.image
                      : undefined

                  let image = firstGalleryImage || metaImage
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

                    if (imageVariant && typeof imageVariant.image === 'object') {
                      image = imageVariant.image
                    }
                  }

                  return (
                    <li className="flex w-full flex-col" key={i}>
                      <div className="relative flex w-full flex-row justify-between px-1 py-4">
                        <div className="absolute z-40 -mt-2 ml-[55px]">
                          <DeleteItemButton item={item} />
                        </div>
                        <Link
                          className="z-30 flex flex-row space-x-4"
                          href={`/products/${(item.product as Product)?.slug}`}
                        >
                          <div className="relative h-16 w-16 cursor-pointer overflow-hidden rounded-lg border border-border bg-secondary">
                            {image?.url && (
                              <Image
                                alt={image?.alt || product?.title || ''}
                                className="h-full w-full object-cover"
                                height={94}
                                src={image.url}
                                width={94}
                              />
                            )}
                          </div>

                          <div className="flex flex-1 flex-col text-base">
                            <span className="leading-tight">{product?.title}</span>
                            {isVariant && variant ? (
                              <p className="text-sm capitalize text-muted-foreground">
                                {variant.options
                                  ?.map((option: any) => {
                                    if (typeof option === 'object') return option.label
                                    return null
                                  })
                                  .join(', ')}
                              </p>
                            ) : null}
                          </div>
                        </Link>
                        <div className="flex h-16 flex-col justify-between">
                          {typeof price === 'number' && (
                            <Price
                              amount={price}
                              className="flex justify-end space-y-2 text-right text-sm"
                            />
                          )}
                          <div className="ml-auto flex h-9 flex-row items-center rounded-lg border">
                            <EditItemQuantityButton item={item} type="minus" />
                            <p className="w-6 text-center">
                              <span className="w-full text-sm">{item.quantity}</span>
                            </p>
                            <EditItemQuantityButton item={item} type="plus" />
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="border-t border-border px-4 pt-5">
                <div className="pb-4 text-sm text-muted-foreground">
                  {typeof cart?.subtotal === 'number' && (
                    <div className="mb-4 flex items-center justify-between">
                      <p>Subtotal</p>
                      <Price
                        amount={cart?.subtotal}
                        className="text-right text-lg text-foreground tabular-nums"
                      />
                    </div>
                  )}

                  <Link
                    href="/checkout"
                    className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
                  >
                    Proceed to checkout
                  </Link>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Shipping &amp; taxes calculated at checkout
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
