import { OrderStatus } from '@/components/OrderStatus'
import { Price } from '@/components/Price'
import { Button } from '@/components/ui/button'
import { Order } from '@/payload-types'
import { formatDateTime } from '@/utilities/formatDateTime'
import Link from 'next/link'

type Props = {
  order: Order
}

export const OrderItem: React.FC<Props> = ({ order }) => {
  const itemsLabel = order.items?.length === 1 ? 'Item' : 'Items'

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border bg-background p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-display text-lg text-foreground">
            <time dateTime={order.createdAt}>
              {formatDateTime({ date: order.createdAt, format: 'MMMM dd, yyyy' })}
            </time>
          </p>
          {order.status && <OrderStatus status={order.status} />}
        </div>

        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="tabular-nums">Order #{order.id}</span>
          <span>•</span>
          <span>
            {order.items?.length} {itemsLabel}
          </span>
          {order.amount && (
            <>
              <span>•</span>
              <Price
                as="span"
                className="text-foreground"
                amount={order.amount}
                currencyCode={order.currency ?? undefined}
              />
            </>
          )}
        </p>
      </div>

      <Button variant="outline" asChild className="h-11 rounded-full px-6 self-start sm:self-auto">
        <Link href={`/orders/${order.id}`}>View order</Link>
      </Button>
    </div>
  )
}
