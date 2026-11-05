import { createHash } from 'node:crypto'
import { initTransaction, commitTransaction, killTransaction, type PayloadHandler } from 'payload'
import { isAdmin } from '@/access/isAdmin'
import { WorkflowError } from './fulfillment'
import { parseRefundCommand, validateRefund } from './refunds'
import { executeRefund } from '@/payments/refunds'

export const orderRefundHandler: PayloadHandler = async (req) => {
  if (!(await isAdmin({ req })))
    return Response.json({ message: 'Administrator access is required.' }, { status: 403 })
  const id = Number(req.routeParams?.id)
  if (!Number.isSafeInteger(id) || id <= 0)
    return Response.json({ message: 'Invalid order.' }, { status: 400 })
  let owns = false
  try {
    const command = parseRefundCommand(req.data ?? (await req.json?.()))
    const hash = createHash('sha256').update(JSON.stringify(command)).digest('hex')
    owns = await initTransaction(req)
    if (!owns) throw new Error('Refund reservation needs a transaction.')
    const existing = await req.payload.find({
      collection: 'order-refunds',
      depth: 0,
      req,
      limit: 1,
      where: { requestID: { equals: command.requestID } },
    })
    let operation = existing.docs[0]
    if (operation) {
      if (operation.order !== id || operation.requestHash !== hash)
        throw new WorkflowError('Request ID already used for a different refund.', 409)
    } else {
      const claim = await req.payload.db.updateOne({
        collection: 'orders',
        req,
        options: { atomic: true },
        where: { and: [{ id: { equals: id } }, { workflowVersion: { equals: command.version } }] },
        data: { workflowVersion: { $inc: 1 } },
      })
      if (!claim) throw new WorkflowError('This order changed. Refresh before trying again.', 409)
      const order = await req.payload.findByID({ collection: 'orders', id, req, depth: 0 })
      const refunds = await req.payload.find({
        collection: 'order-refunds',
        req,
        depth: 0,
        pagination: false,
        limit: 0,
        where: { order: { equals: id } },
      })
      const amount = validateRefund(order, command, refunds.docs)
      const transactions = await req.payload.find({
        collection: 'transactions',
        req,
        depth: 0,
        limit: 2,
        where: { and: [{ order: { equals: id } }, { status: { equals: 'succeeded' } }] },
      })
      if (
        transactions.docs.length !== 1 ||
        !transactions.docs[0].stripe?.paymentIntentID ||
        transactions.docs[0].amount !== order.amount ||
        transactions.docs[0].currency !== order.currency
      )
        throw new WorkflowError(
          'A single matching Stripe payment is required. Reconcile this order manually.',
          409,
        )
      const transaction = transactions.docs[0]
      operation = await req.payload.create({
        collection: 'order-refunds',
        req,
        data: {
          order: id,
          transaction: transaction.id,
          actor: req.user!.id,
          ...command,
          requestHash: hash,
          amount,
          currency: order.currency!,
          paymentIntentID: transaction.stripe!.paymentIntentID!,
          status: 'submitting',
        },
      })
      await req.payload.update({
        collection: 'orders',
        id,
        req,
        context: { orderWorkflow: true },
        data: {
          workflowEvents: [
            ...(order.workflowEvents ?? []),
            {
              action: 'refund_requested',
              actor: req.user!.id,
              occurredAt: new Date().toISOString(),
              requestID: command.requestID,
              requestHash: hash,
            },
          ],
        },
      })
    }
    await commitTransaction(req)
    owns = false
    const refund = await executeRefund(req.payload, operation)
    return Response.json({ refund })
  } catch (error) {
    if (owns) await killTransaction(req)
    if (error instanceof WorkflowError)
      return Response.json({ message: error.message }, { status: error.status })
    req.payload.logger.error({ err: error, msg: 'Refund operation needs reconciliation.' })
    return Response.json(
      {
        message:
          'Refund outcome is not confirmed. Refresh and reconcile the existing request; do not create another refund.',
      },
      { status: 502 },
    )
  }
}

export const reconcileRefundHandler: PayloadHandler = async (req) => {
  if (!(await isAdmin({ req })))
    return Response.json({ message: 'Administrator access is required.' }, { status: 403 })
  const id = Number(req.routeParams?.id),
    refundID = Number(req.routeParams?.refundID)
  if (![id, refundID].every((n) => Number.isSafeInteger(n) && n > 0))
    return Response.json({ message: 'Invalid refund.' }, { status: 400 })
  try {
    const refund = await req.payload.findByID({
      collection: 'order-refunds',
      id: refundID,
      depth: 0,
    })
    if (refund.order !== id) return Response.json({ message: 'Refund not found.' }, { status: 404 })
    return Response.json({ refund: await executeRefund(req.payload, refund) })
  } catch (error) {
    req.payload.logger.error({ err: error, msg: 'Refund reconciliation failed.' })
    return Response.json(
      {
        message:
          error instanceof WorkflowError
            ? error.message
            : 'Refund remains unresolved. Check Stripe before retrying.',
      },
      { status: error instanceof WorkflowError ? error.status : 502 },
    )
  }
}
