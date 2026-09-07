'use client'
import type { Media, Product } from '@/payload-types'

import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import AutoScroll from 'embla-carousel-auto-scroll'
import Link from 'next/link'
import React from 'react'
import { GridTileImage } from '@/components/Grid/tile'

import { useCurrency } from '@payloadcms/plugin-ecommerce/client/react'
import { priceFor } from '@/currencies'

// Not async: it awaits nothing, and a hook cannot live in an async component.
export const CarouselClient: React.FC<{ products: Product[] }> = ({ products }) => {
  const { currency } = useCurrency()

  if (!products?.length) return null

  // Purposefully duplicating products to make the carousel loop and not run out of products on wide screens.
  const carouselProducts = [...products, ...products, ...products]

  return (
    <Carousel
      className="w-full"
      opts={{ align: 'start', loop: true }}
      plugins={[
        AutoScroll({
          playOnInit: true,
          speed: 1,
          stopOnInteraction: false,
          stopOnMouseEnter: true,
        }),
      ]}
    >
      <CarouselContent>
        {carouselProducts.map((product, i) => (
          <CarouselItem
            className="relative aspect-square h-[30vh] max-h-[275px] w-2/3 max-w-[475px] flex-none md:w-1/3"
            key={`${product.slug}${i}`}
          >
            <Link className="relative h-full w-full" href={`/products/${product.slug}`}>
              <GridTileImage
                label={{
                  amount: priceFor(product, currency.code)!,
                  title: product.title,
                }}
                media={product.meta?.image as Media}
              />
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  )
}
