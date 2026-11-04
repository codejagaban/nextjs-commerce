'use client'

import { Button } from '@payloadcms/ui'
import { ArrowCounterClockwise, Receipt } from '@phosphor-icons/react'
import React, { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { Order, OrderRefund } from '@/payload-types'
import { refundBalance } from '@/orders/refunds'
import { returnableItems } from '@/orders/returns'
import { orderItemTitle } from '@/orders/itemTitle'
import { stateLabel } from '@/orders/states'

type Fields = {
  reason: string
  productAmount: string
  shippingAmount: string
  taxAmount: string
  quantities: Record<string, string>
  restock: Record<string, boolean>
}
type Editor = 'refund' | 'request' | string | null
const minor = (value: string) => Math.round(Number(value) * 100)

export function RefundReturns({
  order,
  disabled,
  onChange,
}: {
  order: Order
  disabled: boolean
  onChange: () => Promise<void>
}) {
  const [refunds, setRefunds] = useState<OrderRefund[]>([])
  const [loading, setLoading] = useState(true)
  const [historyReady, setHistoryReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editor, setEditor] = useState<Editor>(null)
  const [confirmation, setConfirmation] = useState<Fields | null>(null)
  const {
    register,
    reset,
    handleSubmit,
    setError: fieldError,
    formState: { errors },
  } = useForm<Fields>({ shouldUnregister: true })
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(
        `/api/order-refunds?where[order][equals]=${order.id}&depth=0&pagination=false&limit=0`,
        { credentials: 'include', signal },
      )
      if (!response.ok)
        throw new Error('Could not load refund history. Refresh before issuing a refund.')
      return (await response.json()).docs as OrderRefund[]
    },
    [order.id],
  )
  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
      .then((rows) => {
        setRefunds(rows)
        setHistoryReady(true)
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) {
          setError(e.message)
          setHistoryReady(false)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [load, order.workflowVersion])
  const money = (amount: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: order.currency ?? 'USD',
    }).format(amount / 100)
  const balance = refundBalance(order)
  const unresolved = refunds.some(
    (row) => !['succeeded', 'failed', 'canceled'].includes(row.status),
  )
  const locked = disabled || busy || loading
  const openEditor = (mode: Editor) => {
    reset({
      reason: '',
      productAmount: (balance.productAmount / 100).toFixed(2),
      shippingAmount: (balance.shippingAmount / 100).toFixed(2),
      taxAmount: (balance.taxAmount / 100).toFixed(2),
      quantities: {},
      restock: {},
    })
    setEditor(mode)
    setConfirmation(null)
    setError('')
    setMessage('')
  }
  const run = async (path: string, data = {}) => {
    if (locked) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/orders/${order.id}/${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'The operation could not be confirmed.')
      setEditor(null)
      setConfirmation(null)
      await onChange()
      setRefunds(await load())
      setMessage(
        result.refund
          ? `Refund ${stateLabel(result.refund.status).toLowerCase()}.`
          : 'Return updated. Payment was not changed.',
      )
    } catch (e) {
      setEditor(null)
      setConfirmation(null)
      setError(
        e instanceof Error
          ? e.message
          : 'Connection failed. Refresh and reconcile before trying again.',
      )
      try {
        await onChange()
        setRefunds(await load())
        setHistoryReady(true)
      } catch {
        setHistoryReady(false)
        /* Keep the original actionable error. */
      }
    } finally {
      setBusy(false)
    }
  }
  const submit = handleSubmit(async (values) => {
    if (editor === 'refund') {
      if (
        minor(values.productAmount) + minor(values.shippingAmount) + minor(values.taxAmount) <=
        0
      ) {
        fieldError('root', { message: 'Enter a refund amount greater than zero.' })
        return
      }
      setConfirmation(values)
      return
    }
    const available =
      editor === 'request'
        ? returnableItems(order)
        : (order.returns
            ?.find((row) => row.id === editor)
            ?.items.map((row) => ({
              ...row,
              id: row.orderItemID,
              remaining: row.quantity - row.received,
            })) ?? [])
    const items = available
      .map((row, index) => ({
        orderItemID: row.id,
        quantity: Number(values.quantities?.[index] ?? 0),
        restock: values.restock?.[index] === true,
      }))
      .filter((row) => row.quantity > 0)
    if (!items.length) {
      fieldError('root', { message: 'Choose at least one item.' })
      return
    }
    await run('returns', {
      requestID: crypto.randomUUID(),
      version: order.workflowVersion,
      action: editor === 'request' ? 'request' : 'receive',
      returnID: editor === 'request' ? undefined : editor,
      reason: values.reason,
      items,
    })
  })
  const rows =
    editor === 'request'
      ? returnableItems(order).map((row) => ({
          id: row.id!,
          label: orderItemTitle(row),
          remaining: row.remaining,
        }))
      : (order.returns?.find((row) => row.id === editor)?.items ?? []).map((row) => ({
          id: row.orderItemID,
          label: orderItemTitle(
            order.items?.find((item) => item.id === row.orderItemID) ?? { quantity: row.quantity },
          ),
          remaining: row.quantity - row.received,
        }))
  return (
    <section
      className="refund-returns"
      aria-label="Refunds and returns"
      aria-busy={busy || loading}
    >
      <h2>
        <ArrowCounterClockwise size={22} /> Refunds & returns
      </h2>
      <p className="order-workflow__muted">
        Refund money and receive goods as separate actions. Stock changes only when received goods
        are explicitly restocked.
      </p>
      {loading && <p role="status">Loading refund history…</p>}
      {error && (
        <p className="order-workflow__error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <div className="order-workflow__actions">
        <Button
          type="button"
          size="small"
          disabled={
            locked ||
            !historyReady ||
            unresolved ||
            !['paid', 'partially_refunded'].includes(order.paymentStatus)
          }
          onClick={() => openEditor('refund')}
        >
          Issue refund
        </Button>
        <Button
          type="button"
          size="small"
          buttonStyle="none"
          disabled={
            locked ||
            !returnableItems(order).some((row) => row.remaining > 0) ||
            order.orderStatus === 'cancelled'
          }
          onClick={() => openEditor('request')}
        >
          Create return
        </Button>
      </div>
      {unresolved && (
        <p className="order-workflow__notice">
          An unresolved refund reserves its amount. Reconcile it before issuing another.
        </p>
      )}
      {editor && (
        <fieldset disabled={locked} className="order-workflow__editor">
          <legend>
            {editor === 'refund'
              ? `Refund payment (${order.currency})`
              : editor === 'request'
                ? 'Request returned items'
                : 'Receive returned goods'}
          </legend>
          {editor === 'refund' ? (
            <div className="order-workflow__inputs">
              {(['productAmount', 'shippingAmount', 'taxAmount'] as const).map((name) => (
                <label key={name}>
                  {name === 'productAmount'
                    ? 'Products'
                    : name === 'shippingAmount'
                      ? 'Shipping'
                      : 'Tax'}{' '}
                  <small>Remaining {money(balance[name])}</small>
                  <input
                    aria-label={`Refund ${name}`}
                    inputMode="decimal"
                    disabled={Boolean(confirmation)}
                    aria-invalid={Boolean(errors[name])}
                    aria-describedby={`refund-${name}-error`}
                    {...register(name, {
                      validate: (v) =>
                        (/^\d+(\.\d{1,2})?$/.test(v) && minor(v) <= balance[name]) ||
                        'Enter a valid amount within the remaining balance.',
                    })}
                  />
                  <small className="order-workflow__error" id={`refund-${name}-error`}>
                    {errors[name]?.message}
                  </small>
                </label>
              ))}
            </div>
          ) : (
            rows.map(
              (row, index) =>
                row.remaining > 0 && (
                  <div className="refund-returns__line" key={row.id}>
                    <label className="order-workflow__quantity">
                      <span>
                        {row.label}
                        <small>{row.remaining} available</small>
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        aria-label={`Return quantity: ${row.label}`}
                        aria-invalid={Boolean(errors.quantities?.[index])}
                        aria-describedby={`return-${index}-error`}
                        {...register(`quantities.${index}`, {
                          validate: (v) =>
                            v === undefined ||
                            v === '' ||
                            (Number.isSafeInteger(Number(v)) &&
                              Number(v) >= 0 &&
                              Number(v) <= row.remaining) ||
                            `Enter a whole number from 0 to ${row.remaining}.`,
                        })}
                      />
                      <small id={`return-${index}-error`} className="order-workflow__error">
                        {errors.quantities?.[index]?.message}
                      </small>
                    </label>
                    {editor !== 'request' && (
                      <label className="order-workflow__check">
                        <input type="checkbox" {...register(`restock.${index}`)} />
                        Restock {row.label}
                      </label>
                    )}
                  </div>
                ),
            )
          )}
          {(editor === 'refund' || editor === 'request') && (
            <label className="refund-returns__reason">
              Reason
              <input
                aria-label="Refund or return reason"
                disabled={Boolean(confirmation)}
                aria-invalid={Boolean(errors.reason)}
                aria-describedby="refund-return-reason-error"
                {...register('reason', {
                  required: 'Enter a reason.',
                  maxLength: { value: 500, message: 'Use 500 characters or fewer.' },
                  validate: (v) => Boolean(v.trim()) || 'Enter a reason.',
                })}
              />
              <small id="refund-return-reason-error" className="order-workflow__error">
                {errors.reason?.message}
              </small>
            </label>
          )}
          {errors.root && (
            <p role="alert" className="order-workflow__error">
              {errors.root.message}
            </p>
          )}
          {confirmation ? (
            <div role="group" aria-label="Confirm refund">
              <p>
                Refund{' '}
                {money(
                  minor(confirmation.productAmount) +
                    minor(confirmation.shippingAmount) +
                    minor(confirmation.taxAmount),
                )}{' '}
                to the original payment method? This does not restock or cancel the order.
              </p>
              <div className="order-workflow__actions">
                <Button
                  type="button"
                  size="small"
                  buttonStyle="error"
                  disabled={locked}
                  onClick={() =>
                    void run('refunds', {
                      requestID: crypto.randomUUID(),
                      version: order.workflowVersion,
                      reason: confirmation.reason,
                      productAmount: minor(confirmation.productAmount),
                      shippingAmount: minor(confirmation.shippingAmount),
                      taxAmount: minor(confirmation.taxAmount),
                    })
                  }
                >
                  Confirm refund
                </Button>
                <Button
                  type="button"
                  size="small"
                  buttonStyle="none"
                  disabled={busy}
                  onClick={() => setConfirmation(null)}
                >
                  Review amounts
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" size="small" disabled={locked} onClick={() => void submit()}>
              {editor === 'refund'
                ? 'Review refund'
                : editor === 'request'
                  ? 'Save return request'
                  : 'Confirm received goods'}
            </Button>
          )}
          <Button
            type="button"
            size="small"
            buttonStyle="none"
            disabled={busy}
            onClick={() => {
              setEditor(null)
              setConfirmation(null)
            }}
          >
            Close editor
          </Button>
        </fieldset>
      )}
      {refunds.map((row) => (
        <div className="order-workflow__shipment" key={row.id}>
          <h3>
            <Receipt size={20} />
            {money(row.amount)} refund: {stateLabel(row.status)}
          </h3>
          <p>{row.reason}</p>
          <p className="order-workflow__muted">
            {new Date(row.createdAt).toLocaleString()}
            {row.providerRefundID && ` · ${row.providerRefundID}`}
          </p>
          {!['succeeded', 'failed', 'canceled'].includes(row.status) && (
            <Button
              type="button"
              size="small"
              buttonStyle="none"
              disabled={locked}
              onClick={() => void run(`refunds/${row.id}/reconcile`)}
            >
              Reconcile refund
            </Button>
          )}
        </div>
      ))}
      {order.returns?.map((row, index) => (
        <div className="order-workflow__shipment" key={row.id}>
          <h3>Return {index + 1}</h3>
          <p>{row.reason}</p>
          <ul>
            {row.items.map((line) => (
              <li key={line.orderItemID}>
                {orderItemTitle(
                  order.items?.find((item) => item.id === line.orderItemID) ?? {
                    quantity: line.quantity,
                  },
                )}
                : {line.received}/{line.quantity} received, {line.restocked} restocked
              </li>
            ))}
          </ul>
          {row.items.some((line) => line.received < line.quantity) && (
            <Button
              type="button"
              size="small"
              buttonStyle="none"
              disabled={locked}
              onClick={() => openEditor(row.id!)}
            >
              Receive return {index + 1}
            </Button>
          )}
        </div>
      ))}
    </section>
  )
}
