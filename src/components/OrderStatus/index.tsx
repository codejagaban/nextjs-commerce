import { OrderStatus as StatusOptions } from '@/payload-types'
import { cn } from '@/utilities/cn'

type Props = {
  status: StatusOptions
  className?: string
}

export const OrderStatus: React.FC<Props> = ({ status, className }) => {
  return (
    <div
      className={cn(
        'w-fit rounded-full px-3 py-1 text-xs font-medium capitalize',
        {
          'bg-secondary text-secondary-foreground': status === 'processing',
          'bg-primary text-primary-foreground': status === 'completed',
        },
        className,
      )}
    >
      {status}
    </div>
  )
}
