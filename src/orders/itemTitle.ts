import type { Order } from '@/payload-types'

export const orderItemTitle = (item: NonNullable<Order['items']>[number]) => {
  const product = typeof item.product === 'object' ? item.product : null
  const variant = typeof item.variant === 'object' ? item.variant : null
  const title = product?.title || 'Ordered item'
  if (!variant?.title) return title
  return variant.title.startsWith(title) ? variant.title : `${title} · ${variant.title}`
}
