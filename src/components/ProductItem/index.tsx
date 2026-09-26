import { Media } from '@/components/Media'
import { Price } from '@/components/Price'
import { Product, Variant } from '@/payload-types'
import { DEFAULT_CURRENCY_CODE, priceFor } from '@/currencies'
import Link from 'next/link'

type Props = {
  product: Product
  style?: 'compact' | 'default'
  variant?: Variant
  quantity?: number
  /**
   * Force all formatting to a particular currency.
   */
  currencyCode?: string
}

export const ProductItem: React.FC<Props> = ({
  product,
  style = 'default',
  quantity,
  variant,
  currencyCode,
}) => {
  const { title } = product

  const metaImage =
    product.meta?.image && typeof product.meta?.image !== 'string' ? product.meta.image : undefined

  const firstGalleryImage =
    typeof product.gallery?.[0]?.image !== 'string' ? product.gallery?.[0]?.image : undefined

  let image = firstGalleryImage || metaImage

  const isVariant = Boolean(variant) && typeof variant === 'object'

  if (isVariant) {
    const imageVariant = product.gallery?.find((item) => {
      if (!item.variantOption) return false
      const variantOptionID =
        typeof item.variantOption === 'object' ? item.variantOption.id : item.variantOption

      const hasMatch = variant?.options?.some((option) => {
        if (typeof option === 'object') return option.id === variantOptionID
        else return option === variantOptionID
      })

      return hasMatch
    })

    if (imageVariant && typeof imageVariant.image !== 'string') {
      image = imageVariant.image
    }
  }

  // An order is read in the currency it was paid in, not today's store currency.
  const code = currencyCode || DEFAULT_CURRENCY_CODE
  const itemPrice = priceFor(variant, code) ?? priceFor(product, code)
  const itemURL = `/products/${product.slug}${variant ? `?variant=${variant.id}` : ''}`

  return (
    <div className={style === 'compact' ? 'flex items-center gap-3' : 'flex items-center gap-4'}>
      <div
        className={
          style === 'compact'
            ? 'h-12 w-12 shrink-0 overflow-hidden rounded'
            : 'flex items-stretch justify-stretch h-20 w-20 p-2 rounded-lg border'
        }
      >
        <div className="relative w-full h-full">
          {image && typeof image !== 'string' && (
            <Media
              fill
              imgClassName={style === 'compact' ? 'object-cover' : 'rounded-lg object-cover'}
              resource={image}
            />
          )}
        </div>
      </div>
      <div className="flex min-w-0 grow justify-between items-center gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p
            className={
              style === 'compact' ? 'text-sm font-medium break-words' : 'font-medium text-lg'
            }
          >
            <Link href={itemURL}>{title}</Link>
          </p>
          {variant && (
            <p className="text-sm font-mono text-primary/50 tracking-widest">
              {variant.options
                ?.map((option) => {
                  if (typeof option === 'object') return option.label
                  return null
                })
                .join(', ')}
            </p>
          )}
          <div className={style === 'compact' ? 'text-sm text-muted-foreground' : undefined}>
            {'x'}
            {quantity}
          </div>
        </div>

        {itemPrice && quantity && (
          <div className="shrink-0 text-right">
            {style !== 'compact' && <p className="font-medium text-lg">Subtotal</p>}
            {style === 'compact' && <span className="sr-only">Subtotal</span>}
            <Price
              className={
                style === 'compact'
                  ? 'text-sm text-foreground tabular-nums'
                  : 'font-mono text-primary/50 text-sm'
              }
              amount={itemPrice * quantity}
              currencyCode={currencyCode}
            />
          </div>
        )}
      </div>
    </div>
  )
}
