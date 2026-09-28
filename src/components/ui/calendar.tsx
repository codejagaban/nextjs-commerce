'use client'

import { CaretDown, CaretLeft, CaretRight } from '@phosphor-icons/react'
import * as React from 'react'
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { cn } from '@/utilities/cn'

function Calendar({
  captionLayout = 'label',
  className,
  classNames,
  components,
  formatters,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      captionLayout={captionLayout}
      className={cn('calendar', className)}
      classNames={{
        root: cn('calendar__root', defaultClassNames.root),
        months: cn('calendar__months', defaultClassNames.months),
        month: cn('calendar__month', defaultClassNames.month),
        nav: cn('calendar__nav', defaultClassNames.nav),
        button_previous: cn('calendar__nav-button', defaultClassNames.button_previous),
        button_next: cn('calendar__nav-button', defaultClassNames.button_next),
        month_caption: cn('calendar__caption', defaultClassNames.month_caption),
        dropdowns: cn('calendar__dropdowns', defaultClassNames.dropdowns),
        dropdown_root: cn('calendar__dropdown-root', defaultClassNames.dropdown_root),
        dropdown: cn('calendar__dropdown', defaultClassNames.dropdown),
        caption_label: cn('calendar__caption-label', defaultClassNames.caption_label),
        month_grid: cn('calendar__grid', defaultClassNames.month_grid),
        weekdays: cn('calendar__weekdays', defaultClassNames.weekdays),
        weekday: cn('calendar__weekday', defaultClassNames.weekday),
        week: cn('calendar__week', defaultClassNames.week),
        day: cn('calendar__day', defaultClassNames.day),
        range_start: cn('calendar__range-start', defaultClassNames.range_start),
        range_middle: cn('calendar__range-middle', defaultClassNames.range_middle),
        range_end: cn('calendar__range-end', defaultClassNames.range_end),
        today: cn('calendar__today', defaultClassNames.today),
        outside: cn('calendar__outside', defaultClassNames.outside),
        disabled: cn('calendar__disabled', defaultClassNames.disabled),
        hidden: cn('calendar__hidden', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className: iconClassName, orientation, ...iconProps }) => {
          if (orientation === 'left') {
            return <CaretLeft className={iconClassName} {...iconProps} />
          }
          if (orientation === 'right') {
            return <CaretRight className={iconClassName} {...iconProps} />
          }
          return <CaretDown className={iconClassName} {...iconProps} />
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString('default', { month: 'short' }),
        ...formatters,
      }}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      className={cn('calendar__day-button', className)}
      data-day={day.date.toLocaleDateString()}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      data-range-start={modifiers.range_start}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      ref={ref}
      size="icon"
      variant="ghost"
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
