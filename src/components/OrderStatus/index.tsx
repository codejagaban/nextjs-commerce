import { stateLabel } from '@/orders/states'
import { cn } from '@/utilities/cn'

type Props = {
  status: string
  className?: string
}

export const OrderStatus: React.FC<Props> = ({ status, className }) => {
  return (
    <div
      className={cn(
        'w-fit rounded-full px-3 py-1 text-xs font-medium capitalize',
        {
          'bg-secondary text-secondary-foreground': status === 'processing',
          'bg-primary text-primary-foreground': ['completed', 'delivered', 'fulfilled'].includes(
            status,
          ),
        },
        className,
      )}
    >
      {stateLabel(status)}
    </div>
  )
}
