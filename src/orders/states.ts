/** Independent axes: money moving is not evidence that goods moved. */
export const orderStatuses = ['open', 'completed', 'cancelled'] as const
export const paymentStatuses = [
  'not_recorded',
  'pending',
  'paid',
  'partially_refunded',
  'refunded',
  'failed',
  'cancelled',
] as const
export const fulfillmentStatuses = [
  'unfulfilled',
  'preparing',
  'partially_fulfilled',
  'shipped',
  'delivered',
  'fulfilled',
] as const
export const returnStatuses = ['none', 'requested', 'partially_returned', 'returned'] as const

export const stateLabel = (value: string) =>
  value === 'not_recorded'
    ? 'Not recorded'
    : value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())

/** Legacy completed orders have no delivery evidence: do not invent a delivery. */
export const legacyOrderStates = (status?: string | null) =>
  ({
    orderStatus:
      status === 'cancelled' ? 'cancelled' : status === 'completed' ? 'completed' : 'open',
    fulfillmentStatus: status === 'completed' ? 'fulfilled' : 'unfulfilled',
    returnStatus: 'none',
  }) as {
    orderStatus: (typeof orderStatuses)[number]
    fulfillmentStatus: (typeof fulfillmentStatuses)[number]
    returnStatus: (typeof returnStatuses)[number]
  }

export const paymentStateFor = (
  transactions: { status?: string | null }[],
  amount = 0,
  refunds = 0,
): (typeof paymentStatuses)[number] => {
  if (transactions.some(({ status }) => status === 'succeeded')) {
    if (amount > 0 && refunds >= amount) return 'refunded'
    return refunds > 0 ? 'partially_refunded' : 'paid'
  }
  if (transactions.some(({ status }) => status === 'refunded')) return 'refunded'
  if (transactions.some(({ status }) => status === 'pending' || status === 'processing'))
    return 'pending'
  if (transactions.some(({ status }) => status === 'failed')) return 'failed'
  if (transactions.some(({ status }) => status === 'cancelled' || status === 'expired'))
    return 'cancelled'
  return 'not_recorded'
}
