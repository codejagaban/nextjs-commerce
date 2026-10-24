import type { Field } from 'payload'
import {
  fulfillmentStatuses,
  orderStatuses,
  paymentStatuses,
  returnStatuses,
  stateLabel,
} from './states'

const stateField = (
  name: string,
  label: string,
  values: readonly string[],
  defaultValue: string,
): Field => ({
  name,
  label,
  type: 'select',
  defaultValue,
  required: true,
  index: true,
  options: values.map((value) => ({ label: stateLabel(value), value })),
  access: { create: () => false, update: () => false },
  admin: { position: 'sidebar', readOnly: true },
})

export const orderStateFields: Field[] = [
  stateField('orderStatus', 'Order', orderStatuses, 'open'),
  stateField('paymentStatus', 'Payment', paymentStatuses, 'not_recorded'),
  stateField('fulfillmentStatus', 'Fulfillment', fulfillmentStatuses, 'unfulfilled'),
  stateField('returnStatus', 'Returns', returnStatuses, 'none'),
  {
    name: 'workflowVersion',
    type: 'number',
    defaultValue: 0,
    required: true,
    access: { create: () => false, update: () => false },
    admin: { hidden: true },
  },
]
