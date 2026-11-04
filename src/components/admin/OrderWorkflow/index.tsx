'use client'

import { Button, useDocumentInfo, useForm as usePayloadForm, useFormModified } from '@payloadcms/ui'
import { Package, Truck } from '@phosphor-icons/react'
import React, { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { Order, ShipmentNotification } from '@/payload-types'
import { remainingItems, safeTrackingURL, type WorkflowCommand } from '@/orders/fulfillment'
import { stateLabel } from '@/orders/states'
import { orderItemTitle as productName } from '@/orders/itemTitle'
import './index.scss'

type Fields = {
  carrier: string
  trackingNumber: string
  trackingURL: string
  notifyCustomer: boolean
  quantities: Record<string, string>
}
type Editor = { mode: 'ship' | 'tracking'; shipmentID?: string }
const actionLabel: Record<string, string> = {
  prepare: 'Preparation started',
  ship: 'Shipment dispatched',
  tracking: 'Tracking updated',
  deliver: 'Shipment marked delivered',
  complete: 'Order completed',
  cancel: 'Order cancelled',
}
const date = (value: string) =>
  new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function OrderWorkflow() {
  const { id } = useDocumentInfo()
  return id ? (
    <SavedOrderWorkflow id={id} key={id} />
  ) : (
    <p>Save this order before managing fulfillment.</p>
  )
}

function SavedOrderWorkflow({ id }: { id: number | string }) {
  const { setData } = useDocumentInfo()
  const payloadForm = usePayloadForm()
  const modified = useFormModified()
  const [order, setOrder] = useState<Order | null>(null)
  const [notifications, setNotifications] = useState<ShipmentNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const {
    register,
    reset,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<Fields>({
    defaultValues: {
      carrier: '',
      trackingNumber: '',
      trackingURL: '',
      notifyCustomer: true,
      quantities: {},
    },
  })

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const [response, emailResponse] = await Promise.all([
        fetch(`/api/orders/${id}?depth=1`, { credentials: 'include', signal }),
        fetch(
          `/api/shipment-notifications?where[order][equals]=${id}&limit=100&sort=-createdAt&depth=0`,
          { credentials: 'include', signal },
        ),
      ])
      if (!response.ok || !emailResponse.ok)
        throw new Error('Could not load fulfillment details. Try refreshing.')
      return {
        order: (await response.json()) as Order,
        notifications: (await emailResponse.json()).docs as ShipmentNotification[],
      }
    },
    [id],
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
      .then((fresh) => {
        setOrder(fresh.order)
        setNotifications(fresh.notifications)
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [load])

  const refresh = async () => {
    const fresh = await load()
    setOrder(fresh.order)
    setNotifications(fresh.notifications)
    setData(fresh.order)
    await payloadForm.reset(fresh.order)
    payloadForm.setModified(false)
  }
  const run = async (action: WorkflowCommand['action'], extras: Record<string, unknown> = {}) => {
    if (!order || busy || modified) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/orders/${id}/workflow`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          version: order.workflowVersion,
          requestID: crypto.randomUUID(),
          ...extras,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not update this order.')
      setEditor(null)
      setConfirmCancel(false)
      await refresh()
      setMessage(
        result.notificationStatus === 'failed'
          ? 'Shipment saved. The email failed; retry it below.'
          : result.notificationStatus === 'sending'
            ? 'Shipment saved. Check the email provider before retrying its notification.'
            : 'Order updated.',
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed. Refresh before trying again.')
    } finally {
      setBusy(false)
    }
  }
  const openEditor = (next: Editor) => {
    const shipment = order?.shipments?.find((row) => row.id === next.shipmentID)
    reset({
      carrier: shipment?.carrier ?? '',
      trackingNumber: shipment?.trackingNumber ?? '',
      trackingURL: shipment?.trackingURL ?? '',
      notifyCustomer: true,
      quantities: Object.fromEntries(
        remainingItems(order!).map((item, index) => [
          String(index),
          String(Math.max(0, item.remaining)),
        ]),
      ),
    })
    setEditor(next)
    setError('')
    setMessage('')
  }
  const submitShipment = handleSubmit(async (values) => {
    if (!order || !editor) return
    const items = remainingItems(order)
      .map((item, index) => ({
        orderItemID: item.id,
        quantity: Number(values.quantities[index] ?? 0),
      }))
      .filter((row) => row.quantity > 0)
    if (editor.mode === 'ship' && !items.length) {
      setFieldError('root', { message: 'Choose at least one item to ship.' })
      return
    }
    await run(editor.mode, {
      ...values,
      quantities: undefined,
      items,
      shipmentID: editor.shipmentID,
    })
  })
  const retry = async (notificationID: number) => {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/orders/${id}/notifications/${notificationID}/retry`, {
        method: 'POST',
        credentials: 'include',
      })
      const result = await response.json()
      if (!response.ok || result.status === 'failed')
        throw new Error(
          result.message ||
            'Email could not be sent. Check the email configuration before retrying.',
        )
      const fresh = await load()
      setOrder(fresh.order)
      setNotifications(fresh.notifications)
      setMessage('Notification updated.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Email retry failed.')
    } finally {
      setBusy(false)
    }
  }
  const disabled = loading || busy || modified
  const paid = order && ['paid', 'partially_refunded'].includes(order.paymentStatus)
  const open = order?.orderStatus === 'open'
  return (
    <section className="order-workflow" aria-label="Order workflow" aria-busy={loading || busy}>
      <header className="order-workflow__header">
        <h2>
          <Package size={22} /> Fulfillment & tracking
        </h2>
        <Button
          buttonStyle="none"
          size="small"
          type="button"
          disabled={disabled}
          onClick={() => {
            setError('')
            setBusy(true)
            void refresh()
              .catch((e: Error) => setError(e.message))
              .finally(() => setBusy(false))
          }}
        >
          Refresh
        </Button>
      </header>
      {loading && <p role="status">Loading fulfillment details…</p>}
      {error && (
        <p className="order-workflow__error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {modified && (
        <p className="order-workflow__notice">
          Save your other order changes before using fulfillment actions.
        </p>
      )}
      {order && (
        <>
          <dl className="order-workflow__states">
            {(
              [
                ['Order', order.orderStatus],
                ['Payment', order.paymentStatus],
                ['Fulfillment', order.fulfillmentStatus],
                ['Returns', order.returnStatus],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{stateLabel(value)}</dd>
              </div>
            ))}
          </dl>
          <div className="order-workflow__actions">
            {open && paid && order.fulfillmentStatus === 'unfulfilled' && (
              <Button
                size="small"
                type="button"
                disabled={disabled}
                onClick={() => void run('prepare')}
              >
                Start preparing
              </Button>
            )}
            {open &&
              paid &&
              ['unfulfilled', 'preparing', 'partially_fulfilled'].includes(
                order.fulfillmentStatus,
              ) && (
                <Button
                  size="small"
                  type="button"
                  disabled={disabled}
                  onClick={() => openEditor({ mode: 'ship' })}
                >
                  Create shipment
                </Button>
              )}
            {open && ['delivered', 'fulfilled'].includes(order.fulfillmentStatus) && (
              <Button
                size="small"
                type="button"
                disabled={disabled}
                onClick={() => void run('complete')}
              >
                Complete order
              </Button>
            )}
            {open && ['unfulfilled', 'preparing'].includes(order.fulfillmentStatus) && (
              <Button
                buttonStyle="none"
                size="small"
                type="button"
                disabled={disabled}
                onClick={() => setConfirmCancel(true)}
              >
                Cancel order
              </Button>
            )}
          </div>
          {open && !paid && (
            <p className="order-workflow__notice">
              Recorded payment is required before shipping. Demo orders with no payment record
              cannot be dispatched.
            </p>
          )}
          {order.orderStatus === 'cancelled' && order.paymentStatus === 'paid' && (
            <p className="order-workflow__notice">
              Cancelled; payment is still paid. Cancelling does not issue a refund.
            </p>
          )}
          {confirmCancel && (
            <div className="order-workflow__editor" role="group" aria-label="Confirm cancellation">
              <p>
                Cancel this unshipped order and restore its paid inventory? This does not refund the
                customer.
              </p>
              <div className="order-workflow__actions">
                <Button
                  type="button"
                  size="small"
                  buttonStyle="error"
                  disabled={disabled}
                  onClick={() => void run('cancel')}
                >
                  Confirm cancellation
                </Button>
                <Button
                  type="button"
                  size="small"
                  buttonStyle="none"
                  disabled={busy}
                  onClick={() => setConfirmCancel(false)}
                >
                  Keep order
                </Button>
              </div>
            </div>
          )}
          {editor && (
            <fieldset className="order-workflow__editor" disabled={disabled}>
              <legend>{editor.mode === 'ship' ? 'New shipment' : 'Edit tracking'}</legend>
              {editor.mode === 'ship' && (
                <div className="order-workflow__items">
                  {remainingItems(order).map(
                    (item, index) =>
                      item.remaining > 0 && (
                        <label key={item.id} className="order-workflow__quantity">
                          <span>
                            {productName(item)}
                            <small>{item.remaining} remaining</small>
                          </span>
                          <input
                            aria-describedby={`workflow-quantity-${index}-error`}
                            aria-label={`Ship quantity: ${productName(item)}`}
                            type="number"
                            inputMode="numeric"
                            {...register(`quantities.${index}`, {
                              validate: (v) =>
                                (Number.isSafeInteger(Number(v)) &&
                                  Number(v) >= 0 &&
                                  Number(v) <= item.remaining) ||
                                `Enter a whole number from 0 to ${item.remaining}.`,
                            })}
                            aria-invalid={Boolean(errors.quantities?.[index])}
                          />
                          <span
                            className="order-workflow__error"
                            id={`workflow-quantity-${index}-error`}
                          >
                            {errors.quantities?.[index]?.message}
                          </span>
                        </label>
                      ),
                  )}
                </div>
              )}
              <div className="order-workflow__inputs">
                <label>
                  Carrier
                  <input
                    aria-label="Carrier"
                    aria-describedby="workflow-carrier-error"
                    {...register('carrier', {
                      required: 'Enter a carrier.',
                      maxLength: { value: 100, message: 'Use 100 characters or fewer.' },
                      validate: (v) => Boolean(v.trim()) || 'Enter a carrier.',
                    })}
                    aria-invalid={Boolean(errors.carrier)}
                  />
                  <small className="order-workflow__error" id="workflow-carrier-error">
                    {errors.carrier?.message}
                  </small>
                </label>
                <label>
                  Tracking number <span>(optional)</span>
                  <input
                    aria-label="Tracking number"
                    aria-describedby="workflow-tracking-number-error"
                    {...register('trackingNumber', {
                      maxLength: { value: 150, message: 'Use 150 characters or fewer.' },
                    })}
                    aria-invalid={Boolean(errors.trackingNumber)}
                  />
                  <small className="order-workflow__error" id="workflow-tracking-number-error">
                    {errors.trackingNumber?.message}
                  </small>
                </label>
                <label className="order-workflow__wide">
                  Tracking link <span>(optional, HTTPS)</span>
                  <input
                    aria-label="Tracking link"
                    aria-describedby="workflow-tracking-url-error"
                    {...register('trackingURL', {
                      maxLength: { value: 2048, message: 'Use 2048 characters or fewer.' },
                      validate: (v) => {
                        try {
                          safeTrackingURL(v.trim())
                          return true
                        } catch {
                          return 'Enter a valid HTTPS tracking link.'
                        }
                      },
                    })}
                    aria-invalid={Boolean(errors.trackingURL)}
                  />
                  <small className="order-workflow__error" id="workflow-tracking-url-error">
                    {errors.trackingURL?.message}
                  </small>
                </label>
              </div>
              <label className="order-workflow__check">
                <input type="checkbox" {...register('notifyCustomer')} />
                Email the customer about this update
              </label>
              {errors.root && (
                <p className="order-workflow__error" role="alert">
                  {errors.root.message}
                </p>
              )}
              <div className="order-workflow__actions">
                <Button
                  type="button"
                  size="small"
                  disabled={disabled}
                  onClick={() => void submitShipment()}
                >
                  {busy
                    ? 'Saving…'
                    : editor.mode === 'ship'
                      ? 'Dispatch shipment'
                      : 'Save tracking'}
                </Button>
                <Button
                  type="button"
                  buttonStyle="none"
                  size="small"
                  disabled={busy}
                  onClick={() => setEditor(null)}
                >
                  Close
                </Button>
              </div>
            </fieldset>
          )}
          {!order.shipments?.length && (
            <p className="order-workflow__empty">
              {order.fulfillmentStatus === 'fulfilled'
                ? 'Fulfilled before shipment tracking was introduced. No delivery date was recorded.'
                : 'No shipments yet. Record the items and tracking details when they leave the store.'}
            </p>
          )}
          {order.shipments?.map((shipment, index) => (
            <article className="order-workflow__shipment" key={shipment.id}>
              <header>
                <h3>
                  <Truck size={20} /> Shipment {index + 1}
                </h3>
                <span>{shipment.deliveredAt ? 'Delivered' : 'Shipped'}</span>
              </header>
              <p>
                {shipment.carrier}
                {shipment.trackingNumber && <> · {shipment.trackingNumber}</>}
                {shipment.trackingURL && (
                  <>
                    {' '}
                    ·{' '}
                    <a href={shipment.trackingURL} target="_blank" rel="noopener noreferrer">
                      Track shipment
                    </a>
                  </>
                )}
              </p>
              <p className="order-workflow__muted">
                Shipped {date(shipment.shippedAt)}
                {shipment.deliveredAt && <> · Delivered {date(shipment.deliveredAt)}</>}
              </p>
              <ul>
                {shipment.items.map((row) => {
                  const item = order.items?.find((item) => item.id === row.orderItemID)
                  return (
                    <li key={row.id || row.orderItemID}>
                      {item ? productName(item) : 'Ordered item'} <strong>× {row.quantity}</strong>
                    </li>
                  )
                })}
              </ul>
              <div className="order-workflow__actions">
                <Button
                  type="button"
                  buttonStyle="none"
                  size="small"
                  disabled={disabled}
                  onClick={() => openEditor({ mode: 'tracking', shipmentID: shipment.id! })}
                >
                  Edit tracking
                </Button>
                {!shipment.deliveredAt && (
                  <Button
                    type="button"
                    buttonStyle="none"
                    size="small"
                    disabled={disabled}
                    onClick={() => void run('deliver', { shipmentID: shipment.id })}
                  >
                    Mark delivered
                  </Button>
                )}
              </div>
              {notifications
                .filter((entry) => entry.shipmentID === shipment.id)
                .map((entry) => (
                  <div className="order-workflow__notification" key={entry.id}>
                    <span>
                      {stateLabel(entry.kind)} email:{' '}
                      {entry.status === 'skipped'
                        ? 'not requested'
                        : entry.status === 'sending'
                          ? 'sending or awaiting confirmation'
                          : entry.status}
                      {entry.sentAt && ` · ${date(entry.sentAt)}`}
                    </span>
                    {['failed', 'pending'].includes(entry.status) && (
                      <Button
                        type="button"
                        size="small"
                        buttonStyle="none"
                        disabled={disabled}
                        onClick={() => void retry(entry.id)}
                      >
                        Retry email
                      </Button>
                    )}
                  </div>
                ))}
            </article>
          ))}
          {!!order.workflowEvents?.length && (
            <details className="order-workflow__history">
              <summary>Activity ({order.workflowEvents.length})</summary>
              <ol>
                {[...order.workflowEvents].reverse().map((event) => (
                  <li key={event.id}>
                    <strong>{actionLabel[event.action] || stateLabel(event.action)}</strong>
                    <span>
                      {date(event.occurredAt)} ·{' '}
                      {event.actor && typeof event.actor === 'object'
                        ? event.actor.name || event.actor.email
                        : `Staff #${event.actor}`}
                    </span>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </>
      )}
    </section>
  )
}
