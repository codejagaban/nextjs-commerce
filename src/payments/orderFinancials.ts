type FinancialOrderData = Record<string, unknown> & {
  amount?: number
  discountTotal?: number
  productRefundTotal?: number
  shippingRefundTotal?: number
  shippingTotal?: number
  subtotal?: number
  taxRefundTotal?: number
  taxTotal?: number
}

const minorAmount = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : fallback

/**
 * Add a durable financial snapshot to provider-validated order data.
 *
 * Today's checkout charges the cart subtotal only. Future discount, shipping,
 * and tax calculators can pass their own components; this function verifies
 * that they reconcile to the provider's charged amount before the order exists.
 */
export const withOrderFinancialSnapshot = (
  orderData: Record<string, unknown>,
): FinancialOrderData => {
  const amount = minorAmount(orderData.amount)
  const hasBreakdown = ['subtotal', 'discountTotal', 'shippingTotal', 'taxTotal'].some(
    (field) => typeof orderData[field] === 'number',
  )
  const subtotal = minorAmount(orderData.subtotal, amount)
  const discountTotal = minorAmount(orderData.discountTotal)
  const shippingTotal = minorAmount(orderData.shippingTotal)
  const taxTotal = minorAmount(orderData.taxTotal)
  const calculatedTotal = subtotal - discountTotal + shippingTotal + taxTotal

  if (hasBreakdown && calculatedTotal !== amount) {
    throw new Error('Order financial breakdown does not match the charged amount.')
  }

  return {
    ...orderData,
    amount,
    subtotal,
    discountTotal,
    shippingTotal,
    taxTotal,
    productRefundTotal: minorAmount(orderData.productRefundTotal),
    shippingRefundTotal: minorAmount(orderData.shippingRefundTotal),
    taxRefundTotal: minorAmount(orderData.taxRefundTotal),
  }
}
