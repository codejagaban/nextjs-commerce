import type { Order } from '@/payload-types'
import { stateLabel } from '@/orders/states'
import { orderItemTitle } from '@/orders/itemTitle'

export function OrderTracking({ order }: { order: Order }) {
  return (
    <section aria-label="Order progress" className="space-y-4">
      <h2 className="font-display text-lg text-foreground">Order progress</h2>
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        {(
          [
            ['Order', order.orderStatus],
            ['Payment', order.paymentStatus],
            ['Delivery', order.fulfillmentStatus],
            ['Returns', order.returnStatus],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-medium">{stateLabel(value)}</dd>
          </div>
        ))}
      </dl>
      {order.orderStatus === 'cancelled' && order.paymentStatus === 'paid' && (
        <p className="text-sm">
          This order has been cancelled. A refund has not yet been recorded.
        </p>
      )}
      {!order.shipments?.length && order.orderStatus !== 'cancelled' && (
        <p className="text-sm text-muted-foreground">
          {order.fulfillmentStatus === 'fulfilled'
            ? 'This order was fulfilled before shipment tracking was available.'
            : 'Tracking details will appear here once your order is dispatched.'}
        </p>
      )}
      {order.shipments?.map((shipment, index) => (
        <article key={shipment.id} className="rounded-lg bg-background p-4 text-sm">
          <h3 className="font-medium">
            Shipment {index + 1}: {shipment.deliveredAt ? 'Delivered' : 'Shipped'}
          </h3>
          <p className="mt-1">
            {shipment.carrier}
            {shipment.trackingNumber && ` · ${shipment.trackingNumber}`}
          </p>
          <p className="mt-1 text-muted-foreground">
            Shipped{' '}
            <time dateTime={shipment.shippedAt}>
              {new Date(shipment.shippedAt).toLocaleDateString('en-GB', {
                timeZone: 'UTC',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </time>
            {shipment.deliveredAt && (
              <>
                {' '}
                · Delivered{' '}
                <time dateTime={shipment.deliveredAt}>
                  {new Date(shipment.deliveredAt).toLocaleDateString('en-GB', {
                    timeZone: 'UTC',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </time>
              </>
            )}
          </p>
          <ul className="my-3 space-y-1">
            {shipment.items.map((row) => {
              const item = order.items?.find((item) => item.id === row.orderItemID)
              return (
                <li key={row.id || row.orderItemID}>
                  {item ? orderItemTitle(item) : 'Ordered item'} × {row.quantity}
                </li>
              )
            })}
          </ul>
          {shipment.trackingURL && (
            <a
              className="font-medium underline underline-offset-4"
              href={shipment.trackingURL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Track shipment {index + 1}
            </a>
          )}
        </article>
      ))}
    </section>
  )
}
